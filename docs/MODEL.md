# Lockray comparison model

This document describes the v0.1 engine in [`src/core.js`](../src/core.js). The browser and CLI use the same engine. Its output describes relationships recorded in two npm lockfiles; it does not reproduce npm's solver, prove why a version was chosen, or inspect application imports.

## Accepted inputs and limits

Inputs are JSON text with `lockfileVersion` equal to `2` or `3` and a `packages` object. The legacy v2 `dependencies` tree is not used. npm v1, Yarn, pnpm, Bun, and other lockfile formats are rejected.

The root descriptor is `packages[""]`. If it is missing, Lockray emits a warning and can still compare installed locations, but cannot establish root declarations or paths. A present root must be an object. The project name/version use top-level metadata, then the root descriptor as a fallback.

| Limit | Behavior |
| --- | --- |
| Input size | 10 MiB of UTF-8 text per snapshot; oversized input is rejected |
| Package entries | At most 20,000 non-root `packages` entries, with or without a root descriptor; oversized input is rejected |
| Declared dependency edges | At most 100,000 entries across installed descriptors' `dependencies`, `optionalDependencies`, and `peerDependencies`; duplicate names in different fields count separately |
| Root attribution | At most 100,000 visited root/location relationships per snapshot; exceeding this budget produces partial attribution and a warning |
| Exported dependency chains | 50,000 total path segments or 4,000,000 characters across both snapshots' changed-entry paths; later paths are explicitly omitted when a budget is reached |
| Package path length | At most 4,096 characters; malformed paths are rejected |
| Browser analysis time | A 15-second Worker timeout cancels the operation and produces no report; the CLI has no corresponding wall-clock timeout |

Non-installed workspace target descriptors count toward the package-entry limit even though they do not enter the installed graph. Root declarations do not count toward the declared-edge limit. These are processing bounds, not guarantees about runtime or memory on every device.

Descriptors must be objects. Installed slots must end in `node_modules/<name>` or `node_modules/@scope/<name>`. Package paths are relative, use `/`, and cannot contain empty, `.` or `..` components. Known string, boolean, and dependency-map fields are type checked; arbitrary metadata is retained for comparison, not comprehensively validated as npm's schema.

## Installed locations are the comparison identity

The unit of comparison is an exact `packages` key, for example:

```text
node_modules/parser
node_modules/build-kit/node_modules/parser
```

Those are two installed locations even when their names and versions match. No flattening by package name occurs, and matching is case-sensitive string matching. A descriptor's optional `name` is used for display; otherwise the name comes from its installation slot. This allows a slot name and displayed package name to differ, including an npm alias.

| Status | Exact condition at the same installation location |
| --- | --- |
| Added | Present only in the after snapshot |
| Removed | Present only in the before snapshot |
| Updated | Present in both; recorded version strings differ |
| Metadata | Present in both; version strings match but the descriptor differs |
| Unchanged | The complete descriptors are structurally equal |

Structural equality sorts object keys recursively and preserves array order. Formatting and object-key ordering alone do not create a change; array ordering, extra fields, and absent versus explicitly set fields can create metadata changes. The original descriptor is retained in JSON output as `metadata`.

Moving a package from one location to another appears as a removal and an addition. Lockray does not infer a move or claim that those entries are the same installation. Root metadata and non-installed workspace target descriptors are not counted as installed package changes.

The supplementary `versionChange` label compares exact strings that look like `major.minor.patch` with optional prerelease/build suffixes. It labels a numeric decrease as `downgrade`, a numeric increase by its first changed component, and suffix changes as `prerelease` or `build`. It does not implement complete SemVer ordering for prerelease identifiers or evaluate ranges. Other unequal strings are simply `changed`.

## Root declarations

Root dependencies come from `packages[""].dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`. A name declared in several fields becomes one root. The precedence for its category is optional, production, development, then peer. Root names are sorted by JavaScript string comparison.

Each root resolves to the exact top-level slot `node_modules/<declared-name>` when present. If a required root is missing, a warning is emitted. Missing optional roots and root peers marked optional in `peerDependenciesMeta` do not produce that warning. Declared version ranges are retained but are not solved or checked for satisfaction.

A changed slot is labeled `direct` if it is a recorded root's installed location in either snapshot. That label is based on the supplied declarations, not whether an application imports the package. With missing root metadata, direct/transitive attribution is unavailable in the underlying model.

