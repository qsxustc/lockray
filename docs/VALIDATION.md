# v0.1.0 validation

The initial release was checked on 2026-10-17 using Node.js 24.18.0 on macOS. The CI workflow also runs the suite on Node.js 22 and 24.

## Automated checks

`npm test` passes 22 tests covering scoped and nested installation slots, hoisted resolution, multiple root owners, separate before/after paths, cycles, optional and peer declarations, links, aliases, key-order stability, arbitrary metadata, source/integrity/script signals, input limits, Markdown escaping, root-only declaration changes, bounded chain output, CLI output formats, exit codes, and input/output overwrite protection (including symlink and hardlink aliases).

`npm run build` succeeds and produces the static app. Relative Markdown links were checked for missing local targets. All referenced local targets exist.

The included synthetic pair produces 25 → 30 installed locations, 17 changed locations: 7 added, 2 removed, 6 version changes, and 2 metadata-only changes. Three changed locations have review signals. The UI root group contains 7 reachable changed locations.

The core was also run against an existing real npm lockfile with 28 installed entries. Comparing the file to itself produced zero changes and no coverage warnings.

## Browser checks

The local app was exercised in the desktop app's Chromium browser:

- Automatic synthetic example load, English/Chinese switching, root filtering, package/path search, change-type filters, and the signals-only toggle.
- Selecting a changed package and inspecting its before/after dependency chain.
- Local file chooser import of both sample lockfiles. Importing the first user file invalidates the demo comparison and disables export until both files are ready.
- Pasting a separate small lockfile pair. Changes in an arbitrary nested metadata field and a removed explicit `false` field appeared in the evidence table.
- A synthetic HTML-like package name rendered as literal text. It created no image element in the detail panel.
- Unsupported lockfile v1 produced a visible error and disabled export. Clear discarded the comparison; loading the example recovered successfully.
- Markdown report preview and a real Markdown download.
- A 390 × 844 viewport had document and body widths of 390 pixels, with no horizontal page overflow. Root cards scroll inside their own region.
- No warning/error console messages were recorded during these flows.

These checks cover the exercised Chromium environment; they are not a claim of exhaustive browser compatibility or a security audit. Workspace/link expansion, range satisfaction, peer placement validation, and artifact contents remain outside the documented model.

## Release tooling

The development server was checked for GET/HEAD behavior, public-resource selection, malformed paths, traversal, external symlink exclusion, and non-read methods. Packaging was checked in a temporary committed repository: both ZIPs passed `unzip` validation, dirty content was excluded, overwrite protection worked, and repeated packaging of the same HEAD produced the same checksums.

Published CI runs, Pages deployment, and release asset links belong in the README only after those remote results have been verified.
