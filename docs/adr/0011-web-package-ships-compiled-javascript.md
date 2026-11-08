---
status: accepted
date: 2026-11-06
deciders: Ruben Luthman
tags: [web, packaging, react, build]
---

# Web Package Ships Compiled JavaScript

## Context and Problem Statement

`@judarn/ui` published its React `.jsx` sources and declared `src/index.js` as `main`, `module`, and the `exports` default. No consumer toolchain resolves that file without transpiling a dependency: `import('@judarn/ui')` threw in Node, in server-side rendering, and in Jest, and the SDUI serializer needed a `try { require('../Button/Button.jsx') }` fallback that silently produced plain tags when it failed. The package test suite then passed against those fallback tags, so a broken component could not fail it.

Should the package keep shipping sources for the consumer's bundler to compile, or ship compiled JavaScript?

## Decision Drivers

- `import` and `require` of the package must work in Node, SSR, Jest, and every bundler with no transform rules for `node_modules`.
- The tests must exercise the code consumers receive.
- The package stays small and keeps `react` as its only peer.
- Tokens, CSS, and declarations stay generated or hand-written in one place ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)).

## Considered Options

- **Option 1: Compile with esbuild to ESM and CommonJS in `dist/`.**
- **Option 2: Keep shipping `.jsx` and document the transform requirement.**
- **Option 3: Rewrite the components without JSX and ship them as-is.**
- **Option 4: Compile with `tsc` or Rollup.**

## Decision Outcome

Chosen option: **Option 1**, because it removes the consumer-side transform, needs one development dependency, and lets the tests render the built output.

### Invariants & Negative Constraints

1. **Compiled entry points:** `main`, `module`, `types`, and every `exports` target for JavaScript point into `dist/`. No `exports` target is a `.jsx` file. `platforms/web/scripts/build.js` is the only build step and `scripts/verify-consumption.js` fails when a target is missing or uncompiled.
2. **Dual format:** `dist/` holds an ESM (`.mjs`) and a CommonJS (`.cjs`) build of the root and `sdui` entry points. The package does not set `"type": "module"`, because the generated `src/tailwind.js` and the verification scripts are CommonJS.
3. **React stays external:** the build marks every package as external and uses the automatic JSX runtime. `react` is the only peer dependency; `react-dom` is a development dependency used by the tests.
4. **Tests run on the build:** `verify-unit.js`, `verify-visual.js`, and `verify-sdui.js` render `dist/` with `react-dom/server`. No test may substitute plain tags for a component that fails to load.
5. **Tarball contents:** the tarball carries `dist/`, `styles/`, `src/tailwind.js`, `src/tailwind.d.ts`, `README.md`, and the monorepo `LICENSE` (copied by the build). It never carries `.jsx` sources, `*.card.html` previews, `scripts/`, or `examples/`.
6. **Hand-written declarations:** `.d.ts` files stay beside their sources and are copied to `dist/`. The build does not generate them, so a prop added to a component needs its declaration edited in the same commit.

### Positive Consequences

- The package loads in Node, SSR, and Jest without configuration.
- The SDUI serializer imports the components directly, so a hydrated tree always uses the real components.
- Tests fail when a component breaks.

### Negative Consequences

- **Compiled output for consumers who aliased the sources.** A consumer who previously aliased `@judarn/ui` to the sources for a custom JSX transform now receives compiled output. Verified worst case: such a consumer loses source-level debugging unless they use the repository checkout. Set aside: shipping sources for consumers who want to compile them.
- **A build dependency.** The package needs `npm ci` before its tests and its tarball, adding an `esbuild` download (one platform binary) to every fresh checkout and CI job. Set aside: a zero-dependency package.
- **Two module formats** double the compiled output (about 50 kB unpacked in total). Set aside: an ESM-only package.
- **Declarations are hand-maintained** and can drift from the components. Set aside: generating declarations with `tsc`, which would require converting the sources to TypeScript.

## Pros and Cons of the Options

### Option 1: Compile with esbuild to ESM and CommonJS in `dist/`

- Good, because every consumer can import the package unchanged, and one fast build step covers both formats.
- Bad, because it adds a build dependency and a `dist/` artifact.

### Option 2: Keep shipping `.jsx` and document the transform requirement

- Good, because no build step exists.
- Bad, because Node, SSR, and Jest fail until the consumer configures a transform for `node_modules`, and the tests cannot import the sources without the same transform. This was the original state.

### Option 3: Rewrite the components without JSX and ship them as-is

- Good, because no build step exists and the files load in Node.
- Bad, because every component becomes `createElement` calls, which hurts readability, and the files still need a CommonJS or ESM decision per consumer.

### Option 4: Compile with `tsc` or Rollup

- Good, because `tsc` can emit declarations.
- Bad, because it requires TypeScript sources or a heavier toolchain for the same output.
