/**
 * Build instructions (TS + WASM glue):
 * 1. Refresh the WASM crate via `npm run build:wasm` (wasm-pack outputs into `pkg/`).
 * 2. Generate the npm-ready JS entry points with `npm run build:lib` (tsup emits `dist/lib`).
 * 3. Bundle the demo/bench pages via `npm run build:web` (Vite emits `dist/web`).
 */
import * as wasmModule from "../pkg/det_math_wasm.js";
import type { Vec3 } from "../pkg/det_math_wasm.js";

type WasmModule = typeof import("../pkg/det_math_wasm.js");
type MaybeInitFn = (
  input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module,
) => Promise<unknown>;

const detMathWasm = wasmModule as WasmModule & { default?: MaybeInitFn };

let initPromise: Promise<void> | null = null;

export async function initMath(): Promise<void> {
  if (!initPromise) {
    const maybeInit = detMathWasm.default;
    initPromise = maybeInit ? Promise.resolve(maybeInit()).then(() => undefined) : Promise.resolve();
  }
  await initPromise;
}

export { Vec3, Quat, dm_sin, dm_cos, dm_atan2, dm_sqrt } from "../pkg/det_math_wasm.js";

export function makeNormalizedVec3(x: number, y: number, z: number): Vec3 {
  return detMathWasm.make_normalized_vec3(x, y, z);
}



