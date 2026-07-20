import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("public/workers", { recursive: true });

await build({
  entryPoints: ["src/workers/meter-analysis.worker.ts"],
  outfile: "public/workers/meter-analysis.worker.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  sourcemap: false,
  tsconfig: "tsconfig.json",
});
