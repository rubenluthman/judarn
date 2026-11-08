#!/usr/bin/env node
/**
 * Compiles the JSX sources to plain JavaScript in dist/ (ADR-0011).
 * Emits ESM (.mjs) and CommonJS (.cjs) for the root and sdui entry points, copies the .d.ts
 * files next to them, and stages the monorepo LICENSE so the tarball carries it.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const webRoot = path.resolve(__dirname, '..');
const srcDir = path.join(webRoot, 'src');
const distDir = path.join(webRoot, 'dist');

(async () => {
fs.rmSync(distDir, { recursive: true, force: true });

const entryPoints = { index: path.join(srcDir, 'index.js'), 'sdui/index': path.join(srcDir, 'sdui/index.js') };
const shared = {
  entryPoints,
  outdir: distDir,
  bundle: true,
  packages: 'external',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  target: 'es2020',
  sourcemap: false,
  logLevel: 'warning',
};

esbuild.buildSync({ ...shared, format: 'esm', outExtension: { '.js': '.mjs' } });
esbuild.buildSync({ ...shared, format: 'cjs', outExtension: { '.js': '.cjs' } });

// Browser global for the *.card.html previews: React comes from the page's UMD script.
const reactGlobal = {
  name: 'react-global',
  setup(build) {
    build.onResolve({ filter: /^react(\/jsx-runtime)?$/ }, (args) => ({ path: args.path, namespace: 'react-global' }));
    build.onLoad({ filter: /.*/, namespace: 'react-global' }, (args) => ({
      loader: 'js',
      contents: args.path === 'react'
        ? 'module.exports = window.React;'
        : `const R = window.React;
exports.Fragment = R.Fragment;
exports.jsx = exports.jsxs = (type, { children, ...props }, key) => {
  if (key !== undefined) props.key = key;
  return Array.isArray(children) ? R.createElement(type, props, ...children) : R.createElement(type, props, children);
};`,
    }));
  },
};
await esbuild.build({
  entryPoints: [path.join(srcDir, 'index.js')],
  outfile: path.join(distDir, '_ds_bundle.js'),
  bundle: true,
  format: 'iife',
  globalName: 'JudarnDesignSystem',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  target: 'es2020',
  plugins: [reactGlobal],
  logLevel: 'warning',
});

// Declarations mirror the source layout; tailwind.d.ts stays in src with tailwind.js.
const copyDts = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, entry.name);
    if (entry.isDirectory()) copyDts(from);
    else if (entry.name.endsWith('.d.ts') && entry.name !== 'tailwind.d.ts') {
      const to = path.join(distDir, path.relative(srcDir, from));
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
};
copyDts(srcDir);
fs.writeFileSync(
  path.join(distDir, 'sdui/index.d.ts'),
  "export * from './serializer';\n"
);
fs.copyFileSync(path.join(webRoot, 'src/sdui/schema.json'), path.join(distDir, 'sdui/schema.json'));

const license = path.resolve(webRoot, '../../LICENSE');
if (fs.existsSync(license)) fs.copyFileSync(license, path.join(webRoot, 'LICENSE'));

console.log('✓ Built @judarn/ui to dist/ (ESM + CJS, declarations, schema, LICENSE).');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