## Constructing dependency edges

For each installed, non-link descriptor, Lockray takes the union of names in `dependencies`, `optionalDependencies`, and `peerDependencies`. Each declared name is looked up using an ascending `node_modules` search over the recorded installed slots.

For example, a dependency named `parser` declared by `node_modules/build-kit/node_modules/compiler` is checked in this order:

```text
node_modules/build-kit/node_modules/compiler/node_modules/parser
node_modules/build-kit/node_modules/parser
node_modules/parser
```

The first recorded candidate wins. A search skips adding another `node_modules` component when the ancestor already ends in `node_modules`. No real filesystem is read. The search ends at the project root; it does not consult global folders, `NODE_PATH`, package maps, package exports, entry files, or symlink realpaths. Its purpose is to approximate the installed-slot relationships using the familiar [Node.js ascending lookup model](https://nodejs.org/api/modules.html#loading-from-node_modules-folders).

Ordinary and optional dependency names use the same lookup when a slot exists. Missing optional names are tolerated. Peer names also use that lookup; Lockray does not reproduce npm's peer placement, conflict solving, or peer-set semantics. A missing peer marked optional in `peerDependenciesMeta` is tolerated. A name marked optional by either optional mechanism suppresses the unresolved warning, including if the same name is also listed as an ordinary dependency.

Missing non-optional edges generate coverage warnings. Up to 12 detailed unresolved-edge warnings are retained per snapshot, followed by an aggregate count for additional misses. Repeated names resolving to the same target form one graph edge. Dependency cycles are permitted; visited sets prevent repeated traversal.

Neither a matching version range nor platform compatibility is checked. A recorded edge does not prove that a package will be installed or executed on the current operating system. `dev`, `optional`, and `devOptional` are recorded npm metadata, not a runtime execution classification.

## Links, workspaces, and aliases

Entries whose paths do not include an installed `node_modules` slot are excluded from the installed graph and diff. Their presence produces a workspace coverage warning. Their content changes do not become package-change rows.

An installed descriptor with `link: true` is compared at its own slot and may be reached as a leaf. Its target descriptor and outgoing target dependencies are not expanded. Lockray does not dereference `resolved`, traverse symlinks, or model workspace realpaths. A changed workspace target with an unchanged link can therefore produce no installed-slot change while still producing a workspace limitation warning.

Alias lookup uses the declared dependency name to locate an installed slot; a descriptor's `name` affects its display name. Alias range strings are not interpreted or validated against the target package. Treat links, workspaces, peers, and unusual install layouts as coverage boundaries rather than a full npm tree reconstruction.

## Shortest paths and deterministic ties

Each snapshot gets an independent breadth-first search starting from all present root slots. Roots enter the queue in sorted root-name order, and outgoing edges are visited in sorted installation-path order. A slot's parent is recorded on the first visit and never replaced.

This produces one path with the fewest graph edges from **any recorded root**. Equal-length alternatives use the deterministic queue order above. It is not a claim about the most important dependency, a causal origin, or all routes to the package. The project root itself is implicit; path arrays start at the first installed root package.

The browser's selected root is a filter on changes, not a request to recompute the shortest chain from that particular root. A shared package selected under root A can have its shortest displayed path start at root B. Before and after paths can also start at different roots. Compare their explicit names and installed locations.

An empty path without an omission flag means the slot was not reachable in the supported graph. Possible reasons include missing root metadata, unsupported workspace expansion, missing recorded dependencies, or an unconnected installed slot. It does not establish that a package is unused.

Path output has a separate shared budget of 50,000 segments and 4,000,000 characters across all changed locations' before/after paths. Character cost is the sum of node names, version strings, and installation paths. Changes are visited in sorted installation-path order, with each before path generated before its after path. If the next path would exceed either budget, that entire path and later reachable paths are omitted rather than partially emitted. JSON sets the affected `beforeChainOmitted` or `afterChainOmitted` flags and `chainsComplete: false`; coverage notes and Markdown identify the omission. A deliberately omitted chain is different from an unreachable location. These output limits do not change package counts, graph reachability, or root attribution.

## Shared ownership and its work budget

Separately from the shortest-path search, Lockray traverses from each root to collect every reachable root/location pair. A changed slot's `roots` is the union of these owners in the before and after snapshots. It can therefore appear in a root group even if only the previous snapshot connects it to that root.

One shared changed location can belong to several groups. Group counts overlap and are not additive. The overall project summary counts each installed location only once.

All-root traversal stops after 100,000 visited relationships in each snapshot. If that happens, attribution already collected is retained, and the owner from each complete shortest-path search is added as a fallback. Coverage notes warn that groups and counts may be incomplete, and JSON sets `attributionComplete: false`. The fallback guarantees a shortest-path owner for every reachable slot; it does not restore all omitted root owners. An attribution budget limit does not change the installed-location diff or the shortest-path search.

## Review signals

Signals are evaluated **only for changed installed locations with an after descriptor**. Unchanged packages and removed packages are not scanned. The default result is a comparison, not a global security audit.

| Signal code | Exact trigger | Important limitation |
| --- | --- | --- |
| `install-script-added` | After has `hasInstallScript: true` and before did not, including a newly added slot | Records script presence only; commands are not in the lockfile |
| `source-host-changed` | A location exists before and after and its parsed source hostname differs | Uses hostname only, not port, path, account, or registry ownership |
| `source-protocol-changed` | A location exists before and after and its parsed source protocol differs | A scheme change is a review prompt, not proof of insecure transport or an attack |
| `integrity-changed-same-version` | Version strings are equal, both integrity strings are nonempty, and they differ | A string comparison; algorithms, digest sets, and artifact bytes are not validated |
| `integrity-missing` | The changed after descriptor has no nonempty integrity value and is not a link | May be legitimate for local, Git, or bundled dependencies; need not be newly missing |

Source extraction first uses the platform `URL` parser, lowercases `hostname` and protocol, and strips the protocol's final colon. If parsing fails, an SCP-like source can be classified as SSH. Other nonempty sources are `local-or-unknown`; an absent source has empty host/protocol. These fallback categories are heuristic. An added package has no previous source and does not generate a source-change signal.

Changing a URL path, credentials, or port on the same hostname and protocol still creates a metadata change but no host/protocol signal. Changing integrity alongside a version update does not create the same-version-integrity signal. A v2/v3 formatting conversion alone creates no signal if installed descriptors remain structurally equal.

The [npm lockfile format documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) defines the underlying fields. The recorded npm registry hostname can stand for the configured registry; it is not proof of the actual origin used during installation. Lockray never fetches a tarball, validates a declared digest, reads lifecycle code, checks advisories, or certifies package safety.

`summary.signals` counts changed locations with one or more signals; `summary.signalCount` counts individual signals. One location can have several signals. The CLI's optional `--fail-on-signals` exit behavior uses the changed-location count, not a severity threshold.

## Root changes, exports, and display scope

The complete root descriptors are compared independently. Any structural difference produces the coverage note **“Root package metadata changed. Summary counts describe installed dependency slots only.”** Root-only changes can therefore coexist with zero installed changes.

The engine also compares the effective root declarations by name, range string, and dependency category. Added, removed, or changed declarations are recorded separately in JSON `rootChanges` and the Markdown declaration table. Each entry includes its effective before/after declaration. The corresponding root group exposes `beforeRange`, `afterRange`, `beforeKind`, `afterKind`, and `declarationChange`. These changes do not increment the installed-location summary. Because duplicate declarations are collapsed using the category precedence described above, this is not a field-by-field copy of every root manifest field. Changes outside the effective declarations generate the general root metadata note but no declaration entry. Lockray does not decide whether ranges agree with the installed versions.

Top-level fields outside the root descriptor and installed `packages` entries do not create installed-change rows. Changes to the lockfile version, project name, or project version remain snapshot metadata rather than package changes.

JSON contains all changed installed descriptors, their original metadata, available paths, root declarations and groups, signals, and coverage notes. It is not a full copy of either source lockfile. Markdown contains the complete changed-location table, available paths, declaration changes, root counts, signals, and notes; it is a review summary rather than every raw descriptor field. Browser filters change the visible list, not the comparison or the exported reports.

The app displays 100 matching rows initially and can reveal more. Display order uses UI sorting and does not change path tie-breaking. Review coverage notes even when the main summary contains zero changes or zero signals. Neither output format anonymizes private names, paths, or source URLs.
