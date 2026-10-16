import test from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  compareLocks,
  parseLock,
  toMarkdown,
  LIMITS,
} from "../src/core.js";

function lock(packages = {}, root = {}, extra = {}) {
  return JSON.stringify({
    name: "fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    packages: { "": root, ...packages },
    ...extra,
  });
}
const pkg = (version, extra = {}) => ({
  version,
  resolved: `https://registry.npmjs.org/example/-/example-${version}.tgz`,
  integrity: `sha512-${version}`,
  ...extra,
});
const path = (name) => `node_modules/${name}`;
const changed = (report, name) =>
  report.changes.find((change) => change.path === name);

test("compares exact nested and scoped installation slots without flattening names", () => {
  const root = { dependencies: { app: "1", "@scope/view": "1" } };
  const before = lock(
    {
      [path("app")]: pkg("1.0.0", { dependencies: { shared: "1" } }),
      [path("@scope/view")]: pkg("1.0.0", { dependencies: { shared: "2" } }),
      [path("shared")]: pkg("2.0.0"),
      [path("app/node_modules/shared")]: pkg("1.0.0"),
    },
    root,
  );
  const after = lock(
    {
      [path("app")]: pkg("1.0.0", { dependencies: { shared: "1" } }),
      [path("@scope/view")]: pkg("1.0.0", { dependencies: { shared: "2" } }),
      [path("shared")]: pkg("2.1.0"),
      [path("app/node_modules/shared")]: pkg("1.0.1"),
    },
    root,
  );
  const report = analyze(before, after);
  assert.equal(report.summary.updated, 2);
  assert.deepEqual(changed(report, path("shared")).roots, ["@scope/view"]);
  assert.deepEqual(changed(report, path("app/node_modules/shared")).roots, [
    "app",
  ]);
  assert.deepEqual(
    changed(report, path("shared")).afterChain.map((item) => item.name),
    ["@scope/view", "shared"],
  );
  assert.equal(changed(report, path("shared")).versionChange, "minor");
});

test("resolves nearest hoisted dependencies and records every affected root", () => {
  const root = { dependencies: { app: "1", other: "1" } };
  const packages = {
    [path("app")]: pkg("1.0.0", { dependencies: { middle: "1" } }),
    [path("other")]: pkg("1.0.0", { dependencies: { shared: "1" } }),
    [path("middle")]: pkg("1.0.0", { dependencies: { shared: "1" } }),
    [path("shared")]: pkg("1.0.0"),
  };
  const report = analyze(
    lock(packages, root),
    lock({ ...packages, [path("shared")]: pkg("1.0.1") }, root),
  );
  const change = report.changes[0];
  assert.deepEqual(change.roots, ["app", "other"]);
  assert.deepEqual(
    change.afterChain.map((item) => item.name),
    ["other", "shared"],
  );
  assert.equal(report.roots.find((root) => root.name === "app").updated, 1);
  assert.equal(report.roots.find((root) => root.name === "other").updated, 1);
});

test("shows separate shortest paths before and after a dependency is reparented", () => {
  const root = { dependencies: { a: "1", b: "1" } };
  const before = lock(
    {
      [path("a")]: pkg("1.0.0", { dependencies: { c: "1" } }),
      [path("b")]: pkg("1.0.0"),
      [path("c")]: pkg("1.0.0"),
    },
    root,
  );
  const after = lock(
    {
      [path("a")]: pkg("1.0.0"),
      [path("b")]: pkg("1.0.0", { dependencies: { c: "2" } }),
      [path("c")]: pkg("2.0.0"),
    },
    root,
  );
  const change = changed(analyze(before, after), path("c"));
  assert.deepEqual(
    change.beforeChain.map((item) => item.name),
    ["a", "c"],
  );
  assert.deepEqual(
    change.afterChain.map((item) => item.name),
    ["b", "c"],
  );
  assert.deepEqual(change.roots, ["a", "b"]);
});

