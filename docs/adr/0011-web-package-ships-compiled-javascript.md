# Web package ships compiled JavaScript
Status: Active · 2026-11-06

## Decision

`@judarn/ui` ships compiled JavaScript, built by esbuild into `dist/` as ESM (`.mjs`) and CommonJS (`.cjs`) for the root and `sdui` entry points.

- `main`, `module`, `types`, and every `exports` target point into `dist/`. No target is a `.jsx` file. `scripts/verify-consumption.js` fails when one is missing or uncompiled.
- `platforms/web/scripts/build.js` is the only build step. React stays external with the automatic JSX runtime and is the only peer dependency. The package does not set `"type": "module"`.
- `verify-unit.js`, `verify-visual.js`, and `verify-sdui.js` render `dist/`. No test may substitute plain tags for a component that fails to load.
- The tarball holds `dist/`, `styles/`, `src/tailwind.js`, `src/tailwind.d.ts`, `README.md`, and `LICENSE`. It never holds `.jsx` sources, `*.card.html` previews, `scripts/`, or `examples/`.
- `.d.ts` files are hand-written beside their sources and copied to `dist/`, so a prop added to a component needs its declaration edited in the same commit.

## Why

The package used to ship `.jsx` sources, which no consumer toolchain could import without transpiling a dependency: `import('@judarn/ui')` threw in Node, in server rendering, and in Jest. The serializer hid that behind a fallback that produced plain tags, so the tests passed while components were broken. Compiled output loads everywhere and lets tests exercise what consumers receive.

## What we gave up

- **Source-level debugging** for consumers who aliased the sources.
- **A zero-dependency package.** `npm ci` downloads esbuild before tests and packing.
- **A smaller tarball.** Two module formats add about 50 kB unpacked.
- **Generated declarations.** Hand-written `.d.ts` files can drift from the components.

## Revisit if

The components move to TypeScript (declarations could then be generated), or consumers need ESM only.
