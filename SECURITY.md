# Security and privacy

Lockray is a local, read-only reviewer for two npm lockfile snapshots. It is not a vulnerability scanner, a malware detector, an artifact verifier, or a package installer.

## Data flow

The browser reads files you choose, derives a comparison in the current tab, and creates downloads when requested. Input lockfiles and derived graphs are kept in memory. Reloading or clearing the workspace discards them. Lockray has no upload endpoint, remote analysis service, telemetry, external fonts, or registry lookups.

The CLI reads local files and writes a report to stdout or the requested destination. It does not invoke npm, resolve dependencies from a registry, download packages, or run lifecycle scripts. The local development server serves application files; it is not an upload service. Ordinary static hosting requests still reach the hosting provider.

This boundary does not control browser extensions, compromised dependencies in the browser or operating system, screen sharing, terminal history, or hosting logs. Use a browser and device you trust.

## Input and export handling

Treat imported lockfiles as untrusted data. Rendering must use text-safe DOM operations; package names, URLs, metadata, and error messages must never become executable HTML or JavaScript. Analysis is bounded by explicit input and graph limits described in `docs/MODEL.md`.

Reports are **not sanitized or anonymized**. They can disclose private package names, project names, installed locations, version choices, workspace paths, tarball URLs, and credentials embedded in URLs. JSON is intended as a complete structured comparison; Markdown also includes identifying review evidence. Inspect every exported report before sending it to someone else.

The CLI protects existing outputs unless `--force` is supplied and rejects writing over an input. Prefer `--output` over shell redirection: a shell opens redirected files before Lockray can protect your source.

## What a signal establishes

Signals describe lockfile metadata changes. A new `hasInstallScript` flag says an installation script was recorded; it does not reveal the commands. A declared integrity change does not establish tampering. A source-origin change does not establish who controls either host. A missing signal does not establish that a dependency is safe.

Lockray does not verify declared hashes against downloaded bytes, check public advisories, authenticate a registry, or determine which dependencies execute in your application. Keep normal package review and software supply-chain controls in place.

## Report a security issue

For a suspected defect in Lockray itself, use the repository's **Security → Report a vulnerability** feature if private reporting is enabled. If that feature is unavailable, open a minimal public issue describing the affected area and request a private reporting channel; do not include exploit payloads, credentials, personal data, or private lockfiles until a channel is established.

Include the affected version or commit, the relevant browser or Node.js version, a synthetic reproduction, and the expected trust boundary. Examples of relevant defects are executable rendering of imported metadata, an unintended network transfer, input-file overwrite, or unbounded processing outside the stated limits.

The initial supported release line is `0.1.x`. This is a small project without a guaranteed response time. Use the newest released patch and check release notes before processing sensitive data.
