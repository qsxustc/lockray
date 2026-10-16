/** Offline package-lock comparison. This module also runs directly in browsers. */
export const LIMITS = Object.freeze({
  bytes: 10 * 1024 * 1024,
  packages: 20_000,
  edges: 100_000,
  attributions: 100_000,
  chainSegments: 50_000,
  chainCharacters: 4_000_000,
});

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const textValue = (value) => (typeof value === "string" ? value : "");
const installed = (path) => /(?:^|\/)node_modules\//.test(path);
const outsideTarget = (path) =>
  path === ".." ||
  path.startsWith("../") ||
  path.startsWith("/") ||
  path.startsWith("\\") ||
  /^[A-Za-z]:[\\/]/.test(path);
const packageName = (path) =>
  /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)$/.exec(path)?.[1] || "";
const dependencyName = (name) =>
  /^(?:@[^/@\s\\]+\/)?[^/@\s\\]+$/.test(name) && name !== "." && name !== "..";

function fail(label, message) {
  throw new Error(`${label}: ${message}`);
}

function dependencyMap(entry, field, label) {
  if (!own(entry, field)) return {};
  const map = entry[field];
  if (!record(map)) fail(label, `${field} must be an object.`);
  for (const [name, range] of Object.entries(map)) {
    if (!dependencyName(name) || typeof range !== "string")
      fail(label, `${field} contains an invalid dependency.`);
  }
  return map;
}

