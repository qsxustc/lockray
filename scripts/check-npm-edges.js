#!/usr/bin/env node
// Optional maintainer validation. Arborist is supplied explicitly by the caller;
// it is never a Lockray dependency and never enters the browser build.
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analyze } from "../src/core.js";

const help = `Validate real fixtures against npm's offline virtual dependency tree.

Usage:
  node scripts/check-npm-edges.js --arborist /absolute/path/to/@npmcli/arborist [--case id]

--arborist accepts the installed package directory or its lib/index.js file.
No npm installation, tarball fetching, or upstream dependency code is run.
The command creates a temporary package.json from each lockfile's root entry,
loads the virtual lockfile tree, and removes the temporary directory afterward.
Exit codes: 0 agreement, 1 oracle differences, 2 configuration or input error.
`;

function installed(location) {
  return /(?:^|\/)node_modules\//.test(location);
}
function sameSet(a, b) {
  return a.size === b.size && [...a].every((item) => b.has(item));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(help);
    return;
  }
  let arboristPath, caseId;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!["--arborist", "--case"].includes(arg))
      throw new Error(`Unknown option: ${arg}`);
    const value = args[++index];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${arg}`);
    if (arg === "--arborist") {
      if (!path.isAbsolute(value))
        throw new Error("--arborist requires an absolute local path.");
      arboristPath = value;
    } else caseId = value;
  }
  if (!arboristPath)
    throw new Error(
      "An explicit --arborist path is required. Use --help for usage.",
    );
  if ((await stat(arboristPath)).isDirectory())
    arboristPath = path.join(arboristPath, "lib", "index.js");
  const { default: Arborist } = await import(pathToFileURL(arboristPath).href);
  let arboristVersion = "unknown";
  try {
    arboristVersion = JSON.parse(
      await readFile(
        path.join(path.dirname(arboristPath), "..", "package.json"),
        "utf8",
      ),
    ).version;
  } catch {
    /* The caller can supply a compatible standalone module. */
  }
  const fixtureRoot = fileURLToPath(
    new URL("../samples/real/", import.meta.url),
  );
  const manifest = JSON.parse(
    await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"),
  );
  if (manifest.schemaVersion !== 1)
    throw new Error("Unsupported real-case manifest schema.");
  const cases = manifest.cases.filter((item) => !caseId || item.id === caseId);
  if (!cases.length)
    throw new Error(`No real fixture matches ${caseId || "the manifest"}.`);
  const results = [];
  for (const item of cases) {
    const inputs = {};
    for (const side of ["before", "after"]) {
      const filename = path.resolve(fixtureRoot, item[side].file);
      if (!filename.startsWith(`${path.resolve(fixtureRoot)}${path.sep}`))
        throw new Error("Fixture paths must stay within samples/real.");
      inputs[side] = await readFile(filename, "utf8");
    }
    const report = analyze(inputs.before, inputs.after);
    const sides = {};
    for (const side of ["before", "after"]) {
      const lock = JSON.parse(inputs[side]);
      const directory = await mkdtemp(
        path.join(os.tmpdir(), "lockray-npm-oracle-"),
      );
      try {
        await writeFile(
          path.join(directory, "package-lock.json"),
          inputs[side],
        );
        await writeFile(
          path.join(directory, "package.json"),
          JSON.stringify(
            lock.packages[""] || { name: "lockray-virtual-fixture" },
          ),
        );
        const tree = await new Arborist({
          path: directory,
          offline: true,
          audit: false,
          fund: false,
          ignoreScripts: true,
        }).loadVirtual();
        const entries = new Map(
          Object.entries(lock.packages).filter(([location]) =>
            installed(location),
          ),
        );
        const inventory = new Map(
          [...tree.inventory.values()]
            .filter((node) => installed(node.location))
            .map((node) => [node.location, node]),
        );
        const edges = new Map(),
          resolutionDifferences = [],
          outsideModel = [];
        for (const [location, entry] of entries) {
          const children = new Set();
          if (!entry.link) {
            const requester = createRequire(
              path.join(directory, ...location.split("/"), "package.json"),
            );
            // Declared npm shims can share a name with a Node builtin. Probe
            // lookup directories independently of that runtime special case.
            const lookupDirectories =
              requester.resolve.paths("__lockray_installed_slot_probe__") || [];
            const names = new Set([
              ...Object.keys(entry.dependencies || {}),
              ...Object.keys(entry.optionalDependencies || {}),
              ...Object.keys(entry.peerDependencies || {}),
            ]);
            for (const name of names) {
              let nativeTarget = null;
              for (const lookup of lookupDirectories) {
                const candidate = path
                  .relative(directory, path.join(lookup, ...name.split("/")))
                  .split(path.sep)
                  .join("/");
                if (!candidate.startsWith("../") && entries.has(candidate)) {
                  nativeTarget = candidate;
                  break;
                }
              }
              const npmTarget =
                inventory.get(location)?.edgesOut.get(name)?.to?.location ??
                null;
              if (npmTarget && !entries.has(npmTarget)) {
                outsideModel.push({
                  from: location,
                  name,
                  npmTarget,
                  reason:
                    "Target is outside installed-slot/workspace-link boundary",
                });
                continue;
              }
              if (nativeTarget !== npmTarget)
                resolutionDifferences.push({
                  from: location,
                  name,
                  nativeTarget,
                  npmTarget,
                });
              if (npmTarget) children.add(npmTarget);
            }
          }
          edges.set(location, children);
        }
        const direct = new Map(
          [...tree.edgesOut]
            .filter(([, edge]) => edge.to && entries.has(edge.to.location))
            .map(([name, edge]) => [name, edge.to.location]),
        );
        const owners = new Map(),
          distances = new Map();
        for (const [name, start] of direct) {
          const seen = new Set([start]),
            pending = [[start, 1]];
          for (let cursor = 0; cursor < pending.length; cursor++) {
            const [location, depth] = pending[cursor];
            if (!owners.has(location)) owners.set(location, new Set());
            owners.get(location).add(name);
            distances.set(
              location,
              Math.min(distances.get(location) ?? Infinity, depth),
            );
            for (const child of edges.get(location) || [])
              if (!seen.has(child)) {
                seen.add(child);
                pending.push([child, depth + 1]);
              }
          }
        }
        const chainDifferences = [];
        for (const change of report.changes) {
          if (!change[side] || change[`${side}ChainOmitted`]) continue;
          const chain = change[`${side}Chain`];
          const expectedLength = distances.get(change.path) ?? 0;
          if (chain.length !== expectedLength)
            chainDifferences.push({
              path: change.path,
              reason: "Shortest path length",
              actual: chain.length,
              expected: expectedLength,
            });
          for (let index = 1; index < chain.length; index++)
            if (!edges.get(chain[index - 1].path)?.has(chain[index].path))
              chainDifferences.push({
                path: change.path,
                reason: "Chain edge differs from npm",
                from: chain[index - 1].path,
                to: chain[index].path,
              });
        }
        sides[side] = {
          installed: entries.size,
          npmInventory: inventory.size,
          resolvedRoots: direct.size,
          unreachable: [...entries.keys()].filter(
            (location) => !owners.has(location),
          ),
          rootRelationships: [...owners.values()].reduce(
            (sum, names) => sum + names.size,
            0,
          ),
          resolutionDifferences,
          chainDifferences,
          outsideModel,
          owners,
        };
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
    const ownerDifferences = [];
    for (const change of report.changes) {
      const expected = new Set([
        ...(sides.before.owners.get(change.path) || []),
        ...(sides.after.owners.get(change.path) || []),
      ]);
      const actual = new Set(change.roots);
      if (
        report.attributionComplete
          ? !sameSet(actual, expected)
          : [...actual].some((name) => !expected.has(name))
      )
        ownerDifferences.push({
          path: change.path,
          actual: [...actual].sort(),
          expected: [...expected].sort(),
        });
    }
    for (const side of ["before", "after"]) delete sides[side].owners;
    results.push({
      id: item.id,
      attributionComplete: report.attributionComplete,
      chainsComplete: report.chainsComplete,
      ...sides,
      ownerDifferences,
    });
  }
  console.log(
    JSON.stringify(
      {
        arboristVersion,
        mode: "offline loadVirtual only; no upstream installation or execution",
        results,
      },
      null,
      2,
    ),
  );
  if (
    results.some(
      (result) =>
        result.ownerDifferences.length ||
        ["before", "after"].some(
          (side) =>
            result[side].resolutionDifferences.length ||
            result[side].chainDifferences.length,
        ),
    )
  )
    process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check-npm-edges: ${error.message}`);
  process.exitCode = 2;
});
