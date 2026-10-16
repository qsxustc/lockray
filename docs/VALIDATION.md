# v0.1.0 validation

The v0.1.0 source candidate was checked on 2026-10-17 using Node.js 24.18.0 on macOS. The source is public at [qsxustc/lockray](https://github.com/qsxustc/lockray). Initial source commit [`7c157a4`](https://github.com/qsxustc/lockray/commit/7c157a4b91f8fd76efe501953fa9d381fa867b74) passed the 22-test suite and static build on both Node.js 22 and 24 in [GitHub Actions](https://github.com/qsxustc/lockray/actions/runs/38935630469).

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

## Public deployment

The initial source commit `7c157a4` was deployed by the successful [GitHub Pages workflow](https://github.com/qsxustc/lockray/actions/runs/38935630435). The actual [public workbench](https://qsxustc.github.io/lockray/) was opened in Chromium and checked independently of the workflow status: the synthetic example automatically loaded 25 → 30 installed locations and 17 changes, before/after dependency chains rendered, and no console errors were reported. This validates the exercised deployed flow; it is not an exhaustive replay of all local checks against the hosted site.

## Release tooling

The development server was checked for GET/HEAD behavior, public-resource selection, malformed paths, traversal, external symlink exclusion, and non-read methods. Packaging was checked in a temporary committed repository: both ZIPs passed `unzip` validation, dirty content was excluded, overwrite protection worked, and repeated packaging of the same HEAD produced the same checksums.

The [v0.1.0 release](https://github.com/qsxustc/lockray/releases/tag/v0.1.0) is published. The successful [release workflow](https://github.com/qsxustc/lockray/actions/runs/38935914873) built from tagged commit [`69ba8148417931f939f53a01deb242ecdc12f2d1`](https://github.com/qsxustc/lockray/commit/69ba8148417931f939f53a01deb242ecdc12f2d1), which also passed [tag CI](https://github.com/qsxustc/lockray/actions/runs/38935915793). All three release assets are present:

| Asset | Published SHA-256 |
| --- | --- |
| [lockray-0.1.0-source.zip](https://github.com/qsxustc/lockray/releases/download/v0.1.0/lockray-0.1.0-source.zip) | `8f1d124ea9990c9defea412ac3d244a1d2248fcc6d33647985b3d27ecb277406` |
| [lockray-0.1.0-site.zip](https://github.com/qsxustc/lockray/releases/download/v0.1.0/lockray-0.1.0-site.zip) | `41eb3317519bc778129dcd17927cc116bf4afdfe8ce6dd383336310aef90b307` |
| [SHA256SUMS.txt](https://github.com/qsxustc/lockray/releases/download/v0.1.0/SHA256SUMS.txt) | Contains the two archive digests above |

The CI, Pages, and GitHub Release publication results above are verified. The project has not been published to npm.
