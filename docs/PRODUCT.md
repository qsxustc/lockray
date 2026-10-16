# Product thesis and launch plan

## The job to be done

A reviewer receives a small dependency PR with a large lockfile diff. They need to understand which installed locations changed, which direct dependency trees can reach those locations, and which recorded fields deserve a closer look before approving the update.

Lockray turns two npm lockfile snapshots into that review workspace. The central interaction is **direct dependency → changed installed location → before/after shortest path → metadata evidence**.

The core claim is locked-tree reachability. It does not claim causal attribution to a package-manager decision, application runtime usage, vulnerability discovery, or malicious-package detection.

## Audience and wedge

The initial audience is maintainers and frontend or Node.js developers reviewing npm dependency changes. A browser demo makes the first useful result available without installing a CLI, connecting a GitHub account, granting a token, or fetching package artifacts.

Many tools already summarize lockfile versions or produce review signals. [LockSignal](https://github.com/aminhanifm/LockSignal) includes a browser and CLI with metadata evidence and reports. [lockdiff](https://github.com/root-Manas/lockdiff) focuses on local CLI review. [npm-diff](https://github.com/marketplace/actions/npm-diff) produces summaries in Actions. Lockray's specific focus is interactive grouping by root dependency reachability and shortest paths in both snapshots.

This is a differentiation hypothesis, not a claim that nobody else implements dependency paths. User feedback should decide whether the combination saves meaningful review time.

## Released v0.2.0 scope

- npm `package-lock.json` v2/v3 with explicit format validation.
- Comparison by installed location, preserving nested copies.
- Added, removed, version-changed, and metadata-only entries.
- Direct-dependency reachability groups with visible overlap semantics.
- One shortest supported root path per snapshot for a selected location.
- Separate root dependency declaration changes, retaining duplicate and overridden declarations.
- Explicit metadata review signals with evidence and conservative language.
- Browser workbench and CLI sharing the same deterministic engine.
- A synthetic example and four unmodified upstream historical updates with pinned hashes and retained licenses.
- Browser case selection, Markdown/JSON exports, English/Chinese documentation, and reproducible offline real-case tests.
- No analysis backend, registry calls, accounts, telemetry, or input execution.

Location changes are additions and removals; Lockray does not infer package relocation. Other lockfile ecosystems, comprehensive npm solver behavior, vulnerability databases, license compliance, artifact inspection, runtime analysis, and automated remediation remain outside the model.

The v0.2 investigation produced three concrete corrections: bundled-integrity noise becomes explicit coverage, duplicate root declarations follow the checked npm precedence while retaining all fields, and sibling-link targets are accepted as opaque metadata without expanding or reading external paths. [The real-case record](REAL-CASES.md) separates original upstream updates from focused npm-shaped regressions and explains the independent checks.

## Public demo story

Start with the real Axios tree refresh: 715 → 707 installed locations and 187 changes. Select a direct dependency, inspect one changed location, compare its shortest paths, and export the Markdown report. Use Marked next to explain why nine bundled entries are now summarized as coverage rather than nine missing-integrity signals. The smaller Axios and PDF.js examples offer shorter demonstrations.

Screenshots and a short recording should show actual results. Numbers must come from the selected fixture and current engine. Label synthetic examples as synthetic and historical upstream examples with their source commits. Do not imply a performance benchmark, security verdict, upstream endorsement, or incident diagnosis.

A concise introduction:

> A lockfile changed. See which dependency trees changed with it. Explore real Axios, Marked, and PDF.js upgrades, follow before/after paths, and reproduce the checks offline.

## Release checklist

1. Run the complete suite, `npm run test:real`, and static build from a clean checkout on supported Node.js versions. Validate packaged source, CLI, and static site, including the retained fixture licenses and hashes.
2. Exercise private file loading, all four real cases, synthetic-example recovery, filters, paths, clear, malformed input, and both exports. Check keyboard interaction and a narrow viewport.
3. Review README promises against the implementation, including input limits, unsupported relationships, output protections, signals, and file names.
4. Capture clearly labeled examples and record one short, useful review sequence.
5. Inspect tracked files for private data and confirm CI before publishing the source update.
6. Verify the deployed v0.2 case picker, including a real-case hash check and provenance links, before describing those new flows as deployed.
7. Tag `v0.2.0`, publish tested archives with checksums, and verify download links before replacing the existing stable-download entry. Do not claim an npm release unless it has actually been published and tested.
8. Publish an honest launch description using the included fixture and model boundaries. Share only where community rules permit; do not send unsolicited messages.

The repository, [public demo](https://qsxustc.github.io/lockray/), and [v0.2.0 release](https://github.com/qsxustc/lockray/releases/tag/v0.2.0) are published with the real-case picker and fixes above. Node.js 22/24 CI, deployed browser checks, release assets and SHA-256 digests are verified in [VALIDATION.md](VALIDATION.md). The project has not been published to npm.

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
