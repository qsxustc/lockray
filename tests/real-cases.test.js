import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { analyze } from "../src/core.js";

const fixtureRoot = fileURLToPath(new URL("../samples/real/", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"),
);
const countFields = [
  "before",
  "after",
  "added",
  "removed",
  "updated",
  "metadata",
  "unchanged",
  "changed",
];

function fixtureFile(relative) {
  const target = path.resolve(fixtureRoot, relative);
  assert.ok(
    target.startsWith(`${path.resolve(fixtureRoot)}${path.sep}`),
    "Fixture paths stay within samples/real",
  );
  return target;
}

const installedEntries = (lock) =>
  new Map(
    Object.entries(lock.packages).filter(([location]) =>
      /(?:^|\/)node_modules\//.test(location),
    ),
  );

// Independent raw-object comparison: does not use Lockray parsing or comparison helpers.
function rawDifference(before, after) {
  const a = installedEntries(before),
    b = installedEntries(after);
  const counts = {
    before: a.size,
    after: b.size,
    added: 0,
    removed: 0,
    updated: 0,
    metadata: 0,
    unchanged: 0,
    changed: 0,
  };
  const changes = new Map();
  for (const location of new Set([...a.keys(), ...b.keys()])) {
    const previous = a.get(location),
      current = b.get(location);
    const status = !previous
      ? "added"
      : !current
        ? "removed"
        : isDeepStrictEqual(previous, current)
          ? "unchanged"
          : previous.version !== current.version
            ? "updated"
            : "metadata";
    counts[status]++;
    if (status !== "unchanged") {
      counts.changed++;
      changes.set(location, status);
    }
  }
  return { counts, changes };
}

// Ask the running Node executable for its actual ascending node_modules lookup
// directories. A non-builtin probe preserves declared npm shim edges such as
// string_decoder: this is installed-slot metadata, not a runtime imports model.
// No packages are resolved from disk, imported, installed, or run.
function nativeGraph(lock) {
  const entries = installedEntries(lock);
  const virtualRoot = path.resolve(fixtureRoot, "__virtual_project__");
  const edges = new Map();
  for (const [location, entry] of entries) {
    const targets = new Set();
    if (!entry.link) {
      const requester = createRequire(
        path.join(virtualRoot, ...location.split("/"), "package.json"),
      );
      const directories =
        requester.resolve.paths("__lockray_installed_slot_probe__") || [];
      const names = new Set([
        ...Object.keys(entry.dependencies || {}),
        ...Object.keys(entry.optionalDependencies || {}),
        ...Object.keys(entry.peerDependencies || {}),
      ]);
      for (const name of names) {
        for (const directory of directories) {
          const relative = path
            .relative(virtualRoot, path.join(directory, ...name.split("/")))
            .split(path.sep)
            .join("/");
          if (!relative.startsWith("../") && entries.has(relative)) {
            targets.add(relative);
            break;
          }
        }
      }
    }
    edges.set(location, targets);
  }
  const root = lock.packages[""] || {};
  const rootNames = new Set(
    [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ].flatMap((field) => Object.keys(root[field] || {})),
  );
  const direct = new Map(
    [...rootNames]
      .map((name) => [name, `node_modules/${name}`])
      .filter(([, location]) => entries.has(location)),
  );
  const owners = new Map(),
    distances = new Map();
  for (const [name, start] of direct) {
    const seen = new Set([start]),
      queue = [[start, 1]];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const [location, depth] = queue[cursor];
      if (!owners.has(location)) owners.set(location, new Set());
      owners.get(location).add(name);
      distances.set(
        location,
        Math.min(distances.get(location) ?? Infinity, depth),
      );
      for (const child of edges.get(location) || [])
        if (!seen.has(child)) {
          seen.add(child);
          queue.push([child, depth + 1]);
        }
    }
  }
  return { entries, edges, direct, owners, distances };
}

function checkChains(report, side, graph) {
  for (const change of report.changes) {
    const chain = change[`${side}Chain`];
    const omitted = change[`${side}ChainOmitted`];
    if (omitted) {
      assert.equal(
        report.chainsComplete,
        false,
        "Omitted chains must disclose incomplete coverage",
      );
      assert.equal(chain.length, 0);
      assert.ok(
        report.warnings.some((warning) =>
          /chain.*(?:budget|limit)/i.test(warning),
        ),
      );
      continue;
    }
    if (!change[side]) {
      assert.equal(chain.length, 0);
      continue;
    }
    assert.equal(
      chain.length,
      graph.distances.get(change.path) ?? 0,
      `${side}: shortest path to ${change.path}`,
    );
    if (!chain.length) continue;
    assert.equal(
      chain.at(-1).path,
      change.path,
      "Chain ends at the selected installation slot",
    );
    assert.ok(
      [...graph.direct.values()].includes(chain[0].path),
      "Chain starts at a recorded direct dependency",
    );
    for (let index = 0; index < chain.length; index++) {
      const item = chain[index];
      assert.ok(
        graph.entries.has(item.path),
        `${side}: chain slot exists: ${item.path}`,
      );
      assert.equal(item.version, graph.entries.get(item.path).version || "");
      if (index)
        assert.ok(
          graph.edges.get(chain[index - 1].path)?.has(item.path),
          `${side}: native Node lookup supports ${chain[index - 1].path} → ${item.path}`,
        );
    }
  }
}

