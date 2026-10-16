# Product thesis and launch plan

## The job to be done

A reviewer receives a small dependency PR with a large lockfile diff. They need to understand which installed locations changed, which direct dependency trees can reach those locations, and which recorded fields deserve a closer look before approving the update.

Lockray turns two npm lockfile snapshots into that review workspace. The central interaction is **direct dependency → changed installed location → before/after shortest path → metadata evidence**.

The core claim is locked-tree reachability. It does not claim causal attribution to a package-manager decision, application runtime usage, vulnerability discovery, or malicious-package detection.

## Audience and wedge

The initial audience is maintainers and frontend or Node.js developers reviewing npm dependency changes. A browser demo makes the first useful result available without installing a CLI, connecting a GitHub account, granting a token, or fetching package artifacts.

Many tools already summarize lockfile versions or produce review signals. [LockSignal](https://github.com/aminhanifm/LockSignal) includes a browser and CLI with metadata evidence and reports. [lockdiff](https://github.com/root-Manas/lockdiff) focuses on local CLI review. [npm-diff](https://github.com/marketplace/actions/npm-diff) produces summaries in Actions. Lockray's specific focus is interactive grouping by root dependency reachability and shortest paths in both snapshots.

This is a differentiation hypothesis, not a claim that nobody else implements dependency paths. User feedback should decide whether the combination saves meaningful review time.

## v0.1 release scope

- npm `package-lock.json` v2/v3 with explicit format validation.
- Comparison by installed location, preserving nested copies.
- Added, removed, version-changed, and metadata-only entries.
- Direct-dependency reachability groups with visible overlap semantics.
- One shortest supported root path per snapshot for a selected location.
- Separate root dependency declaration changes, including ranges and dependency categories.
- Explicit metadata review signals with evidence and conservative language.
- Browser workbench and CLI sharing the same deterministic engine.
- Synthetic examples, Markdown/JSON exports, English/Chinese documentation.
- No analysis backend, registry calls, accounts, telemetry, or input execution.

Location changes are additions and removals. v0.1 does not infer package relocation. Other lockfile ecosystems, comprehensive npm solver behavior, vulnerability databases, license compliance, artifact inspection, runtime analysis, and automated remediation are outside this release.

## Public demo story

Start with a synthetic direct dependency major upgrade that changes several transitive installed locations. Show the project total, select the direct dependency, click one transitive change, and compare the two path explanations. Then show a metadata signal and its evidence. Export the Markdown report.

The screenshot and a short recording should demonstrate an actual result. Numbers shown in public material must come from the included fixture and current engine. Label packages and outputs as synthetic. Do not imply a benchmark or real incident.

A concise introduction:

> A lockfile changed. See which dependency trees changed with it. Lockray groups changes by direct dependency and shows shortest before/after paths, entirely on your device.

## Release checklist

1. Run the test suite and static build from a clean source checkout on supported Node.js versions. Validate the packaged source, CLI, and static site.
2. Exercise loading two files, switching examples, filtering, selecting paths, clearing the workspace, malformed input, and both export formats in a browser. Check keyboard interaction and a narrow viewport.
3. Review README promises against the implementation, including input limits, unsupported relationships, output protections, signals, and file names.
4. Create screenshot assets from the synthetic example. Record a short walkthrough of one real interaction sequence.
5. Create the public repository only after inspecting tracked files for credentials and private data. Confirm the repository, license, issue templates, and CI state.
6. Enable GitHub Pages and verify the actual deployed URL and its main flows before adding a live-demo link or badge to the README.
7. Tag `v0.1.0`, publish the tested archives with checksums, and verify the download links. Do not claim an npm release unless the package has actually been published and tested.
8. Publish an honest launch description using the included fixture and model boundaries. Share only where community rules permit; do not send unsolicited messages.

The source repository is public at [qsxustc/lockray](https://github.com/qsxustc/lockray). Initial source commit [`7c157a4`](https://github.com/qsxustc/lockray/commit/7c157a4b91f8fd76efe501953fa9d381fa867b74) passed the 22-test suite and static build on Node.js 22 and 24 in [CI](https://github.com/qsxustc/lockray/actions/runs/38935630469). The [public demo](https://qsxustc.github.io/lockray/) was deployed by the successful [Pages workflow](https://github.com/qsxustc/lockray/actions/runs/38935630435) for that commit and checked in Chromium: the synthetic pair loaded with 25 → 30 installed locations and 17 changes, and before/after chains rendered without console errors. The [v0.1.0 release](https://github.com/qsxustc/lockray/releases/tag/v0.1.0) is published with source ZIP, static-site ZIP, and checksums. Its tagged commit [`69ba814`](https://github.com/qsxustc/lockray/commit/69ba8148417931f939f53a01deb242ecdc12f2d1) passed [tag CI](https://github.com/qsxustc/lockray/actions/runs/38935915793) and the [release workflow](https://github.com/qsxustc/lockray/actions/runs/38935914873). The project has not been published to npm.

## Validate usefulness before expanding scope

Ask early users to bring a dependency PR they found difficult to review. Capture their answer to three questions: Did grouping point to a useful starting place? Did the path explanation match their understanding? Did the report help them decide what to inspect next?

Use public issues and voluntary feedback; there is no application telemetry. Track confirmed correctness bugs, unsupported lockfile cases, accepted contributions, and examples where a reviewer found the tool useful. Repository stars can reflect attention but do not establish product value and cannot be promised.

An initial target is ten documented reviews from several maintainers, with at least three concrete examples of improved understanding. Treat that as a research milestone, not a usage claim.

## Follow-up hypotheses

After the initial model is reliable, evaluate peer/workspace explanations, more complete graph diagnostics, richer root declaration comparison, and a locally generated GitHub Actions summary. Each addition needs an explicit data model and fixtures.

Support for pnpm or Yarn should be a separate model with ecosystem-specific tests. Do not silently flatten them into npm installation semantics. A browser extension or PR integration should preserve inspectable local processing and request only the permissions it needs.

Possible paid team features include organization review policies and private workflow integration. These are unvalidated hypotheses, not shipped capabilities or commitments. The free local browser app and CLI should remain useful independently.

## Quality bar

Prioritize accurate, explainable results over a larger feature count. A clearly unsupported case is better than a plausible but false chain. Signals must remain evidence-based; the UI must not imply that a green screen certifies supply-chain safety. Public assets should make one useful workflow clear without exaggerating implementation coverage.