test("cycles terminate and preserve a shortest path", () => {
  const root = { dependencies: { a: "1" } };
  const packages = {
    [path("a")]: pkg("1.0.0", { dependencies: { b: "1" } }),
    [path("b")]: pkg("1.0.0", { dependencies: { a: "1" } }),
  };
  const report = analyze(
    lock(packages, root),
    lock(
      { ...packages, [path("b")]: pkg("1.0.1", { dependencies: { a: "1" } }) },
      root,
    ),
  );
  assert.deepEqual(
    report.changes[0].afterChain.map((item) => item.name),
    ["a", "b"],
  );
  assert.deepEqual(report.changes[0].roots, ["a"]);
});

test("object key reorder is unchanged; unknown metadata and flags are compared", () => {
  const before = lock({
    [path("a")]: {
      version: "1.0.0",
      license: "MIT",
      nested: { b: 2, a: 1 },
      dependencies: {},
    },
  });
  const reordered = lock({
    [path("a")]: {
      dependencies: {},
      nested: { a: 1, b: 2 },
      license: "MIT",
      version: "1.0.0",
    },
  });
  assert.equal(analyze(before, reordered).summary.changed, 0);
  const changedMetadata = lock({
    [path("a")]: {
      version: "1.0.0",
      license: "Apache-2.0",
      nested: { a: 1, b: 2 },
      dependencies: {},
      dev: true,
    },
  });
  const report = analyze(before, changedMetadata);
  assert.equal(report.summary.metadata, 1);
  assert.equal(report.changes[0].versionChange, "same");
  assert.equal(report.changes[0].after.dev, true);
});

test("flags lifecycle, source changes, same-version integrity changes and missing integrity honestly", () => {
  const root = { dependencies: { a: "1", b: "1", c: "1" } };
  const before = lock(
    {
      [path("a")]: pkg("1.0.0"),
      [path("b")]: pkg("1.0.0"),
      [path("c")]: pkg("1.0.0"),
    },
    root,
  );
  const after = lock(
    {
      [path("a")]: pkg("1.0.0", {
        hasInstallScript: true,
        resolved: "http://mirror.example/a.tgz",
        integrity: "sha512-new",
      }),
      [path("b")]: { version: "2.0.0" },
      [path("c")]: pkg("1.0.0"),
    },
    root,
  );
  const report = analyze(before, after);
  assert.deepEqual(
    changed(report, path("a")).signals.map((signal) => signal.code),
    [
      "install-script-added",
      "source-host-changed",
      "source-protocol-changed",
      "integrity-changed-same-version",
    ],
  );
  assert.equal(
    changed(report, path("b")).signals.some(
      (signal) => signal.code === "integrity-missing",
    ),
    true,
  );
  assert.equal(report.summary.signals, 2);
  assert.equal(report.summary.signalCount, 7);
  assert.match(toMarkdown(report), /not vulnerability or malware findings/);
});

test("added and removed packages have absent-side chains and stable classifications", () => {
  const report = analyze(
    lock({ [path("old")]: pkg("1.0.0") }, { dependencies: { old: "1" } }),
    lock({ [path("new")]: pkg("1.0.0") }, { dependencies: { new: "1" } }),
  );
  assert.equal(report.summary.added, 1);
  assert.equal(report.summary.removed, 1);
  assert.equal(changed(report, path("new")).direct, true);
  assert.deepEqual(changed(report, path("new")).beforeChain, []);
  assert.deepEqual(changed(report, path("old")).afterChain, []);
});