function checkOwners(report, beforeGraph, afterGraph) {
  const counts = new Map();
  for (const change of report.changes) {
    const expected = new Set([
      ...(beforeGraph.owners.get(change.path) || []),
      ...(afterGraph.owners.get(change.path) || []),
    ]);
    if (report.attributionComplete)
      assert.deepEqual(
        [...change.roots].sort(),
        [...expected].sort(),
        `All root owners for ${change.path}`,
      );
    else {
      assert.ok(
        report.warnings.some((warning) => /attribution.*limit/i.test(warning)),
      );
      for (const name of change.roots)
        assert.ok(
          expected.has(name),
          "Partial attribution must never invent a root owner",
        );
      if (expected.size)
        assert.ok(
          change.roots.length > 0,
          "Partial attribution retains a shortest-path owner",
        );
    }
    for (const name of change.roots) {
      if (!counts.has(name))
        counts.set(name, {
          changed: 0,
          added: 0,
          removed: 0,
          updated: 0,
          metadata: 0,
        });
      counts.get(name).changed++;
      counts.get(name)[change.status]++;
    }
  }
  for (const root of report.roots) {
    const count = counts.get(root.name) || {
      changed: 0,
      added: 0,
      removed: 0,
      updated: 0,
      metadata: 0,
    };
    for (const [field, value] of Object.entries(count))
      assert.equal(root[field], value, `Root ${root.name}: ${field}`);
  }
}

test("real-case manifest names immutable upstream sources and retained licenses", async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(manifest.cases.length >= 1);
  assert.equal(
    new Set(manifest.cases.map((item) => item.id)).size,
    manifest.cases.length,
  );
  for (const item of manifest.cases) {
    assert.match(item.beforeCommit, /^[a-f0-9]{40}$/);
    assert.match(item.afterCommit, /^[a-f0-9]{40}$/);
    assert.ok(item.commitUrl.includes(item.afterCommit));
    assert.ok(!Number.isNaN(Date.parse(item.commitDate)));
    assert.ok(item.repository && item.license.spdx && item.license.url);
    const licenseBytes = await readFile(fixtureFile(item.license.file));
    assert.ok(licenseBytes.toString("utf8").trim().length > 100);
    assert.equal(
      createHash("sha256").update(licenseBytes).digest("hex"),
      item.license.sha256,
      `${item.id}: retained license bytes match upstream`,
    );
  }
});

for (const item of manifest.cases) {
  const buffers = {
    before: await readFile(fixtureFile(item.before.file)),
    after: await readFile(fixtureFile(item.after.file)),
  };
  const text = {
    before: buffers.before.toString("utf8"),
    after: buffers.after.toString("utf8"),
  };
  const raw = {
    before: JSON.parse(text.before),
    after: JSON.parse(text.after),
  };
  const independent = rawDifference(raw.before, raw.after);
  const report = analyze(text.before, text.after);
  const graphs = {
    before: nativeGraph(raw.before),
    after: nativeGraph(raw.after),
  };

  test(`${item.id}: immutable raw SHA256 and independent installation-slot diff agree`, () => {
    for (const side of ["before", "after"])
      assert.equal(
        createHash("sha256").update(buffers[side]).digest("hex"),
        item[side].sha256,
        `${side}: original upstream bytes`,
      );
    assert.deepEqual(independent.counts, item.expected);
    for (const field of countFields)
      assert.equal(report.summary[field], independent.counts[field], field);
    assert.deepEqual(
      new Map(report.changes.map((change) => [change.path, change.status])),
      independent.changes,
    );
    if (item.focus) {
      assert.equal(
        raw.before.packages[item.focus.path]?.version ?? null,
        item.focus.beforeVersion ?? null,
      );
      assert.equal(
        raw.after.packages[item.focus.path]?.version ?? null,
        item.focus.afterVersion ?? null,
      );
      assert.ok(
        independent.changes.has(item.focus.path),
        "The documented focus actually changed",
      );
    }
  });

  test(`${item.id}: self-comparison, reversal, and repeated comparison are stable`, () => {
    for (const side of ["before", "after"]) {
      const same = analyze(text[side], text[side]);
      assert.equal(same.summary.changed, 0);
      assert.equal(same.summary.unchanged, graphs[side].entries.size);
      assert.deepEqual(same.changes, []);
      assert.deepEqual(same.rootChanges, []);
    }
    assert.deepEqual(analyze(text.before, text.after), report);
    const reverse = analyze(text.after, text.before);
    assert.equal(reverse.summary.before, report.summary.after);
    assert.equal(reverse.summary.after, report.summary.before);
    assert.equal(reverse.summary.added, report.summary.removed);
    assert.equal(reverse.summary.removed, report.summary.added);
    for (const field of ["updated", "metadata", "unchanged", "changed"])
      assert.equal(reverse.summary[field], report.summary[field]);
    const inverse = {
      added: "removed",
      removed: "added",
      updated: "updated",
      metadata: "metadata",
    };
    const reverseStatuses = new Map(
      reverse.changes.map((change) => [change.path, change.status]),
    );
    for (const change of report.changes)
      assert.equal(reverseStatuses.get(change.path), inverse[change.status]);
    checkChains(reverse, "before", graphs.after);
    checkChains(reverse, "after", graphs.before);
    checkOwners(reverse, graphs.after, graphs.before);
  });

  test(`${item.id}: every reported chain and root owner agrees with native Node lookup`, () => {
    checkChains(report, "before", graphs.before);
    checkChains(report, "after", graphs.after);
    checkOwners(report, graphs.before, graphs.after);
  });
}
