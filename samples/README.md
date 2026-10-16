# Synthetic demo lockfiles

These fixtures describe a fictional app named **paperplane-web**. All package
names, archive URLs, and integrity values are synthetic. The `.example` domains
are placeholders. Do not use these lockfiles to install dependencies.

Load `before.package-lock.json` and `after.package-lock.json` together in Lockray.
Both use the npm lockfile v3 `packages` structure and list six direct dependencies.
The before snapshot contains 25 installed entries; the after snapshot contains 30.

The demo deliberately contains 17 changed installation paths:

- Six version changes, including a major `@paperplane/ui` update and its cascade.
- A changed integrity value for `paperplane-icons` with the same package version.
- A changed archive host for `paperplane-telemetry` with the same package version.
- Two removals and seven additions, including a new `pp-native-renderer` entry
  with `hasInstallScript: true` and an archive URL at `native.paperplane.example`.

The files include scoped package names and a nested `pp-id@2.0.0` installation
alongside the same version at the root. Every declared dependency resolves to an
installed entry. The install-script flag is metadata only: no executable install
script is included in this repository.

These signals help reviewers decide what to inspect. They are not evidence that
the fictional packages are malicious, and the fixtures are not a security audit.
