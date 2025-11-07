# @lagless/deterministic-math

Deterministic trigonometric helpers, 3D vectors, and quaternions implemented in Rust, compiled to WebAssembly, and exposed through a clean TypeScript API. The crate relies on the pure-Rust `libm` backend to deliver bit-for-bit identical results across browsers and devices.

## Features

- ✅ Deterministic wrappers for `sin`, `cos`, `atan2`, and `sqrt`
- ✅ 3D math primitives (`Vec3`, `Quat`, plus helpers for normalization and rotations)
- ✅ Ships as both ESM (`.mjs`) and CommonJS (`.cjs`) with generated typings
- ✅ Includes the pre-built WASM artifacts (`dist/pkg/*`) so consumers only need to import and call `initMath()`
- ✅ Benchmark and determinism demo pages to compare WASM vs native math across environments

## Installation

```bash
npm install @lagless/deterministic-math
# or
yarn add @lagless/deterministic-math
```

## Quick start

```ts
import {
  initMath,
  Vec3,
  Quat,
  dm_sin,
  dm_cos,
  dm_atan2,
  dm_sqrt,
  makeNormalizedVec3,
} from "@lagless/deterministic-math";

async function demo() {
  await initMath(); // must be awaited once before calling into the WASM exports

  const axis = makeNormalizedVec3(0.0, 1.0, 0.0);
  const quat = Quat.from_axis_angle(axis, Math.PI * 0.5);
  const vector = new Vec3(1, 0, 0);
  const rotated = quat.rotate_vec3(vector);

  console.log("Rotated:", rotated.x(), rotated.y(), rotated.z());
  console.log("Deterministic sin:", dm_sin(1.2345));
}

demo();
```

### Loading the raw WASM bindings

If you need direct access to the generated wasm-bindgen module, it is re-exported via the `wasm` subpath:

```ts
import initWasmModule from "@lagless/deterministic-math/wasm";

await initWasmModule();
```

The subpath points at the same files the TypeScript wrapper consumes (`dist/pkg/*`).

## Building from source

```bash
git clone https://github.com/your-org/deterministic-math.git
cd deterministic-math
npm install

# Build the publishable artifacts (Rust WASM + tsup bundle)
npm run build:package

# Optionally build the demo/benchmark pages (outputs to dist/web)
npm run build:web

# Full build (type-check + package + demo)
npm run build
```

- `npm run build:wasm` runs `wasm-pack build --target web --release --out-dir pkg`.
- `npm run build:lib` bundles `src/index.ts` into `dist/lib/index.{mjs,cjs}` and emits `dist/lib/index.d.ts`.
- `npm run copy:pkg` mirrors the freshly built `pkg/` folder into `dist/pkg/` so the npm package stays self-contained.
- `npm run build:package` chains all of the above.
- `npm run release` (optional helper) runs `npm run build:package`, bumps the patch version, and publishes with `npm publish --access public`.

## Benchmark & determinism demos

1. Run `npm run build` (or at least `npm run build:package && npm run build:web`).
2. Serve the repository root or `public/` (for example `npx serve public`).
3. Open:
   - `public/benchmark.html` to compare native `Math.*` vs WASM (`dist/web/benchmark.js`).
   - `public/determinism-test.html` to run the long-form determinism test with configurable seeds/iterations. The UI now reports hashes for both WASM and native math plus the largest observed difference so you can spot divergence instantly.

## Repository layout

```
pkg/          # wasm-pack output (det_math_wasm.js + .wasm + .d.ts)
src/          # TypeScript glue, benchmarks, and determinism harness
dist/lib/     # npm entry points (index.cjs, index.mjs, index.d.ts)
dist/pkg/     # copied wasm artifacts shipped with the npm package
dist/web/     # Vite bundle for the benchmark/test demo pages
public/       # Static HTML shells for the demos
```

## License

MIT © Lagless