test("optional overrides dependencies, peers resolve, missing required edges warn", () => {
  const packages = {
    [path("app")]: pkg("1.0.0", {
      dependencies: { missing: "1", optional: "1" },
      optionalDependencies: { optional: "2" },
      peerDependencies: { peer: "1", optionalPeer: "1" },
      peerDependenciesMeta: { optionalPeer: { optional: true } },
      devDependencies: { unusedDev: "1" },
    }),
    [path("peer")]: pkg("1.0.0"),
  };
  const root = {
    dependencies: { app: "1", absent: "1" },
    optionalDependencies: { absent: "2" },
  };
  const report = analyze(
    lock(packages, root),
    lock({ ...packages, [path("peer")]: pkg("1.1.0") }, root),
  );
  assert.deepEqual(report.changes[0].roots, ["app"]);
  assert.ok(report.warnings.some((warning) => warning.includes("→ missing")));
  assert.ok(
    !report.warnings.some((warning) =>
      /→ optional|unusedDev|Missing direct dependency/.test(warning),
    ),
  );
});

test("links and workspace targets are explicit and never expand through hoisted peers", () => {
  const root = { dependencies: { workspace: "file:packages/workspace" } };
  const packages = {
    [path("workspace")]: { resolved: "packages/workspace", link: true },
    "packages/workspace": {
      name: "workspace",
      version: "1.0.0",
      dependencies: { child: "1" },
    },
    [path("child")]: pkg("1.0.0"),
  };
  const report = analyze(
    lock(packages, root),
    lock({ ...packages, [path("child")]: pkg("1.0.1") }, root),
  );
  assert.equal(report.summary.before, 2);
  assert.deepEqual(report.changes[0].roots, []);
  assert.deepEqual(report.changes[0].afterChain, []);
  assert.ok(
    report.warnings.some((warning) =>
      warning.includes("Workspace/link limitation"),
    ),
  );
  const linkReport = analyze(
    lock(packages, root),
    lock(
      {
        ...packages,
        [path("workspace")]: { resolved: "packages/new", link: true },
      },
      root,
    ),
  );
  assert.ok(
    !linkReport.changes[0].signals.some(
      (signal) => signal.code === "integrity-missing",
    ),
  );
});

test("supports npm v2 and aliases while preserving installation identity", () => {
  const before = lock(
    { [path("alias")]: pkg("1.0.0", { name: "real-name" }) },
    { dependencies: { alias: "npm:real-name@1" } },
    { lockfileVersion: 2, dependencies: { stale: { version: "100" } } },
  );
  const after = lock(
    { [path("alias")]: pkg("2.0.0", { name: "real-name" }) },
    { dependencies: { alias: "npm:real-name@2" } },
  );
  const report = analyze(before, after);
  assert.equal(report.changes[0].name, "real-name");
  assert.deepEqual(report.changes[0].roots, ["alias"]);
  assert.equal(report.changes[0].versionChange, "major");
});

test("rejects invalid JSON, formats, paths, types, and oversized inputs", () => {
  assert.throws(() => parseLock("{"), /invalid JSON/);
  assert.throws(() => parseLock("[]"), /JSON object/);
  assert.throws(() => parseLock('{"lockfileVersion":1}'), /versions 2 and 3/);
  assert.throws(() => parseLock('{"lockfileVersion":3}'), /packages object/);
  assert.throws(
    () => parseLock(lock({ "../node_modules/a": pkg("1") })),
    /invalid package path/,
  );
  assert.throws(
    () => parseLock(lock({ "node_modules/a/child": pkg("1") })),
    /invalid installation slot/,
  );
  assert.throws(
    () => parseLock(lock({ "node_modules/a/my_node_modules/b": pkg("1") })),
    /invalid installation slot/,
  );
  assert.throws(
    () => parseLock(lock({ "node_modules/@scope": pkg("1") })),
    /invalid installation slot/,
  );
  assert.throws(
    () => parseLock(lock({ [path("a")]: { version: 1 } })),
    /version must be a string/,
  );
  assert.throws(
    () => parseLock(lock({ [path("a")]: { dependencies: [] } })),
    /dependencies must be an object/,
  );
  assert.throws(() => parseLock(" ".repeat(LIMITS.bytes + 1)), /10 MiB/);
  assert.throws(
    () => parseLock("界".repeat(Math.ceil(LIMITS.bytes / 3) + 1)),
    /10 MiB/,
  );
  assert.throws(() => compareLocks({}, {}), /parseLock results/);
});

