import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const root = resolve(process.cwd());
  const distWeb = resolve(root, "dist", "web");
  const publicDir = resolve(root, "public");
  const docsDir = resolve(root, "docs");
  const docsAssets = resolve(docsDir, "assets");

  if (!(await exists(distWeb))) {
    throw new Error("Missing `dist/web`. Run `npm run build:web` first.");
  }

  await rm(docsDir, { recursive: true, force: true });
  await mkdir(docsDir, { recursive: true });
  await cp(publicDir, docsDir, { recursive: true });
  await mkdir(docsAssets, { recursive: true });
  await cp(distWeb, docsAssets, { recursive: true });
  console.log(`[docs:sync] Copied public -> ${docsDir} and dist/web -> ${docsAssets}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
