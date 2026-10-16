import { readdir, lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const required = ["index.html", "style.css", "icon.svg"];
const publicExtensions = new Set([".js", ".json", ".svg", ".css", ".md"]);

/** The deployed site intentionally contains only public app assets. */
export function isSiteFile(name) {
  if (required.includes(name)) return true;
  const parts = name.split("/");
  return (
    ["src", "samples"].includes(parts[0]) &&
    parts.length > 1 &&
    parts.every((part) => part && !part.startsWith(".")) &&
    publicExtensions.has(path.posix.extname(name))
  );
}

export async function readSiteFiles(root = projectRoot) {
  const files = new Map();
  for (const name of required) {
    const target = path.join(root, name);
    if (!(await lstat(target)).isFile())
      throw new Error(`Expected a regular site file: ${name}`);
    files.set(name, await readFile(target));
  }
  async function walk(directory) {
    const entries = await readdir(path.join(root, directory), {
      withFileTypes: true,
    });
    for (const entry of entries.sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    )) {
      if (entry.name.startsWith(".")) continue;
      const name = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink())
        throw new Error(`Site assets must not be symbolic links: ${name}`);
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile() && isSiteFile(name))
        files.set(name, await readFile(path.join(root, name)));
    }
  }
  await walk("src");
  await walk("samples");
  return files;
}
