import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot, isSiteFile } from "./site-files.js";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Usage: node scripts/package-release.js [--force]\nPackages committed Git HEAD into reproducible source and static-site ZIP files.\nUncommitted changes are excluded. Existing release files require --force.",
  );
  process.exit(0);
}
if (args.some((arg) => arg !== "--force"))
  throw new Error("Unknown option. Use --help for usage.");
const force = args.includes("--force");
const git = (...gitArgs) =>
  execFileSync("git", gitArgs, {
    cwd: projectRoot,
    maxBuffer: 64 * 1024 * 1024,
  });
let commit;
try {
  commit = git("rev-parse", "--verify", "HEAD^{commit}").toString().trim();
} catch {
  throw new Error(
    "Create a Git commit before packaging a release. Archives are built from committed HEAD.",
  );
}
const metadata = JSON.parse(git("show", `${commit}:package.json`).toString());
const version = metadata.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
  throw new Error("package.json must contain a safe semantic version.");
const prefix = `lockray-${version}`;
const output = path.join(projectRoot, "releases", `v${version}`);
const outputNames = [
  `${prefix}-source.zip`,
  `${prefix}-site.zip`,
  "SHA256SUMS.txt",
];
await mkdir(output, { recursive: true });
if (!force) {
  for (const name of outputNames) {
    let exists = true;
    try {
      await access(path.join(output, name));
    } catch (error) {
      if (error.code === "ENOENT") exists = false;
      else throw error;
    }
    if (exists)
      throw new Error(
        `Release file already exists: releases/v${version}/${name}. Use --force to overwrite.`,
      );
  }
}

const entries = git("ls-tree", "-r", "-z", commit)
  .toString()
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const match = /^(\d+) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
    if (!match || !["100644", "100755"].includes(match[1]))
      throw new Error("Release archives support regular tracked files only.");
    return { mode: match[1], object: match[2], name: match[3] };
  });
const source = new Map();
const site = new Map();
for (const entry of entries) {
  const data = git("cat-file", "blob", entry.object);
  source.set(`${prefix}/${entry.name}`, {
    data,
    executable: entry.mode === "100755",
  });
  if (isSiteFile(entry.name)) site.set(entry.name, { data });
}
for (const name of ["index.html", "style.css", "icon.svg"]) {
  if (!site.has(name))
    throw new Error(
      `Committed HEAD is missing ${name}. Commit the complete app before packaging.`,
    );
}
site.set(".nojekyll", { data: Buffer.alloc(0) });
const date = new Date(
  Number(git("show", "-s", "--format=%ct", commit).toString().trim()) * 1000,
);

// ZIP's store method avoids zlib-version differences. All metadata comes from
// the Git commit, so packaging the same HEAD yields byte-identical archives.
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++)
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const year = Math.max(1980, Math.min(2107, date.getUTCFullYear()));
  const dosDate =
    ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  const dosTime =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    (date.getUTCSeconds() >> 1);
  const sorted = [...files.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  if (sorted.length > 65535)
    throw new Error("Archive has too many files for standard ZIP.");
  for (const [name, { data, executable = false }] of sorted) {
    const filename = Buffer.from(name);
    if (
      filename.length > 65535 ||
      data.length > 0xffffffff ||
      offset > 0xffffffff
    )
      throw new Error("Archive exceeds standard ZIP limits.");
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(0x0314, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x0800, 8);
    directory.writeUInt16LE(dosTime, 12);
    directory.writeUInt16LE(dosDate, 14);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(data.length, 20);
    directory.writeUInt32LE(data.length, 24);
    directory.writeUInt16LE(filename.length, 28);
    directory.writeUInt32LE(
      ((executable ? 0o100755 : 0o100644) << 16) >>> 0,
      38,
    );
    directory.writeUInt32LE(offset, 42);
    local.push(header, filename, data);
    central.push(directory, filename);
    offset += header.length + filename.length + data.length;
  }
  const centralSize = central.reduce((sum, buffer) => sum + buffer.length, 0);
  if (centralSize + offset > 0xffffffff)
    throw new Error("Archive exceeds standard ZIP limits.");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

const archives = [zip(source), zip(site)];
const sums =
  archives
    .map(
      (data, index) =>
        `${createHash("sha256").update(data).digest("hex")}  ${outputNames[index]}`,
    )
    .join("\n") + "\n";
for (let index = 0; index < archives.length; index++)
  await writeFile(path.join(output, outputNames[index]), archives[index], {
    flag: force ? "w" : "wx",
  });
await writeFile(path.join(output, "SHA256SUMS.txt"), sums, {
  flag: force ? "w" : "wx",
});
console.log(`Packaged Git HEAD ${commit} into releases/v${version}/`);
console.log(`  ${outputNames.join("\n  ")}`);
console.log(
  "Only committed files are included. ZIPs contain no build-time timestamps.",
);
