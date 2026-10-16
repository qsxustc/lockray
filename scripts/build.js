import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot, readSiteFiles } from "./site-files.js";

const files = await readSiteFiles();
const output = path.join(projectRoot, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [name, contents] of files) {
  const target = path.join(output, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}
await writeFile(path.join(output, ".nojekyll"), "");
console.log(`Built ${files.size} public files in dist/ (plus .nojekyll).`);
