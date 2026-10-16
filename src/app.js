import { VERSION } from "./version.js";

const $ = (selector) => document.querySelector(selector);
const MAX_BYTES = 10 * 1024 * 1024;
const state = {
  before: null,
  after: null,
  names: {},
  report: null,
  markdown: "",
  root: "",
  status: "all",
  search: "",
  signals: false,
  selected: null,
  sort: "signal",
  limit: 100,
  rootLimit: 100,
  view: "review",
  mode: "demo",
  example: null,
  examples: [],
  worker: null,
  revision: 0,
  reads: { before: 0, after: 0 },
  lang: navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en",
};
const zh = {
  headerCaption: "看清每一次依赖变化",
  local: "本地处理",
  eyebrow: "少翻 DIFF，多看懂一层。",
  title: "看见依赖变化的连锁反应。",
  intro: "锁文件变了。沿着依赖链，追溯到你亲自选择的那个包。",
  introNote: "两个锁文件。<br>一张可以探索的变更地图。",
  before: "更新之前",
  after: "更新之后",
  dropBefore: "拖入基线锁文件，或选择文件",
  dropAfter: "拖入更新后的锁文件，或选择文件",
  choose: "选择文件",
  fileSupport: "npm 锁文件 v2 / v3 · 每个文件 10 MiB · 无需上传",
  paste: "粘贴 JSON",
  tryDemo: "加载示例",
  clear: "清空",
  changeMap: "依赖变更地图",
  synthetic: "虚构示例数据",
  explore: "探索",
  report: "报告",
  export: "导出审查报告",
  rootHeading: "直接依赖",
  rootCopy: "从这些包可以到达哪些变更。",
  rootFootnote: "共享依赖可能属于多个直接依赖，分组计数不可相加。",
  search: "搜索包名或安装路径…",
  signalsOnly: "只看审查提示",
  package: "包名 / 安装位置",
  versionChange: "版本",
  sort: "排序",
  signalFirst: "审查提示优先",
  nameSort: "名称 A–Z",
  showMore: "再显示 100 项",
  reportTitle: "带着证据去做代码审查。",
  exportNote: "导出包含包名、路径和来源元数据。分享前请先审阅。",
  copy: "复制 Markdown",
  jsonExport: "下载 JSON",
  modelHeading: "分析模型与说明",
  modelCopy:
    "路径表示锁定依赖树中的可达关系，不解释 npm 为什么选择此版本。按安装位置匹配变更；移动的包显示为删除与新增。审查提示不代表漏洞。链接工作区不在路径分析模型内。",
  npmDocs: "npm 锁文件格式文档 ↗",
  howOne: "从变更出发。",
  howOneCopy: "新增、删除、版本与元数据变化，每个安装位置都单独保留。",
  howTwo: "沿着依赖链追溯。",
  howTwoCopy: "选择直接依赖来缩小范围，对比一个包在更新前后的最短依赖路径。",
  howThree: "把证据带进 PR。",
  howThreeCopy:
    "导出可读的 Markdown 审查报告。无需账号、API 密钥或访问包仓库。",
  footer: "开源，在你的设备上，为你所用。",
  pasteTitle: "粘贴锁文件",
  pasteCopy: "粘贴完整的 npm v2 或 v3 锁文件，两个输入框都需要填写。",
  pastePrivacy: "只在此标签页处理，不上传内容。",
  compare: "比较锁文件 →",
  emptyTitle: "每一处变更，都有一条路径。",
  emptyCopy: "选择更新前后的锁文件开始探索，也可以加载虚构示例。",
  allChanges: "全部变更",
  all: "全部",
  added: "新增",
  removed: "删除",
  updated: "版本变化",
  metadata: "元数据",
  changed: "变更位置",
  installed: "个安装位置",
  reviewSignals: "审查提示",
  reviewHint: "有提示的变更，非漏洞结论",
  allLocations: "按安装位置精确比较",
  metadataHint: "项元数据变化",
  rootChanges: "个可达变更",
  unmapped: "未归属的变更",
  noRoot: "没有可解析的根路径",
  visible: "显示",
  of: "/",
  locations: "项变更",
  noResults: "没有符合条件的变更。试试清除搜索或切换筛选条件。",
  noSelection: "选择一项变更，查看依赖路径。",
  direct: "直接依赖",
  transitive: "间接依赖",
  development: "开发依赖",
  runtime: "非纯开发依赖",
  optional: "可选依赖",
  installScript: "包含安装脚本标记",
  location: "安装位置",
  chain: "依赖路径",
  shortest: "最短路径",
  notInBefore: "更新前不存在于该位置。",
  notInAfter: "更新后不再位于该位置。",
  unreachable: "无法在当前支持的模型中建立根路径。",
  sameVersion: "版本未变",
  noVersion: "无版本",
  evidence: "对比锁文件字段",
  noFieldChanges: "未发现支持字段的差异。",
  userFiles: "你的文件",
  pending: "正在分析两份锁文件…",
  read: "正在读取文件…",
  waiting: "再选择另一份锁文件，即可开始比较。",
  timeout: "分析超时。请使用更小的锁文件重试。",
  workerError: "无法完成分析。请重新加载页面或尝试较小的锁文件。",
  sizeError: "文件超过 10 MiB 限制。",
  readError: "无法读取该文件，请重新选择。",
  demoError: "无法加载示例。请检查本地服务器是否正常运行。",
  copied: "Markdown 已复制。",
  copyError: "无法访问剪贴板，请使用导出按钮下载报告。",
  notes: "条说明",
  ready: "比较完成。所有处理都在此标签页内进行。",
  demoHint: "虚构示例 · 不是真实项目数据",
  loadedHint: "已载入 · 点击按钮可以替换",
  exported: "报告已导出。分享前请审阅其中的包名、路径和来源元数据。",
  unchangedTitle: "没有变更，值得放心核对。",
  unchangedCopy: "两个锁文件中的安装位置与包元数据一致。",
  rootOnly: "仅根项目元数据变化不会计入包变更。",
};
const en = {
  allChanges: "All changes",
  all: "All",
  added: "Added",
  removed: "Removed",
  updated: "Version",
  metadata: "Metadata",
  changed: "CHANGED LOCATIONS",
  installed: "installed locations",
  reviewSignals: "REVIEW SIGNALS",
  reviewHint: "Changes to inspect, not verdicts",
  allLocations: "Matched by installed location",
  metadataHint: "metadata-only changes",
  rootChanges: "reachable changes",
  unmapped: "Unattributed",
  noRoot: "No supported root path",
  visible: "Showing",
  of: "of",
  locations: "changes",
  noResults: "No matching changes. Clear your search or try another filter.",
  noSelection: "Select a change to follow its dependency path.",
  direct: "Direct",
  transitive: "Transitive",
  development: "Dev only",
  runtime: "Not dev-only",
  optional: "Optional",
  installScript: "Install-script flag",
  location: "INSTALLED LOCATION",
  chain: "DEPENDENCY PATH",
  shortest: "shortest path",
  notInBefore: "Not installed here in the before snapshot.",
  notInAfter: "No longer installed here in the after snapshot.",
  unreachable: "No root path found within the supported model.",
  sameVersion: "same version",
  noVersion: "unversioned",
  evidence: "Compare lockfile fields",
  noFieldChanges: "No differences in the displayed fields.",
  userFiles: "YOUR FILES",
  pending: "Comparing your two lockfiles…",
  read: "Reading file…",
  waiting: "Choose the other lockfile to start the comparison.",
  timeout: "Analysis took too long. Try a smaller lockfile.",
  workerError:
    "Analysis could not finish. Reload the page or try smaller lockfiles.",
  sizeError: "This file exceeds the 10 MiB limit.",
  readError: "Could not read this file. Please choose it again.",
  demoError:
    "Could not load the example. Check that the local server is running.",
  copied: "Markdown copied to your clipboard.",
  copyError:
    "Clipboard is unavailable. Use Export review to download the report.",
  notes: "notes",
  ready: "Comparison ready. All processing happened in this tab.",
  demoHint: "Synthetic example · not real project data",
  loadedHint: "Loaded · choose a file to replace",
  exported:
    "Report exported. Review package names, paths and source metadata before sharing.",
  unchangedTitle: "No installed-package changes.",
  unchangedCopy:
    "The installed locations and package metadata match across both snapshots.",
  rootOnly:
    "Changes only to root project metadata are not counted as package changes.",
};
const defaults = new Map();
Object.assign(zh, {
  realExamples: "真实升级案例",
  chooseExample: "选择一个公开项目…",
  examplePrivacy: "固定版本的公开快照，仅在选择后加载。",
  realCase: "真实历史案例",
  publicSnapshot: "公开历史快照",
  bundled: "打包附带依赖",
  sourceCommit: "查看上游提交",
  fixtureLicense: "快照许可与来源",
  exampleError: "无法加载此案例。请重试，或选择自己的锁文件。",
});
Object.assign(en, {
  realExamples: "Real upgrade cases",
  chooseExample: "Choose a public project…",
  examplePrivacy: "Pinned public snapshots. Loaded only when selected.",
  realCase: "REAL HISTORY",
  publicSnapshot: "Public historical snapshot",
  bundled: "Bundled dependency",
  sourceCommit: "View upstream commit",
  fixtureLicense: "Fixture license & attribution",
  exampleError:
    "Could not load this case. Try again or choose your own lockfiles.",
});
Object.assign(zh, {
  omittedChain: "该路径因输出预算被省略；详见分析说明。",
  declarationChange: "声明变化",
  chainScope: "展示从任一直接依赖出发的最短路径，可能与当前筛选分组不同。",
  rootMore: "更多直接依赖",
  evidenceLimit: "每个字段仅预览前 1,500 个字符；JSON 导出保留完整值。",
});
Object.assign(en, {
  omittedChain:
    "This path was omitted to keep the report within its output budget. See analysis notes.",
  declarationChange: "declaration changed",
  chainScope:
    "One shortest path from any direct dependency. It may start outside the selected group.",
  rootMore: "More root dependencies",
  evidenceLimit:
    "Field previews show up to 1,500 characters. The JSON export retains full values.",
});
document
  .querySelectorAll("[data-i18n]")
  .forEach((el) => defaults.set(el.dataset.i18n, el.innerHTML));
