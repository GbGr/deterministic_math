/**
 * Benchmark instructions:
 * 1. Run `npm run build:package` to refresh the WASM + TS bridge (see `src/math.ts`).
 * 2. Bundle this page via `npm run build:web` so `dist/web/benchmark.js` exists.
 * 3. Serve the `public` directory (for example `npx serve public`) and open `public/benchmark.html`.
 */
import { initMath, dm_sin, dm_cos, dm_atan2, dm_sqrt } from "./math";

const ITERATIONS = 100_000;

interface BenchData {
  angles: Float64Array;
  yValues: Float64Array;
  xValues: Float64Array;
  sqrtValues: Float64Array;
}

interface BenchmarkResult {
  label: string;
  elapsedMs: number;
  sum: number;
}

let benchDataPromise: Promise<BenchData> | null = null;

function ensureBenchmarkData(): Promise<BenchData> {
  if (!benchDataPromise) {
    benchDataPromise = (async () => {
      await initMath();
      return generateTestData(ITERATIONS);
    })();
  }
  return benchDataPromise;
}

function createXorShift32(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x9e3779b9;
  }
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function generateTestData(iterations: number): BenchData {
  const rand = createXorShift32(0xdecafbad);
  const angles = new Float64Array(iterations);
  const yValues = new Float64Array(iterations);
  const xValues = new Float64Array(iterations);
  const sqrtValues = new Float64Array(iterations);
  for (let i = 0; i < iterations; i += 1) {
    angles[i] = (rand() * 2 - 1) * Math.PI * 4;
    yValues[i] = (rand() * 2 - 1) * 512;
    xValues[i] = (rand() * 2 - 1) * 512;
    sqrtValues[i] = rand() * 1_000_000 + 1e-6;
  }
  return { angles, yValues, xValues, sqrtValues };
}

function runNativeBenchmark(data: BenchData): BenchmarkResult {
  const { angles, yValues, xValues, sqrtValues } = data;
  const start = performance.now();
  let accumulator = 0;
  for (let i = 0; i < angles.length; i += 1) {
    const angle = angles[i];
    accumulator += Math.sin(angle) * 0.5;
    accumulator -= Math.cos(angle) * 0.25;
    accumulator += Math.atan2(yValues[i], xValues[i]) * 0.75;
    accumulator += Math.sqrt(sqrtValues[i]) * 0.1;
  }
  const elapsedMs = performance.now() - start;
  return { label: "Native Math", elapsedMs, sum: accumulator };
}

function runWasmBenchmark(data: BenchData): BenchmarkResult {
  const { angles, yValues, xValues, sqrtValues } = data;
  const start = performance.now();
  let accumulator = 0;
  for (let i = 0; i < angles.length; i += 1) {
    const angle = angles[i];
    accumulator += dm_sin(angle) * 0.5;
    accumulator -= dm_cos(angle) * 0.25;
    accumulator += dm_atan2(yValues[i], xValues[i]) * 0.75;
    accumulator += dm_sqrt(sqrtValues[i]) * 0.1;
  }
  const elapsedMs = performance.now() - start;
  return { label: "WASM Math", elapsedMs, sum: accumulator };
}

function logResult(result: BenchmarkResult): void {
  const message = `${result.label}: ${result.elapsedMs.toFixed(2)} ms | checksum ${result.sum.toFixed(6)}`;
  console.log(`[benchmark] ${message}`);
  updateOutput(message);
}

function updateOutput(message: string): void {
  const output = document.getElementById("benchmark-output");
  if (output) {
    const timestamp = new Date().toISOString();
    output.textContent = `${timestamp} - ${message}\n` + output.textContent;
  }
}

function wireBenchmarkButtons(): void {
  const nativeButton = document.getElementById("run-native");
  const wasmButton = document.getElementById("run-wasm");
  [
    { button: nativeButton, runner: runNativeBenchmark },
    { button: wasmButton, runner: runWasmBenchmark },
  ].forEach(({ button, runner }) => {
    if (!button) {
      return;
    }
    button.addEventListener("click", async () => {
      updateOutput("Preparing benchmark data (this happens once)...");
      const data = await ensureBenchmarkData();
      const result = runner(data);
      logResult(result);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireBenchmarkButtons();
  updateOutput("Ready. Click a button to run a benchmark.");
});
