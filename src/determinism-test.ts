/**
 * Determinism test instructions:
 * 1. Run `npm run build:package` (if needed) so the local WASM + TS bundle is up to date.
 * 2. Execute `npm run build:web` to generate `dist/web/determinism-test.js` via Vite.
 * 3. Serve the repo root or `public/` and open `public/determinism-test.html` on any device to compare hashes.
 * 4. Adjust the seed and iteration inputs in the UI to control how much deterministic work is performed.
 */
import {
  initMath,
  dm_sin,
  dm_cos,
  dm_atan2,
  dm_sqrt,
  Vec3,
  Quat,
  makeNormalizedVec3,
} from "./math";

type XorShift = () => number;

type DiffKind = "sin" | "cos" | "atan2" | "sqrt";

interface DiffSample {
  kind: DiffKind;
  input: number | { y: number; x: number };
  wasm: number;
  native: number;
}

interface DeterminismSummary {
  iterations: number;
  seed: number;
  wasmHashHex: string;
  nativeHashHex: string;
  hashesMatch: boolean;
  maxAbsDiff: number;
  diffSample?: DiffSample;
  sampleAngle: number;
  sampleVector: { x: number; y: number; z: number };
}

const DEFAULT_SEED = 0x1234abcd;
const DEFAULT_ITERATIONS = 250_000;
const MAX_ITERATIONS = 2_000_000;
const HASH_MASK = (1n << 64n) - 1n;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const floatBuffer = new ArrayBuffer(8);
const floatView = new DataView(floatBuffer);
let lastSummary: DeterminismSummary | null = null;