/** Parse npm lockfile v2/v3. packages contains installed slots, including links. */
export function parseLock(text, { label = "Lockfile" } = {}) {
  if (typeof text !== "string") fail(label, "expected JSON text.");
  if (
    text.length > LIMITS.bytes ||
    new TextEncoder().encode(text).byteLength > LIMITS.bytes
  )
    fail(label, "exceeds the 10 MiB input limit.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail(label, "invalid JSON.");
  }
  if (!record(data)) fail(label, "expected a JSON object.");
  if (data.lockfileVersion !== 2 && data.lockfileVersion !== 3)
    fail(label, "only npm package-lock versions 2 and 3 are supported.");
  if (!record(data.packages)) fail(label, "a packages object is required.");
  const entries = Object.entries(data.packages);
  const packageEntryCount = entries.length - (own(data.packages, "") ? 1 : 0);
  if (packageEntryCount > LIMITS.packages)
    fail(label, "exceeds the 20,000 non-root package-entry limit.");
  const warnings = [];
  const root = own(data.packages, "") ? data.packages[""] : {};
  if (!record(root)) fail(label, "the root package entry must be an object.");
  if (!own(data.packages, ""))
    warnings.push(
      "No root package entry: direct dependencies and dependency chains are unavailable.",
    );
  const packages = Object.create(null);
  let workspaceTargets = 0;
  let links = 0;
  let edgeCount = 0;
  for (const [path, entry] of entries) {
    if (path === "") continue;
    if (!record(entry))
      fail(label, `package entry ${JSON.stringify(path)} must be an object.`);
    // npm records sibling file/link targets as ../foo and may include their own
    // node_modules entries. These are opaque metadata, never project slots or
    // paths to read from the filesystem.
    if (outsideTarget(path) || !installed(path)) {
      workspaceTargets++;
      continue;
    }
    if (
      !path ||
      path.length > 4096 ||
      path.includes("\\") ||
      path.startsWith("/") ||
      path.split("/").some((part) => !part || part === "." || part === "..")
    )
      fail(
        label,
        `invalid package path ${JSON.stringify(path.slice(0, 100))}.`,
      );
    const slotName = packageName(path);
    if (!dependencyName(slotName))
      fail(label, `invalid installation slot ${JSON.stringify(path)}.`);
    for (const key of ["name", "version", "resolved", "integrity"]) {
      if (own(entry, key) && typeof entry[key] !== "string")
        fail(label, `${path}.${key} must be a string.`);
    }
    for (const key of [
      "dev",
      "optional",
      "devOptional",
      "hasInstallScript",
      "link",
      "inBundle",
    ]) {
      if (own(entry, key) && typeof entry[key] !== "boolean")
        fail(label, `${path}.${key} must be a boolean.`);
    }
    const dependencies = dependencyMap(entry, "dependencies", label);
    const optionalDependencies = dependencyMap(
      entry,
      "optionalDependencies",
      label,
    );
    const peerDependencies = dependencyMap(entry, "peerDependencies", label);
    if (
      own(entry, "peerDependenciesMeta") &&
      !record(entry.peerDependenciesMeta)
    )
      fail(label, `${path}.peerDependenciesMeta must be an object.`);
    edgeCount +=
      Object.keys(dependencies).length +
      Object.keys(optionalDependencies).length +
      Object.keys(peerDependencies).length;
    if (edgeCount > LIMITS.edges)
      fail(label, "exceeds the 100,000 dependency-edge limit.");
    packages[path] = {
      path,
      name: entry.name || slotName,
      slotName,
      version: textValue(entry.version),
      resolved: textValue(entry.resolved),
      integrity: textValue(entry.integrity),
      dev: entry.dev === true,
      optional: entry.optional === true,
      devOptional: entry.devOptional === true,
      hasInstallScript: entry.hasInstallScript === true,
      link: entry.link === true,
      inBundle: entry.inBundle === true,
      dependencies,
      optionalDependencies,
      peerDependencies,
      peerDependenciesMeta: entry.peerDependenciesMeta || {},
      metadata: entry,
    };
    if (entry.link === true) links++;
  }
  if (workspaceTargets || links)
    warnings.push(
      `Workspace/link limitation: ${workspaceTargets} non-installed target entries and ${links} installed links detected. Links are compared at their installation slots; target contents and dependencies are not expanded.`,
    );
  const rootSpecs = new Map();
  for (const [field, kind] of [
    ["peerDependencies", "peer"],
    ["dependencies", "production"],
    ["optionalDependencies", "optional"],
    ["devDependencies", "development"],
  ]) {
    for (const [name, range] of Object.entries(
      dependencyMap(root, field, label),
    )) {
      // npm Arborist loads root peers, production, optional, then development.
      // Later declarations replace an edge while every original field is retained.
      const declarations = rootSpecs.get(name)?.declarations || [];
      declarations.push({ kind, range });
      rootSpecs.set(name, { name, range, kind, declarations });
    }
  }
  const roots = [...rootSpecs.values()]
    .sort((a, b) => compare(a.name, b.name))
    .map((item) => {
      const path = `node_modules/${item.name}`;
      const exists = own(packages, path);
      const optionalPeer =
        item.kind === "peer" &&
        root.peerDependenciesMeta?.[item.name]?.optional === true;
      if (!exists && item.kind !== "optional" && !optionalPeer)
        warnings.push(
          `Missing direct dependency: ${item.name} (${item.kind}).`,
        );
      return { ...item, path: exists ? path : null };
    });
  return {
    name: textValue(data.name) || textValue(root.name) || "unnamed-project",
    version: textValue(data.version) || textValue(root.version),
    lockfileVersion: data.lockfileVersion,
    packages,
    roots,
    warnings,
    rootMetadata: root,
  };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort(compare)
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

/** Resolve the closest installed package using Node's ascending node_modules search. */
function resolveDependency(packages, from, name) {
  let current = from;
  while (true) {
    if (!current.endsWith("/node_modules") && current !== "node_modules") {
      const candidate = current
        ? `${current}/node_modules/${name}`
        : `node_modules/${name}`;
      if (own(packages, candidate)) return candidate;
    }
    if (!current) return null;
    const slash = current.lastIndexOf("/");
    current = slash === -1 ? "" : current.slice(0, slash);
  }
}

function graph(lock) {
  const edges = new Map();
  const warnings = [];
  let missing = 0;
  for (const pkg of Object.values(lock.packages)) {
    const children = new Set();
    if (!pkg.link) {
      const required = {
        ...pkg.dependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
      };
      for (const name of Object.keys(required).sort(compare)) {
        const target = resolveDependency(lock.packages, pkg.path, name);
        const optional =
          own(pkg.optionalDependencies, name) ||
          pkg.peerDependenciesMeta[name]?.optional === true;
        if (target) children.add(target);
        else if (!optional) {
          missing++;
          if (missing <= 12)
            warnings.push(`Unresolved dependency: ${pkg.path} → ${name}.`);
        }
      }
    }
    edges.set(pkg.path, [...children].sort(compare));
  }
  if (missing > 12)
    warnings.push(
      `${missing - 12} additional unresolved dependency edges were omitted from warnings.`,
    );
  const parent = new Map();
  const nearestRoot = new Map();
  const queue = [];
  for (const root of lock.roots) {
    if (root.path && !parent.has(root.path)) {
      parent.set(root.path, null);
      nearestRoot.set(root.path, root.name);
      queue.push(root.path);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const from = queue[i];
    for (const target of edges.get(from) || []) {
      if (!parent.has(target)) {
        parent.set(target, from);
        nearestRoot.set(target, nearestRoot.get(from));
        queue.push(target);
      }
    }
  }
  // Track all root owners for ordinary graphs, with an explicit work bound for dense input.
  const owners = new Map();
  let attributionCount = 0;
  let truncated = false;
  rootLoop: for (const root of lock.roots) {
    if (!root.path) continue;
    const visited = new Set([root.path]);
    const pending = [root.path];
    for (let i = 0; i < pending.length; i++) {
      const path = pending[i];
      if (++attributionCount > LIMITS.attributions) {
        truncated = true;
        break rootLoop;
      }
      if (!owners.has(path)) owners.set(path, new Set());
      owners.get(path).add(root.name);
      for (const child of edges.get(path) || [])
        if (!visited.has(child)) {
          visited.add(child);
          pending.push(child);
        }
    }
  }
  if (truncated) {
    // The shortest-path owner remains complete even when all-owner expansion is bounded.
    for (const [path, name] of nearestRoot) {
      if (!owners.has(path)) owners.set(path, new Set());
      owners.get(path).add(name);
    }
    warnings.push(
      "Root attribution reached the 100,000 relationship limit. Root lists and impact counts may be incomplete; shortest-path resolution is unaffected.",
    );
  }
  const orphanCount = Object.keys(lock.packages).length - parent.size;
  if (orphanCount)
    warnings.push(
      `${orphanCount} installed package${orphanCount === 1 ? "" : "s"} cannot be reached from recorded root dependencies; dependency chains are unavailable for those slots.`,
    );
  return { parent, owners, warnings, truncated };
}

function chain(lock, graphData, path, budget) {
  if (!graphData.parent.has(path)) return { items: [], omitted: false };
  if (budget.exhausted) return { items: [], omitted: true };
  const items = [];
  let characters = 0;
  let current = path;
  while (current !== null) {
    const pkg = lock.packages[current];
    characters += pkg.name.length + pkg.version.length + current.length;
    if (
      budget.segments + items.length + 1 > LIMITS.chainSegments ||
      budget.characters + characters > LIMITS.chainCharacters
    ) {
      budget.exhausted = true;
      return { items: [], omitted: true };
    }
    items.push({ name: pkg.name, version: pkg.version, path: current });
    current = graphData.parent.get(current);
  }
  budget.segments += items.length;
  budget.characters += characters;
  return { items: items.reverse(), omitted: false };
}

function versionChange(before, after) {
  if (!before) return "added";
  if (!after) return "removed";
  if (before.version === after.version) return "same";
  const pattern = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/;
  const a = pattern.exec(before.version);
  const b = pattern.exec(after.version);
  if (!a || !b) return "changed";
  for (let i = 1; i <= 3; i++) {
    if (Number(a[i]) > Number(b[i])) return "downgrade";
    if (Number(a[i]) < Number(b[i])) return ["major", "minor", "patch"][i - 1];
  }
  if (a[4] !== b[4]) return "prerelease";
  return "build";
}

function source(value) {
  if (!value) return { host: "", protocol: "" };
  try {
    const parsed = new URL(value);
    return {
      host: parsed.hostname.toLowerCase(),
      protocol: parsed.protocol.replace(/:$/, "").toLowerCase(),
    };
  } catch {
    const ssh = /^(?:[^@\s]+@)?([^:/\s]+):(.+)$/.exec(value);
    if (ssh) return { host: ssh[1].toLowerCase(), protocol: "ssh" };
    return { host: "", protocol: "local-or-unknown" };
  }
}

function reviewSignals(before, after) {
  if (!after) return [];
  const signals = [];
  const add = (code, label, detail) => signals.push({ code, label, detail });
  if (after.hasInstallScript && !before?.hasInstallScript)
    add(
      "install-script-added",
      "Install script added",
      "The lockfile now records hasInstallScript. Review lifecycle code before installing.",
    );
  if (before) {
    const oldSource = source(before.resolved);
    const newSource = source(after.resolved);
    if (oldSource.host !== newSource.host)
      add(
        "source-host-changed",
        "Source host changed",
        `${oldSource.host || "(no host recorded)"} → ${newSource.host || "(no host recorded)"}.`,
      );
    if (oldSource.protocol !== newSource.protocol)
      add(
        "source-protocol-changed",
        "Source protocol changed",
        `${oldSource.protocol || "(not recorded)"} → ${newSource.protocol || "(not recorded)"}.`,
      );
    if (
      before.version === after.version &&
      before.integrity &&
      after.integrity &&
      before.integrity !== after.integrity
    )
      add(
        "integrity-changed-same-version",
        "Same version, different integrity",
        "The recorded version is unchanged but the integrity value differs. Verify why the artifact changed.",
      );
  }
  if (!after.integrity && !after.link && (!after.inBundle || before?.integrity))
    add(
      "integrity-missing",
      "Integrity not recorded",
      "No integrity value is recorded. Local, Git, or bundled entries may legitimately omit it.",
    );
  return signals;
}

/** Compare parsed locks at exact installation paths, never flattening package names. */
export function compareLocks(before, after) {
  if (
    !record(before?.packages) ||
    !record(after?.packages) ||
    !Array.isArray(before.roots) ||
    !Array.isArray(after.roots)
  )
    throw new Error("compareLocks expects two parseLock results.");
  const oldGraph = graph(before);
  const newGraph = graph(after);
  const chainBudget = { segments: 0, characters: 0, exhausted: false };
  const paths = [
    ...new Set([
      ...Object.keys(before.packages),
      ...Object.keys(after.packages),
    ]),
  ].sort(compare);
  const summary = {
    before: Object.keys(before.packages).length,
    after: Object.keys(after.packages).length,
    added: 0,
    removed: 0,
    updated: 0,
    metadata: 0,
    unchanged: 0,
    changed: 0,
    signals: 0,
    signalCount: 0,
  };
  const rootMap = new Map();
  for (const root of [...before.roots, ...after.roots]) {
    if (!rootMap.has(root.name))
      rootMap.set(root.name, {
        name: root.name,
        path: root.path,
        changed: 0,
        added: 0,
        removed: 0,
        updated: 0,
        metadata: 0,
      });
    else if (root.path) rootMap.get(root.name).path = root.path;
  }
  const oldRoots = new Map(before.roots.map((root) => [root.name, root]));
  const newRoots = new Map(after.roots.map((root) => [root.name, root]));
  const rootChanges = [];
  for (const name of [...rootMap.keys()].sort(compare)) {
    const oldRoot = oldRoots.get(name) || null;
    const newRoot = newRoots.get(name) || null;
    if (
      !oldRoot ||
      !newRoot ||
      oldRoot.range !== newRoot.range ||
      oldRoot.kind !== newRoot.kind ||
      stable(oldRoot.declarations) !== stable(newRoot.declarations)
    ) {
      rootChanges.push({
        name,
        status: !oldRoot ? "added" : !newRoot ? "removed" : "updated",
        before: oldRoot,
        after: newRoot,
      });
    }
    const row = rootMap.get(name);
    row.beforeRange = oldRoot?.range ?? null;
    row.afterRange = newRoot?.range ?? null;
    row.beforeKind = oldRoot?.kind ?? null;
    row.afterKind = newRoot?.kind ?? null;
    row.beforeDeclarations = oldRoot?.declarations ?? [];
    row.afterDeclarations = newRoot?.declarations ?? [];
    row.declarationChange =
      rootChanges.at(-1)?.name === name ? rootChanges.at(-1).status : null;
  }
  const directPaths = new Set(
    [...before.roots, ...after.roots].map((root) => root.path).filter(Boolean),
  );
  const changes = [];
  let bundledIntegritySkipped = 0;
  for (const path of paths) {
    const oldPackage = before.packages[path] || null;
    const newPackage = after.packages[path] || null;
    let status;
    if (!oldPackage) status = "added";
    else if (!newPackage) status = "removed";
    else if (stable(oldPackage.metadata) === stable(newPackage.metadata)) {
      summary.unchanged++;
      continue;
    } else
      status =
        oldPackage.version !== newPackage.version ? "updated" : "metadata";
    const signals = reviewSignals(oldPackage, newPackage);
    if (
      newPackage?.inBundle &&
      !newPackage.integrity &&
      !newPackage.link &&
      !oldPackage?.integrity
    )
      bundledIntegritySkipped++;
    const roots = [
      ...new Set([
        ...(oldGraph.owners.get(path) || []),
        ...(newGraph.owners.get(path) || []),
      ]),
    ].sort(compare);
    for (const name of roots) {
      const root = rootMap.get(name);
      if (root) {
        root.changed++;
        root[status]++;
      }
    }
    const beforeChain = oldPackage
      ? chain(before, oldGraph, path, chainBudget)
      : { items: [], omitted: false };
    const afterChain = newPackage
      ? chain(after, newGraph, path, chainBudget)
      : { items: [], omitted: false };
    changes.push({
      id: path,
      path,
      name: (newPackage || oldPackage).name,
      status,
      before: oldPackage,
      after: newPackage,
      versionChange: versionChange(oldPackage, newPackage),
      signals,
      beforeChain: beforeChain.items,
      afterChain: afterChain.items,
      beforeChainOmitted: beforeChain.omitted,
      afterChainOmitted: afterChain.omitted,
      roots,
      direct: directPaths.has(path),
    });
    summary[status]++;
    summary.changed++;
    if (signals.length) summary.signals++;
    summary.signalCount += signals.length;
  }
  const warnings = [
    ...new Set([
      ...before.warnings.map((warning) => `Before: ${warning}`),
      ...after.warnings.map((warning) => `After: ${warning}`),
      ...oldGraph.warnings.map((warning) => `Before: ${warning}`),
      ...newGraph.warnings.map((warning) => `After: ${warning}`),
    ]),
  ];
  if (stable(before.rootMetadata) !== stable(after.rootMetadata))
    warnings.push(
      "Root package metadata changed. Summary counts describe installed dependency slots only.",
    );
  if (bundledIntegritySkipped)
    warnings.push(
      `${bundledIntegritySkipped} changed bundled package slot${bundledIntegritySkipped === 1 ? " has" : "s have"} no individual integrity value. Integrity-missing signals were omitted for these entries; package contents and parent package checksums were not verified.`,
    );
  if (rootChanges.length)
    warnings.push(
      `${rootChanges.length} root dependency declaration${rootChanges.length === 1 ? "" : "s"} changed (range, dependency kind, addition, or removal). These declaration changes are recorded separately from installed-slot counts.`,
    );
  if (chainBudget.exhausted)
    warnings.push(
      "Dependency-chain output reached its 50,000-segment or 4,000,000-character budget. Some chains are omitted to bound report size; an omitted chain is not an unreachable package. Root attribution and package-change counts are unaffected.",
    );
  return {
    project: after.name || before.name,
    before: {
      name: before.name,
      version: before.version,
      lockfileVersion: before.lockfileVersion,
    },
    after: {
      name: after.name,
      version: after.version,
      lockfileVersion: after.lockfileVersion,
    },
    summary,
    changes,
    roots: [...rootMap.values()].sort((a, b) => compare(a.name, b.name)),
    rootChanges,
    warnings,
    attributionComplete: !oldGraph.truncated && !newGraph.truncated,
    chainsComplete: !chainBudget.exhausted,
  };
}

export function analyze(beforeText, afterText) {
  return compareLocks(
    parseLock(beforeText, { label: "Before lockfile" }),
    parseLock(afterText, { label: "After lockfile" }),
  );
}

function markdown(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/[\[\]`*_{}()|#!]/g, "\\$&")
    .replace(/[\r\n\u2028\u2029]+/g, " ");
}

/** A deterministic, escaped PR report. Signals are review prompts, not findings. */
export function toMarkdown(report) {
  const s = report.summary;
  const lines = [
    `# Lockray dependency review — ${markdown(report.project)}`,
    "",
    `${s.before} → ${s.after} installed package slots · **${s.changed} changed** · ${s.added} added · ${s.removed} removed · ${s.updated} updated · ${s.metadata} metadata changes`,
    "",
    `**${s.signals} changed packages carry ${s.signalCount} review signals.** These are lockfile heuristics, not vulnerability or malware findings.`,
    "",
  ];
  if (report.changes.length) {
    lines.push(
      "| Package / installation slot | Change | Before | After | Review signals |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const change of report.changes)
      lines.push(
        `| ${markdown(change.name)}<br>${markdown(change.path)} | ${markdown(change.status)} (${markdown(change.versionChange)}) | ${markdown(change.before?.version || "—")} | ${markdown(change.after?.version || "—")} | ${change.signals.map((signal) => markdown(signal.label)).join("; ") || "—"} |`,
      );
    lines.push("", "## Dependency chains", "");
    for (const change of report.changes) {
      lines.push(`**${markdown(change.path)}**`);
      for (const [label, items, exists, omitted] of [
        [
          "Before",
          change.beforeChain,
          change.before,
          change.beforeChainOmitted,
        ],
        ["After", change.afterChain, change.after, change.afterChainOmitted],
      ]) {
        if (exists)
          lines.push(
            `- ${label}: ${omitted ? "Chain omitted to keep report size bounded; see coverage notes." : items.length ? items.map((item) => `${markdown(item.name)}@${markdown(item.version || "?")} (${markdown(item.path)})`).join(" → ") : "No recorded path from a root dependency."}`,
          );
      }
      for (const signal of change.signals)
        lines.push(`- ${markdown(signal.label)}: ${markdown(signal.detail)}`);
      lines.push("");
    }
  } else lines.push("No installed package changes.", "");
  if (report.rootChanges?.length) {
    lines.push(
      "## Root dependency declaration changes",
      "",
      "| Dependency | Declaration change | Before | After |",
      "| --- | --- | --- | --- |",
    );
    for (const root of report.rootChanges) {
      const declaration = (item) => {
        if (!item) return "—";
        if (!item.declarations || item.declarations.length < 2)
          return `${markdown(item.range)} (${markdown(item.kind)})`;
        return item.declarations
          .map(
            (entry) =>
              `${markdown(entry.range)} (${markdown(entry.kind)}${entry.kind === item.kind ? "; effective" : ""})`,
          )
          .join("<br>");
      };
      lines.push(
        `| ${markdown(root.name)} | ${markdown(root.status)} | ${declaration(root.before)} | ${declaration(root.after)} |`,
      );
    }
    lines.push(
      "",
      "Declaration changes are separate from installed-slot changes.",
      "",
    );
  }
  const affectedRoots = report.roots.filter((root) => root.changed);
  if (affectedRoots.length) {
    lines.push(
      "## Root dependency impact",
      "",
      "| Root dependency | Changed slots | Added | Removed | Updated | Metadata |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const root of affectedRoots)
      lines.push(
        `| ${markdown(root.name)} | ${root.changed} | ${root.added} | ${root.removed} | ${root.updated} | ${root.metadata} |`,
      );
    lines.push(
      "",
      "A shared package can affect several roots, so root counts can overlap.",
      "",
    );
  }
  if (report.warnings.length)
    lines.push(
      "## Coverage notes",
      "",
      ...report.warnings.map((warning) => `- ${markdown(warning)}`),
      "",
    );
  lines.push(
    "Generated locally by Lockray. No network requests or package execution.",
  );
  return `${lines.join("\n")}\n`;
}
