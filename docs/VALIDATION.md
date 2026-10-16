# v0.2.0 validation

Checked on 2026-10-17 with Node.js 24.18.0 on macOS. `npm test` passes **48 tests**, including 13 tests over four complete public historical lockfile pairs. `npm run build` produces the static app with the example catalog, original fixture bytes, and full upstream license files. The archived v0.1.0 record below describes that older tag only.

## Real upstream upgrades and independent checks

The [real-case report](REAL-CASES.md) and [immutable fixture manifest](../samples/real/manifest.json) identify each exact upstream update and first parent. The inputs were downloaded as public metadata; no upstream dependency installation, build, or lifecycle script was used.

| Case | Installed before → after | Added | Removed | Updated | Metadata | Total changed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Axios development refresh | 687 → 687 | 0 | 0 | 29 | 0 | 29 |
| Axios tree refresh | 715 → 707 | 29 | 37 | 116 | 5 | 187 |
| Marked npm upgrade | 660 → 660 | 0 | 0 | 24 | 0 | 24 |
| PDF.js jsdoc major upgrade | 965 → 965 | 0 | 0 | 8 | 0 | 8 |

Offline regression tests verify source-file and license SHA-256, compare the entire change set against `util.isDeepStrictEqual` over raw descriptors, check self-comparison and reversed snapshots, and validate all emitted path edges, shortest lengths and root owners against native Node lookup plus an independent BFS.

The optional `scripts/check-npm-edges.js` was also run with the installed npm Arborist **9.7.0**, using only offline `loadVirtual()`. All four before/after inventories, resolution targets, changed-entry shortest paths and root owners matched. The [recorded output](real-cases-npm.json) had no resolution, path or owner differences, no outside-model edges, and complete attribution/path coverage for all four cases. This is evidence for these snapshots and this oracle version, not proof of complete npm solver compatibility.

## Fix verification

- Marked’s nine changed bundled entries without individual integrity values now produce one coverage note and zero missing-integrity signals. Separate regression tests preserve alerts for ordinary missing values, real checksum removal, lifecycle flags and source changes.
- Duplicate root declarations preserve all categories and ranges, follow current npm’s effective precedence, and expose changes to overridden fields without duplicating root ownership. A browser-pasted pair with only an overridden production range change showed zero installed changes and one complete declaration change in both the root panel and Markdown.
- A real offline npm-generated sibling file/link case was reduced to regression fixtures. `../`, `../../` and absolute target metadata stay opaque; links compare as leaves and no external path is read. A browser-pasted sibling pair analyzed successfully while reporting the link coverage boundary. Malformed internal installation locations still fail validation.

## Browser checks

All four catalog cases loaded successfully in Chromium after their SHA-256 checks. The 187-change case initially showed 100 rows, revealed all 187 on demand, and retained the complete comparison in the report. A real JSON download while filtered to a 48-change root group still contained all 187 changes. Package search, root filtering, before/after chains and bundled-dependency badges were exercised. The PDF.js case showed the expected eight changes; Marked showed 24 changes and the nine-entry bundled coverage note.

Switching from a real case to the first user file cleared the opposite example snapshot, provenance and stale project name, with export disabled. Both 390 × 844 and 1280 × 900 viewport checks had no horizontal document overflow. The 43-root Axios case had a 445-pixel scroll region instead of expanding every root down the page. No warning/error console messages were recorded in the exercised flows.

The new workbench screenshot uses the real Axios tree refresh and its `@commitlint/cli` group, not synthetic metrics.

## Verified public deployment and release

The published [v0.2.0 tag](https://github.com/qsxustc/lockray/releases/tag/v0.2.0) points to commit [`3f459771f446c89178220cafd3b93722fb8c0fa9`](https://github.com/qsxustc/lockray/commit/3f459771f446c89178220cafd3b93722fb8c0fa9). The tagged source passed all 48 tests and the static build on both Node.js **22** and **24** in [GitHub CI](https://github.com/qsxustc/lockray/actions/runs/38938022305). The [Pages build and deployment](https://github.com/qsxustc/lockray/actions/runs/38938022346) and [release workflow](https://github.com/qsxustc/lockray/actions/runs/38938022482) completed successfully.

The actual [public workbench](https://qsxustc.github.io/lockray/) was opened in Chromium after deployment. Its footer displayed v0.2.0, the real-case picker contained all four pinned examples, the Axios tree case returned 187 changes (29 added, 37 removed, 116 version changes, 5 metadata changes), and Marked returned 24 changes, zero review signals and the explicit nine-entry bundled-integrity coverage note. Both cases displayed the expected immutable source commit links. This is a deployed-flow check, not an exhaustive replay of every local browser test.

All three release assets were present. GitHub's published archive digests matched archives independently generated locally from the exact release tag; both local ZIPs also passed `unzip -t`:

| Asset | Published SHA-256 |
| --- | --- |
| [lockray-0.2.0-source.zip](https://github.com/qsxustc/lockray/releases/download/v0.2.0/lockray-0.2.0-source.zip) | `8855daf755f895d52b16e014580919300b628f517589cc4b13c1286595d13a55` |
| [lockray-0.2.0-site.zip](https://github.com/qsxustc/lockray/releases/download/v0.2.0/lockray-0.2.0-site.zip) | `1bc97c464bfd307d52df20b870d934a2924f84e6ad6228b96254be6253d0eea5` |
| [SHA256SUMS.txt](https://github.com/qsxustc/lockray/releases/download/v0.2.0/SHA256SUMS.txt) | Contains the two archive digests above |

The release description's documentation links were corrected to absolute GitHub URLs and checked on the published page. This evidence record is a documentation-only follow-up to the immutable tag; it does not replace the tagged archives. The project has not been published to npm.

---

# Archived v0.1.0 validation

The v0.1.0 source candidate was checked on 2026-10-17 using Node.js 24.18.0 on macOS. The source is public at [qsxustc/lockray](https://github.com/qsxustc/lockray). Initial source commit [`7c157a4`](https://github.com/qsxustc/lockray/commit/7c157a4b91f8fd76efe501953fa9d381fa867b74) passed the 22-test suite and static build on both Node.js 22 and 24 in [GitHub Actions](https://github.com/qsxustc/lockray/actions/runs/38935630469).

## Automated checks

At the v0.1.0 tag, `npm test` passed 22 tests covering scoped and nested installation slots, hoisted resolution, multiple root owners, separate before/after paths, cycles, optional and peer declarations, links, aliases, key-order stability, arbitrary metadata, source/integrity/script signals, input limits, Markdown escaping, root-only declaration changes, bounded chain output, CLI output formats, exit codes, and input/output overwrite protection (including symlink and hardlink aliases).

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