test("enforces a 20,000-entry limit before graph construction", () => {
  const packages = {};
  for (let i = 0; i < LIMITS.packages + 1; i++)
    packages[path(`p${i}`)] = { version: "1.0.0" };
  assert.throws(() => parseLock(lock(packages)), /20,000/);
  assert.throws(
    () => parseLock(JSON.stringify({ lockfileVersion: 3, packages })),
    /20,000/,
  );
});

test("Markdown escapes untrusted names, versions, HTML, pipes and line breaks", () => {
  const report = analyze(
    lock(),
    lock(
      {
        [path("a")]: {
          version: "<img src=x onerror=alert(1)>|\n**x**",
          name: "[evil](https://evil.example)",
        },
      },
      { dependencies: { a: "*" } },
      { name: "<script>alert(1)</script>" },
    ),
  );
  const output = toMarkdown(report);
  assert.ok(!output.includes("<script>"));
  assert.ok(!output.includes("<img"));
  assert.ok(!output.includes("[evil](https://evil.example)"));
  assert.match(output, /\\\|/);
  assert.match(output, /&lt;script/);
  assert.equal(output, toMarkdown(report));
});

test("removed risky flags do not produce new install-script signals", () => {
  const report = analyze(
    lock({ [path("a")]: pkg("1.0.0", { hasInstallScript: true }) }),
    lock({ [path("a")]: pkg("1.0.0") }),
  );
  assert.equal(report.summary.signals, 0);
});

test("root declaration changes remain visible when installed packages stay identical", () => {
  const packages = { [path("a")]: pkg("1.0.0"), [path("b")]: pkg("1.0.0") };
  const report = analyze(
    lock(packages, { dependencies: { a: "^1.0.0", b: "*" } }),
    lock(packages, { devDependencies: { a: "~1.0.0" } }),
  );
  assert.equal(report.summary.changed, 0);
  assert.equal(report.rootChanges.length, 2);
  assert.deepEqual(
    report.rootChanges.map((root) => [root.name, root.status]),
    [
      ["a", "updated"],
      ["b", "removed"],
    ],
  );
  assert.equal(
    report.roots.find((root) => root.name === "a").beforeKind,
    "production",
  );
  assert.equal(
    report.roots.find((root) => root.name === "a").afterKind,
    "development",
  );
  assert.ok(
    report.warnings.some((warning) =>
      warning.includes("2 root dependency declarations changed"),
    ),
  );
  assert.match(toMarkdown(report), /Root dependency declaration changes/);
});

test("bounds duplicated chain output for long graphs while preserving changes and reachability", () => {
  const before = {},
    after = {};
  for (let i = 0; i < 400; i++) {
    const dependencies =
      i < 399 ? { [`p${String(i + 1).padStart(3, "0")}`]: "*" } : {};
    const name = `p${String(i).padStart(3, "0")}`;
    before[path(name)] = pkg("1.0.0", { dependencies });
    after[path(name)] = pkg("1.0.1", { dependencies });
  }
  const root = { dependencies: { p000: "*" } };
  const report = analyze(lock(before, root), lock(after, root));
  assert.equal(report.summary.updated, 400);
  assert.equal(report.chainsComplete, false);
  assert.equal(report.attributionComplete, true);
  assert.ok(report.changes.some((change) => change.afterChainOmitted));
  assert.ok(report.changes.every((change) => change.roots.includes("p000")));
  assert.ok(
    report.changes.reduce(
      (count, change) =>
        count + change.beforeChain.length + change.afterChain.length,
      0,
    ) <= LIMITS.chainSegments,
  );
  assert.match(toMarkdown(report), /Chain omitted to keep report size bounded/);
});
