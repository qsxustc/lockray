# Contributing to Lockray

Thank you for helping make dependency reviews easier to understand. Small, reproducible corrections are especially useful.

## Development

Use Node.js 22 or newer. The app, CLI, and tests use Node.js and browser built-ins; there is no dependency installation step.

```sh
npm start
npm test
npm run build
npm run package:release
```

Serve browser modules through HTTP. The development server prints a loopback URL. The build lives in `dist/`; release output lives in `releases/v<version>/`. Packaging requires Git and packages committed HEAD only; uncommitted edits are excluded. Generated files are not the place to make source edits.

## Report a useful issue

Include the Lockray version or commit, Node.js or browser version, expected behavior, actual behavior, and the smallest synthetic before/after lockfile pair that reproduces the issue.

**Do not upload a private lockfile unchanged.** Replace private package names, registry addresses, credentials, workspace paths, and other identifying data. Preserve the dependency structure needed for the reproduction. Lockray does not anonymize reports or inputs.

For a path-resolution issue, include the package's installed location and explain the expected dependency path. If possible, reproduce npm's behavior in a disposable fixture and include the npm version and command used. Do not ask reviewers to install untrusted packages or run unknown lifecycle scripts.

## Keep the model honest

- Treat installed locations as comparison identities. Do not collapse multiple copies into a single package-name entry.
- Distinguish the recorded locked tree from the package manager's reasoning or application runtime behavior.
- Name unsupported relationships and input limits explicitly. A missing path is not proof that a package is unused.
- Explain signals using the exact changed metadata. A signal is a reason to inspect, not a malware verdict or numerical security score.
- Preserve the read-only workflow. Input packages are never installed, executed, or fetched during analysis.
- Keep network-free analysis, no telemetry, and in-memory browser inputs. A feature that needs a service requires an explicit product discussion.
- Keep changes accessible: keyboard navigation, visible focus, useful labels, sufficient contrast, and readable narrow layouts.

## Pull requests

Describe the user-visible problem and resulting behavior. Include validation appropriate to the change. Meaningful parser, graph, signal, and CLI behavior changes should include a minimal fixture and regression test; a text correction does not need an artificial test.

Run `npm test` and `npm run build` before submitting code changes. Check the affected browser flow when changing the UI; screenshots should use synthetic examples. If you change model boundaries, CLI flags, input limits, or export semantics, update both READMEs and `docs/MODEL.md` as appropriate.

Keep new dependencies justified and narrow. Do not add external fonts, CDNs, analytics, registry calls, or cloud processing as incidental implementation details.

Contributions are accepted under the repository's MIT license. Please identify any third-party code or assets and retain their required notices.
