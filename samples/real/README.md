# Public historical lockfile fixtures

These are unchanged, complete upstream npm lockfiles from real dependency-update commits and their first parents. No dependency installation or npm update was used to create them. They are historical review examples, not a recommendation to install those versions. The projects do not endorse Lockray.

The manifest records immutable source commits, original byte lengths, SHA-256 digests, expected installed-slot changes, and retained license files. `npm test` verifies the bytes and compares Lockray against an independent raw-object diff plus native Node lookup. Fixtures stay offline during tests; the browser loads a selected pair from this same static host and checks its SHA-256 before analysis.

| Case | Upstream commit | Installed slots | Added | Removed | Version changes | Metadata changes | License |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Axios · development dependency refresh | [e58cf0e](https://github.com/axios/axios/commit/e58cf0e91f7fe3992f027cb5c131e9068baa900b) | 687 → 687 | 0 | 0 | 29 | 0 | [MIT](axios/LICENSE.md) |
| Axios · 187 changes across the dependency tree | [bdba132](https://github.com/axios/axios/commit/bdba132964d91d2e74341cf0af0a54e4d2346870) | 715 → 707 | 29 | 37 | 116 | 5 | [MIT](axios-tree/LICENSE.md) |
| Marked · npm upgrade with bundled dependencies | [23c82ad](https://github.com/markedjs/marked/commit/23c82ad02bc8723d9a32c41dd23db155a472d37e) | 660 → 660 | 0 | 0 | 24 | 0 | [MIT](marked/LICENSE.md) |
| PDF.js · eslint-plugin-jsdoc major upgrade | [bf5f6ea](https://github.com/mozilla/pdf.js/commit/bf5f6ea4b1b0e689f37dd2dd1b99ad63420537c9) | 965 → 965 | 0 | 0 | 8 | 0 | [Apache-2.0](pdfjs/LICENSE.md) |

## Source and attribution

The Lockray MIT license covers Lockray-authored code. These third-party snapshots retain their upstream licensing and copyright notices. License texts are copied without modification. Marked’s full license also retains the original Markdown BSD-style notice. PDF.js is Apache-2.0; its selected upstream root has no NOTICE file. No package source code, tarballs, lifecycle scripts, credentials, or private project files are included.

### Axios · development dependency refresh

- Repository: [axios/axios](https://github.com/axios/axios)
- Update: [chore(deps-dev): bump the development_dependencies group with 4 updates (#11322)](https://github.com/axios/axios/commit/e58cf0e91f7fe3992f027cb5c131e9068baa900b), 2026-10-14 UTC
- Before: [37041f51f5a4db5f2e8abc0807a978b8daebf6e2](https://github.com/axios/axios/blob/37041f51f5a4db5f2e8abc0807a978b8daebf6e2/package-lock.json)
- After: [e58cf0e91f7fe3992f027cb5c131e9068baa900b](https://github.com/axios/axios/blob/e58cf0e91f7fe3992f027cb5c131e9068baa900b/package-lock.json)
- Original license: [upstream](https://raw.githubusercontent.com/axios/axios/e58cf0e91f7fe3992f027cb5c131e9068baa900b/LICENSE); [retained copy](axios/LICENSE.md)

### Axios · 187 changes across the dependency tree

- Repository: [axios/axios](https://github.com/axios/axios)
- Update: [chore: update packages (#11058)](https://github.com/axios/axios/commit/bdba132964d91d2e74341cf0af0a54e4d2346870), 2026-07-01 UTC
- Before: [7b1825ff0832981f02a7aa6f3995522b0be297ee](https://github.com/axios/axios/blob/7b1825ff0832981f02a7aa6f3995522b0be297ee/package-lock.json)
- After: [bdba132964d91d2e74341cf0af0a54e4d2346870](https://github.com/axios/axios/blob/bdba132964d91d2e74341cf0af0a54e4d2346870/package-lock.json)
- Original license: [upstream](https://raw.githubusercontent.com/axios/axios/bdba132964d91d2e74341cf0af0a54e4d2346870/LICENSE); [retained copy](axios-tree/LICENSE.md)

### Marked · npm upgrade with bundled dependencies

- Repository: [markedjs/marked](https://github.com/markedjs/marked)
- Update: [chore: update deps (#4108)](https://github.com/markedjs/marked/commit/23c82ad02bc8723d9a32c41dd23db155a472d37e), 2026-09-22 UTC
- Before: [1b89557177fe5a7d5d430fdc76e7c8a7c0adf6d7](https://github.com/markedjs/marked/blob/1b89557177fe5a7d5d430fdc76e7c8a7c0adf6d7/package-lock.json)
- After: [23c82ad02bc8723d9a32c41dd23db155a472d37e](https://github.com/markedjs/marked/blob/23c82ad02bc8723d9a32c41dd23db155a472d37e/package-lock.json)
- Original license: [upstream](https://raw.githubusercontent.com/markedjs/marked/23c82ad02bc8723d9a32c41dd23db155a472d37e/LICENSE); [retained copy](marked/LICENSE.md)

### PDF.js · eslint-plugin-jsdoc major upgrade

- Repository: [mozilla/pdf.js](https://github.com/mozilla/pdf.js)
- Update: [Upgrade `eslint-plugin-jsdoc` to version 65.0.2](https://github.com/mozilla/pdf.js/commit/bf5f6ea4b1b0e689f37dd2dd1b99ad63420537c9), 2026-10-03 UTC
- Before: [7dc3cf0421b09d28d388c7fbceb1ab85952c6cd5](https://github.com/mozilla/pdf.js/blob/7dc3cf0421b09d28d388c7fbceb1ab85952c6cd5/package-lock.json)
- After: [bf5f6ea4b1b0e689f37dd2dd1b99ad63420537c9](https://github.com/mozilla/pdf.js/blob/bf5f6ea4b1b0e689f37dd2dd1b99ad63420537c9/package-lock.json)
- Original license: [upstream](https://github.com/mozilla/pdf.js/blob/bf5f6ea4b1b0e689f37dd2dd1b99ad63420537c9/LICENSE); [retained copy](pdfjs/LICENSE.md)
