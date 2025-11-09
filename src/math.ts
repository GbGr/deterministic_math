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
const WASM_RELATIVE_PATH = "../pkg/det_math_wasm_bg.wasm";
const NODE_FS_PROMISES = "node:fs/promises" as string;
const NODE_URL = "node:url" as string;
const NODE_PATH = "node:path" as string;

let initPromise: Promise<void> | null = null;

export async function initMath(): Promise<void> {
  if (!initPromise) {
    const maybeInit = detMathWasm.default;
    initPromise = maybeInit
      ? loadWasmModule(maybeInit).then(() => undefined)
      : Promise.resolve();
  }
  await initPromise;
}

export { Vec3, Quat, dm_sin, dm_cos, dm_atan2, dm_sqrt } from "../pkg/det_math_wasm.js";

export function makeNormalizedVec3(x: number, y: number, z: number): Vec3 {
  return detMathWasm.make_normalized_vec3(x, y, z);
}

async function loadWasmModule(maybeInit: MaybeInitFn): Promise<void> {
  const initInput = await getWasmInitInput();
  await maybeInit(initInput);
}

async function getWasmInitInput(): Promise<BufferSource | undefined> {
  if (!isNodeLikeRuntime()) {
    return undefined;
  }

  const [{ readFile }, { fileURLToPath }, { resolve: resolvePath }] = await Promise.all([
    import(NODE_FS_PROMISES) as Promise<NodeFsPromisesModule>,
    import(NODE_URL) as Promise<NodeUrlModule>,
    import(NODE_PATH) as Promise<NodePathModule>,
  ]);

  const wasmPath = resolveWasmPath(fileURLToPath, resolvePath);
  return readFile(wasmPath);
}

function isNodeLikeRuntime(): boolean {
  const maybeProcess = getMaybeNodeProcess();
  return typeof window === "undefined" && typeof maybeProcess?.versions?.node === "string";
}

function resolveWasmPath(
  fileURLToPath: NodeUrlModule["fileURLToPath"],
  pathResolve: NodePathModule["resolve"],
): string {
  const maybeImportMeta = getImportMetaUrl();
  if (maybeImportMeta) {
    const wasmUrl = new URL(WASM_RELATIVE_PATH, maybeImportMeta);
    return fileURLToPath(wasmUrl);
  }

  const maybeDirname = getNodeDirname();
  if (maybeDirname) {
    return pathResolve(maybeDirname, "..", "pkg", "det_math_wasm_bg.wasm");
  }

  throw new Error("Unable to locate the deterministic-math WASM asset in this environment.");
}

type NodeFsPromisesModule = {
  readFile(path: string | URL): Promise<BufferSource>;
};

type NodeUrlModule = {
  fileURLToPath(url: URL | string): string;
};

type NodePathModule = {
  resolve(...segments: string[]): string;
};

type MaybeNodeProcess = {
  versions?: {
    node?: string;
  };
};

function getMaybeNodeProcess(): MaybeNodeProcess | undefined {
  return (globalThis as { process?: MaybeNodeProcess }).process;
}

declare const __dirname: string | undefined;

function getNodeDirname(): string | undefined {
  try {
    return typeof __dirname === "string" ? __dirname : undefined;
  } catch {
    return undefined;
  }
}

function getImportMetaUrl(): string | undefined {
  try {
    return typeof import.meta !== "undefined" && typeof import.meta.url === "string"
      ? import.meta.url
      : undefined;
  } catch {
    return undefined;
  }
}