en.search = $("#search").placeholder;
function t(key) {
  return (
    (state.lang === "zh" ? zh[key] : (en[key] ?? defaults.get(key))) ?? key
  );
}
function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function translate() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  $("#search").placeholder = t("search");
  $("#language").textContent = state.lang === "zh" ? "EN" : "中文";
  renderFileNames();
  renderExamplePicker();
  if (state.report) render();
}
function message(key, error = false) {
  const el = $("#message");
  el.textContent = t(key);
  el.className = `notice${error ? " error" : ""}`;
}
function errorMessage(text) {
  $("#message").textContent = text;
  $("#message").className = "notice error";
}
function stopWorker() {
  if (state.worker) state.worker.terminate();
  state.worker = null;
}
function invalidate() {
  state.revision++;
  stopWorker();
  state.report = null;
  state.markdown = "";
  state.selected = null;
  state.limit = 100;
  $("#workspace").setAttribute("aria-busy", "false");
  $("#project-name").textContent = "";
  $("#result").classList.add("hidden");
  $("#empty").classList.remove("hidden");
  $("#export").disabled = true;
}
function renderFileNames() {
  for (const slot of ["before", "after"]) {
    $(`#${slot}-name`).textContent = state.names[slot] || "package-lock.json";
    $(`#${slot}-hint`).textContent = state[slot]
      ? t(
          state.mode === "demo"
            ? "demoHint"
            : state.mode === "real"
              ? "publicSnapshot"
              : "loadedHint",
        )
      : t(slot === "before" ? "dropBefore" : "dropAfter");
  }
  $("#dataset-label").textContent = t(
    state.mode === "demo"
      ? "synthetic"
      : state.mode === "real"
        ? "realCase"
        : "userFiles",
  );
  renderProvenance();
}
function resetFilters() {
  state.root = "";
  state.status = "all";
  state.search = "";
  state.signals = false;
  state.limit = 100;
  state.rootLimit = 100;
  $("#search").value = "";
  $("#signals-only").checked = false;
}
function prepareUserInput() {
  if (state.mode !== "user") {
    state.before = null;
    state.after = null;
    state.names = {};
    state.reads.before++;
    state.reads.after++;
  }
  state.mode = "user";
  state.example = null;
  invalidate();
  resetFilters();
  renderFileNames();
}
async function loadFile(slot, file) {
  if (!file) return;
  prepareUserInput();
  state[slot] = null;
  delete state.names[slot];
  renderFileNames();
  const token = ++state.reads[slot];
  if (file.size > MAX_BYTES) {
    message("sizeError", true);
    return;
  }
  message("read");
  try {
    const text = await file.text();
    if (token !== state.reads[slot]) return;
    state[slot] = text;
    state.names[slot] = file.name;
    renderFileNames();
    if (state.before !== null && state.after !== null) compare();
    else message("waiting");
  } catch {
    if (token === state.reads[slot]) message("readError", true);
  }
}
function compare() {
  invalidate();
  const id = state.revision;
  $("#workspace").setAttribute("aria-busy", "true");
  message("pending");
  let worker;
  try {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    state.worker = worker;
  } catch {
    $("#workspace").setAttribute("aria-busy", "false");
    message("workerError", true);
    return;
  }
  const timer = setTimeout(() => {
    if (id !== state.revision) return;
    stopWorker();
    $("#workspace").setAttribute("aria-busy", "false");
    message("timeout", true);
  }, 15000);
  worker.onmessage = ({ data }) => {
    if (id !== state.revision || data.id !== id) return;
    clearTimeout(timer);
    stopWorker();
    $("#workspace").setAttribute("aria-busy", "false");
    if (data.error) {
      errorMessage(data.error);
      return;
    }
    state.report = data.report;
    state.markdown = data.markdown;
    state.selected = data.report.changes[0]?.id || null;
    $("#empty").classList.add("hidden");
    $("#result").classList.remove("hidden");
    $("#export").disabled = false;
    $("#message").classList.add("hidden");
    render();
  };
  worker.onerror = () => {
    if (id !== state.revision) return;
    clearTimeout(timer);
    stopWorker();
    $("#workspace").setAttribute("aria-busy", "false");
    message("workerError", true);
  };
  worker.postMessage({ id, before: state.before, after: state.after });
}
async function loadDemo() {
  invalidate();
  const token = state.revision;
  state.reads.before++;
  state.reads.after++;
  message("pending");
  try {
    const responses = await Promise.all(
      ["before", "after"].map((slot) =>
        fetch(new URL(`../samples/${slot}.package-lock.json`, import.meta.url)),
      ),
    );
    if (responses.some((r) => !r.ok)) throw new Error("Sample unavailable");
    const texts = await Promise.all(responses.map((r) => r.text()));
    if (state.revision !== token) return;
    state.before = texts[0];
    state.after = texts[1];
    state.names = {
      before: "before.package-lock.json",
      after: "after.package-lock.json",
    };
    state.mode = "demo";
    state.example = null;
    resetFilters();
    renderFileNames();
    compare();
  } catch {
    if (token === state.revision) {
      message("demoError", true);
      $("#workspace").setAttribute("aria-busy", "false");
    }
  }
}
function renderExamplePicker() {
  const select = $("#real-example");
  select.replaceChildren(new Option(t("chooseExample"), ""));
  for (const item of state.examples)
    select.add(new Option(item.title, item.id));
  select.value = state.example?.id || "";
  select.disabled = !state.examples.length;
}
function renderProvenance() {
  const el = $("#case-provenance");
  el.replaceChildren();
  const item = state.mode === "real" ? state.example : null;
  el.classList.toggle("hidden", !item);
  $("#real-example").value = item?.id || "";
  if (!item) return;
  const source = document.createElement("a");
  source.href = `https://github.com/${item.repository}/commit/${item.afterCommit}`;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = t("sourceCommit") + " ↗";
  const attribution = document.createElement("a");
  attribution.href = new URL("../samples/real/README.md", import.meta.url).href;
  attribution.target = "_blank";
  attribution.rel = "noreferrer";
  attribution.textContent = t("fixtureLicense");
  el.append(
    `${item.repository} · ${item.beforeCommit.slice(0, 7)} → ${item.afterCommit.slice(0, 7)} · `,
    source,
    " · ",
    attribution,
  );
}
async function loadExampleCatalog() {
  try {
    const response = await fetch(
      new URL("../samples/real/manifest.json", import.meta.url),
    );
    if (!response.ok) return;
    const manifest = await response.json();
    state.examples = manifest.cases.filter(
      (item) =>
        /^[a-z0-9-]+$/.test(item.id) &&
        /^[\w.-]+\/[\w.-]+$/.test(item.repository) &&
        /^[a-f0-9]{40}$/.test(item.beforeCommit) &&
        /^[a-f0-9]{40}$/.test(item.afterCommit),
    );
    renderExamplePicker();
  } catch {
    /* The synthetic example and private file import remain available. */
  }
}
async function loadRealExample(id) {
  const item = state.examples.find((example) => example.id === id);
  if (!item) return;
  invalidate();
  const token = state.revision;
  state.reads.before++;
  state.reads.after++;
  // Stop exposing the previous dataset while a new pair is being read.
  state.before = null;
  state.after = null;
  state.names = {};
  state.mode = "real";
  state.example = item;
  resetFilters();
  renderFileNames();
  message("pending");
  try {
    const texts = await Promise.all(
      ["before", "after"].map(async (slot) => {
        const expected = `${item.id}/${slot}.package-lock.json`;
        if (item[slot].file !== expected)
          throw new Error("Unexpected fixture path");
        const response = await fetch(
          new URL(`../samples/real/${expected}`, import.meta.url),
        );
        if (!response.ok) throw new Error("Case unavailable");
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > MAX_BYTES) throw new Error("Oversized fixture");
        const digest = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        if (digest !== item[slot].sha256)
          throw new Error("Fixture digest mismatch");
        return new TextDecoder().decode(bytes);
      }),
    );
    if (token !== state.revision) return;
    state.before = texts[0];
    state.after = texts[1];
    state.names = {
      before: `${item.repository} · ${item.beforeCommit.slice(0, 7)}`,
      after: `${item.repository} · ${item.afterCommit.slice(0, 7)}`,
    };
    renderFileNames();
    compare();
  } catch {
    if (token === state.revision) message("exampleError", true);
  }
}
function stat(label, value, hint, cls = "", extra = "") {
  return `<div class="stat ${cls}"><div class="stat-label">${cls ? `<i class="dot ${cls}"></i>` : ""}${esc(label)}</div><div class="stat-value">${esc(value)}${extra}</div><p class="stat-hint">${esc(hint)}</p></div>`;
}
function renderSummary() {
  const s = state.report.summary;
  $("#summary").innerHTML =
    stat(
      t("changed"),
      s.changed,
      `${s.before} → ${s.after} ${t("installed")}`,
    ) +
    stat(t("added"), s.added, t("allLocations"), "added") +
    stat(t("removed"), s.removed, t("allLocations"), "removed") +
    stat(
      t("updated"),
      s.updated,
      `${s.metadata} ${t("metadataHint")}`,
      "updated",
    ) +
    stat(t("reviewSignals"), s.signals, t("reviewHint"), "signals");
  $("#project-name").textContent =
    state.report.after?.name || state.report.name || "";
}
function rootDeclaration(root, side) {
  const declarations = root[`${side}Declarations`] || [];
  return declarations.length > 1
    ? declarations.map((item) => `${item.kind}: ${item.range}`).join(" · ")
    : root[`${side}Range`] || "—";
}
function renderRoots() {
  const report = state.report;
  const roots = [...report.roots].sort(
    (a, b) => b.changed - a.changed || a.name.localeCompare(b.name),
  );
  const max = Math.max(1, ...roots.map((r) => r.changed));
  let html = `<button type="button" class="root-button root-all ${!state.root ? "active" : ""}" aria-pressed="${!state.root}" data-root=""><span class="root-top"><span class="root-name">${esc(t("allChanges"))}</span><span class="root-count">${report.summary.changed}</span></span></button>`;
  for (const root of roots.slice(0, state.rootLimit)) {
    const bar = ["added", "removed", "updated", "metadata"]
      .map(
        (k) =>
          `<i class="${k}" style="width:${((root[k] || 0) / max) * 100}%"></i>`,
      )
      .join("");
    html += `<button type="button" class="root-button ${state.root === "package:" + root.name ? "active" : ""}" data-root="package:${esc(root.name)}" aria-pressed="${state.root === "package:" + root.name}" title="${esc(root.name)}"><span class="root-top"><span class="root-name">${esc(root.name)}</span><span class="root-count">${root.changed}</span></span><span class="root-bar">${bar}</span><span class="root-sub">${root.changed} ${esc(t("rootChanges"))}${root.declarationChange ? ` · ${esc(t("declarationChange"))}` : ""}</span>${root.declarationChange ? `<span class="root-range">${esc(rootDeclaration(root, "before"))} → ${esc(rootDeclaration(root, "after"))}</span>` : ""}</button>`;
  }
  if (roots.length > state.rootLimit)
    html += `<button type="button" class="root-button" id="root-more">${esc(t("rootMore"))} (${roots.length - state.rootLimit}) ↓</button>`;
  const unmapped = report.changes.filter((c) => !c.roots.length).length;
  if (unmapped)
    html += `<button type="button" class="root-button ${state.root === "__unmapped" ? "active" : ""}" data-root="__unmapped" aria-pressed="${state.root === "__unmapped"}"><span class="root-top"><span class="root-name">${esc(t("unmapped"))}</span><span class="root-count">${unmapped}</span></span><span class="root-sub">${esc(t("noRoot"))}</span></button>`;
  $("#roots").innerHTML = html;
}
function baseChanges() {
  const query = state.search.trim().toLowerCase();
  return state.report.changes.filter(
    (c) =>
      (!state.root ||
        (state.root === "__unmapped"
          ? !c.roots.length
          : c.roots.includes(state.root.slice(8)))) &&
      (!state.signals || c.signals.length) &&
      (!query ||
        `${c.name} ${c.path} ${c.before?.version || ""} ${c.after?.version || ""}`
          .toLowerCase()
          .includes(query)),
  );
}
function filteredChanges() {
  return baseChanges()
    .filter((c) => state.status === "all" || c.status === state.status)
    .sort(
      (a, b) =>
        (state.sort === "signal" ? b.signals.length - a.signals.length : 0) ||
        a.name.localeCompare(b.name) ||
        a.path.localeCompare(b.path),
    );
}
function versionHTML(change, large = false) {
  const before = change.before?.version || "—",
    after = change.after?.version || "—";
  if (change.status === "metadata")
    return `<span>${esc(after)}</span>${large ? "" : `<span class="same">${esc(t("sameVersion"))}</span>`}`;
  return `<span class="version-before">${esc(before)}</span><span class="version-arrow">→</span><span>${esc(after)}</span>`;
}
function renderList() {
  const base = baseChanges();
  $("#filters").innerHTML = ["all", "added", "removed", "updated", "metadata"]
    .map(
      (k) =>
        `<button type="button" class="filter-button ${state.status === k ? "active" : ""}" data-status="${k}" aria-pressed="${state.status === k}">${esc(t(k))}<small>${k === "all" ? base.length : base.filter((c) => c.status === k).length}</small></button>`,
    )
    .join("");
  const changes = filteredChanges();
  if (!changes.some((c) => c.id === state.selected))
    state.selected = changes[0]?.id || null;
  const markers = { added: "+", removed: "−", updated: "↗", metadata: "~" };
  $("#changes").innerHTML = changes.length
    ? changes
        .slice(0, state.limit)
        .map(
          (c) =>
            `<button type="button" class="change-row ${state.selected === c.id ? "active" : ""}" data-change="${esc(c.id)}" aria-pressed="${state.selected === c.id}" title="${esc(c.path)}"><span class="change-main"><span class="change-name"><span class="type-marker ${c.status}" aria-label="${esc(t(c.status))}">${markers[c.status]}</span><span class="name">${esc(c.name)}</span>${c.signals.length ? `<span class="row-signal" title="${esc(t("reviewSignals"))}" aria-label="${esc(t("reviewSignals"))}"></span>` : ""}</span><span class="change-path">${esc(c.path)}</span></span><span class="version-cell">${versionHTML(c)}</span></button>`,
        )
        .join("")
    : `<div class="no-results">${esc(t(state.report.summary.changed ? "noResults" : "unchangedTitle"))}${state.report.summary.changed ? "" : `<p>${esc(t("unchangedCopy"))}</p>`}</div>`;
  $("#visible-count").textContent =
    `${t("visible")} ${Math.min(changes.length, state.limit)} ${t("of")} ${changes.length} ${t("locations")}`;
  $("#show-more").classList.toggle("hidden", changes.length <= state.limit);
  renderDetail();
}
function chainHTML(chain, exists, isBefore, omitted = false) {
  if (omitted) return `<p class="chain-empty">${esc(t("omittedChain"))}</p>`;
  if (!exists)
    return `<p class="chain-empty">${esc(t(isBefore ? "notInBefore" : "notInAfter"))}</p>`;
  if (!chain.length)
    return `<p class="chain-empty">${esc(t("unreachable"))}</p>`;
  return `<ol class="chain-list">${chain.map((node) => `<li title="${esc(node.path)}">${esc(node.name)}<span class="chain-version">${esc(node.version || t("noVersion"))}</span></li>`).join("")}</ol>`;
}
function stable(value) {
  if (value === undefined) return "—";
  if (!value || typeof value !== "object") return String(value);
  const ordered = (val) =>
    Array.isArray(val)
      ? val.map(ordered)
      : val && typeof val === "object"
        ? Object.fromEntries(
            Object.entries(val)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, ordered(v)]),
          )
        : val;
  return JSON.stringify(ordered(value));
}
function renderDetail() {
  const c = state.report.changes.find((c) => c.id === state.selected);
  if (!c) {
    $("#detail").innerHTML =
      `<div class="detail-empty">${esc(t("noSelection"))}</div>`;
    return;
  }
  const pkg = c.after || c.before;
  const oldMeta = c.before?.metadata || {},
    newMeta = c.after?.metadata || {};
  const fields = [
    ...new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)]),
  ].sort();
  const changedFields = fields.filter(
    (k) => stable(oldMeta[k]) !== stable(newMeta[k]),
  );
  const preview = (value) => {
    const text = stable(value);
    return esc(text.length > 1500 ? `${text.slice(0, 1500)}…` : text);
  };
  const evidence = changedFields
    .map(
      (k) =>
        `<tr><th>${esc(k)}</th><td><span class="version-before">− ${preview(oldMeta[k])}</span><br><span>+ ${preview(newMeta[k])}</span></td></tr>`,
    )
    .join("");
  $("#detail").innerHTML =
    `<div class="detail-eyebrow"><span class="detail-tag ${c.status}">${esc(t(c.status))}</span><span class="detail-id">${esc(c.versionChange)}</span></div><h3>${esc(c.name)}</h3><div class="detail-version">${versionHTML(c, true)}</div><div class="detail-chips"><span>${esc(t(c.direct ? "direct" : "transitive"))}</span><span>${esc(t(pkg.dev ? "development" : "runtime"))}</span>${pkg.optional ? `<span>${esc(t("optional"))}</span>` : ""}${pkg.inBundle ? `<span>${esc(t("bundled"))}</span>` : ""}${pkg.hasInstallScript ? `<span>${esc(t("installScript"))}</span>` : ""}</div><div class="detail-location"><h4 class="small-heading">${esc(t("location"))}</h4><div class="location-value">${esc(c.path)}</div></div>${c.signals.map((s) => `<div class="signal-card"><h4>${esc(s.label)}</h4><p>${esc(s.detail)}</p></div>`).join("")}<div class="chain-section"><h4 class="small-heading chain-heading">${esc(t("chain"))}<span class="chain-rule">${esc(t("shortest"))}</span></h4><p class="chain-scope">${esc(t("chainScope"))}</p><div class="chain-sides"><div><div class="chain-label">${esc(t("before"))}</div>${chainHTML(c.beforeChain, !!c.before, true, c.beforeChainOmitted)}</div><div><div class="chain-label">${esc(t("after"))}</div>${chainHTML(c.afterChain, !!c.after, false, c.afterChainOmitted)}</div></div></div><details class="evidence"><summary>${esc(t("evidence"))}</summary><p class="evidence-legend"><span>− ${esc(t("before"))}</span><span>+ ${esc(t("after"))}</span></p>${evidence ? `<table class="evidence-table"><tbody>${evidence}</tbody></table><p class="chain-scope">${esc(t("evidenceLimit"))}</p>` : `<p class="chain-empty">${esc(t("noFieldChanges"))}</p>`}</details>`;
}
function renderView() {
  $("#explorer").classList.toggle("hidden", state.view !== "review");
  $("#report-panel").classList.toggle("hidden", state.view !== "report");
  for (const view of ["review", "report"]) {
    $(`#${view}-view`).classList.toggle("active", state.view === view);
    $(`#${view}-view`).setAttribute(
      "aria-pressed",
      String(state.view === view),
    );
  }
}
function render() {
  renderSummary();
  renderRoots();
  renderList();
  renderView();
  $("#report-preview").textContent = state.markdown;
  $("#warnings").innerHTML = state.report.warnings
    .map((w) => `<li>${esc(w)}</li>`)
    .join("");
  $("#warning-count").textContent = state.report.warnings.length
    ? `${state.report.warnings.length} ${t("notes")}`
    : "";
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  message("exported");
}
$("#language").addEventListener("click", () => {
  state.lang = state.lang === "en" ? "zh" : "en";
  translate();
});
for (const slot of ["before", "after"]) {
  $(`[data-file="${slot}"]`).addEventListener("click", () =>
    $(`#${slot}-file`).click(),
  );
  $(`#${slot}-file`).addEventListener("change", (event) => {
    loadFile(slot, event.target.files[0]);
    event.target.value = "";
  });
  const card = $(`#${slot}-drop`);
  ["dragenter", "dragover"].forEach((type) =>
    card.addEventListener(type, (e) => {
      e.preventDefault();
      card.classList.add("dragover");
    }),
  );
  ["dragleave", "drop"].forEach((type) =>
    card.addEventListener(type, (e) => {
      e.preventDefault();
      card.classList.remove("dragover");
    }),
  );
  card.addEventListener("drop", (e) => loadFile(slot, e.dataTransfer.files[0]));
}
$("#demo").addEventListener("click", loadDemo);
$("#real-example").addEventListener("change", (event) =>
  loadRealExample(event.target.value),
);
$("#empty-demo").addEventListener("click", loadDemo);
$("#clear").addEventListener("click", () => {
  invalidate();
  state.before = null;
  state.after = null;
  state.names = {};
  state.mode = "user";
  state.example = null;
  state.reads.before++;
  state.reads.after++;
  resetFilters();
  renderFileNames();
  $("#message").classList.add("hidden");
  $("#project-name").textContent = "";
});
$("#roots").addEventListener("click", (e) => {
  if (e.target.closest("#root-more")) {
    state.rootLimit += 100;
    renderRoots();
    return;
  }
  const button = e.target.closest("[data-root]");
  if (!button || !state.report) return;
  state.root = button.dataset.root;
  state.limit = 100;
  renderRoots();
  renderList();
});
$("#filters").addEventListener("click", (e) => {
  const button = e.target.closest("[data-status]");
  if (!button || !state.report) return;
  state.status = button.dataset.status;
  state.limit = 100;
  renderList();
});
$("#changes").addEventListener("click", (e) => {
  const button = e.target.closest("[data-change]");
  if (!button || !state.report) return;
  state.selected = button.dataset.change;
  renderList();
});
$("#search").addEventListener("input", (e) => {
  state.search = e.target.value;
  state.limit = 100;
  if (state.report) renderList();
});
$("#signals-only").addEventListener("change", (e) => {
  state.signals = e.target.checked;
  state.limit = 100;
  if (state.report) renderList();
});
$("#sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  if (state.report) renderList();
});
$("#show-more").addEventListener("click", () => {
  state.limit += 100;
  renderList();
});
for (const view of ["review", "report"])
  $(`#${view}-view`).addEventListener("click", () => {
    state.view = view;
    renderView();
  });
