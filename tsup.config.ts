import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  minify: false,
  target: "es2020",
  outDir: "dist/lib",
  shims: false,
  skipNodeModulesBundle: true,
  external: ["../pkg/det_math_wasm.js"],
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});
