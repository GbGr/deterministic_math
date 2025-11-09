import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

async function ensureExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const root = resolve(process.cwd());
  const source = resolve(root, "pkg");
  const target = resolve(root, "dist", "pkg");

  if (!(await ensureExists(source))) {
    throw new Error("Missing `pkg` directory. Run `npm run build:wasm` first.");
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(resolve(root, "dist"), { recursive: true });

  await cp(source, target, {
    recursive: true,
    filter: (src) => {
      // Skip .gitignore inside pkg so npm does not ignore built artifacts
      return !src.endsWith(".gitignore");
    },
  });

  console.log(`[copy:pkg] Copied ${source} -> ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
