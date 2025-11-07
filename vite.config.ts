import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: false,
  build: {
    target: "es2020",
    outDir: "dist/web",
    sourcemap: true,
    rollupOptions: {
      input: {
        benchmark: resolve(__dirname, "src/benchmark.ts"),
        "determinism-test": resolve(__dirname, "src/determinism-test.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