$("#export").addEventListener("click", () => {
  if (state.report)
    download(
      state.markdown,
      "lockray-review.md",
      "text/markdown;charset=utf-8",
    );
});
$("#json-export").addEventListener("click", () => {
  if (state.report)
    download(
      JSON.stringify(state.report, null, 2),
      "lockray-review.json",
      "application/json",
    );
});
$("#copy-report").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(state.markdown);
    message("copied");
  } catch {
    message("copyError", true);
  }
});
$("#paste").addEventListener("click", () => {
  $("#paste-before").value = state.mode === "user" ? state.before || "" : "";
  $("#paste-after").value = state.mode === "user" ? state.after || "" : "";
  $("#paste-dialog").showModal();
});
$("#close-dialog").addEventListener("click", () => $("#paste-dialog").close());
$("#paste-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const before = $("#paste-before").value,
    after = $("#paste-after").value;
  if (
    new Blob([before]).size > MAX_BYTES ||
    new Blob([after]).size > MAX_BYTES
  ) {
    $("#paste-dialog").close();
    message("sizeError", true);
    return;
  }
  prepareUserInput();
  state.before = before;
  state.after = after;
  state.names = { before: "pasted-before.json", after: "pasted-after.json" };
  state.reads.before++;
  state.reads.after++;
  renderFileNames();
  $("#paste-dialog").close();
  compare();
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement?.tagName,
    ) &&
    !$("#paste-dialog").open
  ) {
    e.preventDefault();
    $("#search").focus();
  }
});
translate();
$("#app-version").textContent = `v${VERSION}`;
loadDemo();
loadExampleCatalog();