function createXorShift32(seed: number): XorShift {
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

function hashNumber(hash: bigint, value: number): bigint {
  floatView.setFloat64(0, value, true);
  hash ^= BigInt(floatView.getUint32(0, true));
  hash = (hash * FNV_PRIME) & HASH_MASK;
  hash ^= BigInt(floatView.getUint32(4, true));
  hash = (hash * FNV_PRIME) & HASH_MASK;
  return hash;
}

function formatHash(hash: bigint): string {
  const normalized = hash & HASH_MASK;
  return `0x${normalized.toString(16).padStart(16, "0")}`;
}

function randomSigned(rand: XorShift, scale: number): number {
  return (rand() * 2 - 1) * scale;
}

function runDeterminismTest(seed: number, iterations: number = DEFAULT_ITERATIONS): DeterminismSummary {
  const rand = createXorShift32(seed);
  let wasmHash = FNV_OFFSET;
  let nativeHash = FNV_OFFSET;
  let maxAbsDiff = 0;
  let diffSample: DiffSample | undefined;
  const quat = Quat.new_identity();
  let sampleAngle = 0;
  let sampleVector = { x: 0, y: 0, z: 0 };

  const trackDiff = (kind: DiffKind, input: DiffSample["input"], wasmValue: number, nativeValue: number) => {
    const absDiff = Math.abs(wasmValue - nativeValue);
    if (absDiff > maxAbsDiff) {
      maxAbsDiff = absDiff;
      diffSample = { kind, input, wasm: wasmValue, native: nativeValue };
    }
  };

  for (let i = 0; i < iterations; i += 1) {
    const angle = randomSigned(rand, Math.PI * 8);
    sampleAngle = angle;
    const wasmSin = dm_sin(angle);
    const nativeSin = Math.sin(angle);
    wasmHash = hashNumber(wasmHash, wasmSin);
    nativeHash = hashNumber(nativeHash, nativeSin);
    trackDiff("sin", angle, wasmSin, nativeSin);

    const wasmCos = dm_cos(angle);
    const nativeCos = Math.cos(angle);
    wasmHash = hashNumber(wasmHash, wasmCos);
    nativeHash = hashNumber(nativeHash, nativeCos);
    trackDiff("cos", angle, wasmCos, nativeCos);

    const yVal = randomSigned(rand, 2048);
    const xVal = randomSigned(rand, 2048);
    const wasmAtan2 = dm_atan2(yVal, xVal);
    const nativeAtan2 = Math.atan2(yVal, xVal);
    wasmHash = hashNumber(wasmHash, wasmAtan2);
    nativeHash = hashNumber(nativeHash, nativeAtan2);
    trackDiff("atan2", { y: yVal, x: xVal }, wasmAtan2, nativeAtan2);

    const sqrtInput = rand() * 1_000_000 + 1e-9;
    const wasmSqrt = dm_sqrt(sqrtInput);
    const nativeSqrt = Math.sqrt(sqrtInput);
    wasmHash = hashNumber(wasmHash, wasmSqrt);
    nativeHash = hashNumber(nativeHash, nativeSqrt);
    trackDiff("sqrt", sqrtInput, wasmSqrt, nativeSqrt);

    const axis = makeNormalizedVec3(randomSigned(rand, 1), randomSigned(rand, 1), randomSigned(rand, 1));
    const stepQuat = Quat.from_axis_angle(axis, angle * 0.5);
    quat.mul_assign(stepQuat);

    const vec = new Vec3(randomSigned(rand, 50), randomSigned(rand, 50), randomSigned(rand, 50));
    vec.normalize();
    const rotated = quat.rotate_vec3(vec);

    const scratch = new Vec3(rotated.x(), rotated.y(), rotated.z());
    scratch.add(axis);
    scratch.scale(0.5);
    wasmHash = hashNumber(wasmHash, scratch.length());

    sampleVector = { x: rotated.x(), y: rotated.y(), z: rotated.z() };
    wasmHash = hashNumber(wasmHash, sampleVector.x);
    wasmHash = hashNumber(wasmHash, sampleVector.y);
    wasmHash = hashNumber(wasmHash, sampleVector.z);
  }

  const wasmHashHex = formatHash(wasmHash);
  const nativeHashHex = formatHash(nativeHash);
  return {
    iterations,
    seed: seed >>> 0,
    wasmHashHex,
    nativeHashHex,
    hashesMatch: wasmHashHex === nativeHashHex,
    maxAbsDiff,
    diffSample,
    sampleAngle,
    sampleVector,
  };
}

async function runAndDisplay(seed: number, iterations: number): Promise<void> {
  await initMath();
  lastSummary = runDeterminismTest(seed, iterations);
  const text = JSON.stringify(lastSummary, null, 2);
  const output = document.getElementById("determinism-output");
  if (output) {
    output.textContent = text;
  }
  console.log(`[determinism] ${text}`);
}

function parseSeedInput(value: string): number {
  if (!value) {
    return DEFAULT_SEED;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return Number.parseInt(trimmed, 16) >>> 0;
  }
  return Number.parseInt(trimmed, 10) >>> 0;
}

function parseIterationInput(value: string): number {
  if (!value) {
    return DEFAULT_ITERATIONS;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ITERATIONS;
  }
  return Math.min(parsed, MAX_ITERATIONS);
}

function wireUI(): void {
  const runButton = document.getElementById("run-determinism-test");
  const copyButton = document.getElementById("copy-determinism-result");
  const seedInput = document.getElementById("determinism-seed") as HTMLInputElement | null;
  const iterationInput = document.getElementById("determinism-iterations") as HTMLInputElement | null;

  if (runButton) {
    runButton.addEventListener("click", async () => {
      const seed = parseSeedInput(seedInput?.value ?? "");
      const iterations = parseIterationInput(iterationInput?.value ?? "");
      runButton.setAttribute("disabled", "true");
      await runAndDisplay(seed, iterations);
      runButton.removeAttribute("disabled");
    });
  }

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      if (!lastSummary) {
        return;
      }
      const resultText = JSON.stringify(lastSummary, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resultText);
      } else {
        window.prompt("Copy the hash", resultText);
      }
    });
  }

  if (seedInput) {
    seedInput.value = `0x${(DEFAULT_SEED >>> 0).toString(16)}`;
  }
  if (iterationInput) {
    iterationInput.value = `${DEFAULT_ITERATIONS}`;
    iterationInput.title = `Between 1 and ${MAX_ITERATIONS.toLocaleString()} iterations`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireUI();
  runAndDisplay(DEFAULT_SEED, DEFAULT_ITERATIONS).catch((err) => {
    console.error("Determinism test failed to start", err);
  });
});
