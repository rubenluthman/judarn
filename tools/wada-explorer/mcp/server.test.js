#!/usr/bin/env node
// Stdio tests for the Wada MCP server: protocol behaviour, argument validation, light export polarity.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

/** Sends raw lines, closes stdin, and returns every parsed reply line. */
function exchange(lines) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'server.js')]);
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', () => resolve(out.split('\n').filter(Boolean).map((l) => JSON.parse(l))));
    child.stdin.end(lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n');
  });
}
const call = (id, name, args) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

test('ping answers with an empty result', async () => {
  const [r] = await exchange([{ jsonrpc: '2.0', id: 1, method: 'ping' }]);
  assert.deepEqual(r, { jsonrpc: '2.0', id: 1, result: {} });
});

test('messages without an id never get a reply', async () => {
  const replies = await exchange([
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', method: 'ping' },
    { jsonrpc: '2.0', method: 'no/such/method' },
    call(undefined, 'get_color', { identifier: '1' })
  ]);
  assert.equal(replies.length, 0);
});

test('parse errors reply with -32700 and a null id', async () => {
  const [r] = await exchange(['{not json']);
  assert.equal(r.error.code, -32700);
  assert.equal(r.id, null);
});

test('unknown methods reply with -32601', async () => {
  const [r] = await exchange([{ jsonrpc: '2.0', id: 4, method: 'no/such/method' }]);
  assert.equal(r.error.code, -32601);
});

test('tool failures are results with isError', async () => {
  const replies = await exchange([
    call(1, 'get_color', { identifier: '12abc' }),
    call(2, 'random_combination', { size: 9 }),
    call(3, 'get_combination', { id: 999 }),
    call(4, 'export_tokens', { id: 1, format: 'xml' }),
    call(5, 'search_combinations', { size: 7 })
  ]);
  assert.equal(replies.length, 5);
  for (const r of replies) {
    assert.equal(r.error, undefined);
    assert.equal(r.result.isError, true);
  }
});

test('valid calls still succeed', async () => {
  const replies = await exchange([call(1, 'get_color', { identifier: '12' }), call(2, 'random_combination', { size: 3 })]);
  assert.equal(replies[0].result.isError, undefined);
  assert.equal(JSON.parse(replies[1].result.content[0].text).size, 3);
});

test('export_tokens follows the light polarity', async () => {
  const [r] = await exchange([call(1, 'export_tokens', { id: 264 })]);
  const roles = JSON.parse(r.result.content[0].text).roles;
  assert.equal(roles.substrate.light.$value.hex, '#ffffff');
  assert.equal(roles.surfaceElevated.light.$value.hex, '#f8f8f8');
  assert.ok(roles.surfaceRecessed.light.$value.components[0] < roles.surfaceElevated.light.$value.components[0]);
  const dark = (k) => roles[k].dark.$value.components[0];
  for (const k of ['surfaceRecessed', 'substrate', 'surfaceElevated']) {
    assert.equal(roles[k].dark.$value.components[1], 0, `${k} is neutral in dark mode`);
  }
  assert.ok(dark('surfaceRecessed') < dark('substrate') && dark('substrate') < dark('surfaceElevated'));
});

test('curly apostrophes match the straight ones in color names', async () => {
  const replies = await exchange([
    call(1, 'search_colors', { query: 'King’s' }),
    call(2, 'get_color', { identifier: 'Hay’s Russet' }),
    call(3, 'search_combinations', { colorName: 'Poel‘s' })
  ]);
  const [found, color, combos] = replies.map((r) => JSON.parse(r.result.content[0].text));
  assert.deepEqual(found.map((c) => c.name), ["Pale King's Blue"]);
  assert.equal(color.name, "Hay's Russet");
  assert.ok(combos.length > 0);
  for (const p of combos) assert.ok(p.colors.some((c) => c.name === "Vandar Poel's Blue"));
});

test('the explorer page inlines the same search normalizer', () => {
  const fs = require('node:fs');
  const { normalizeSearchText } = require('../search-text.js');
  const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(page.includes(normalizeSearchText.toString()));
  assert.equal(normalizeSearchText('  Pale King’S '), "pale king's");
});
