# Lockray

**锁文件变了。看清哪些依赖树也跟着变了。**

[English](README.md) · [模型与边界](docs/MODEL.md) · [产品与发布计划](docs/PRODUCT.md) · [参与贡献](CONTRIBUTING.md)

Lockray 比较两个 npm `package-lock.json`，把冗长的 JSON diff 变成可探索的审查工作台。按能够到达变动包的直接依赖分组，点击一项变化，查看它在前后两棵锁定依赖树中的最短路径。

它可以在浏览器或终端本地运行。**分析锁文件不需要账户、API Key、查询 registry 或安装文件中描述的依赖。** Lockray 不会执行输入包中的代码。

![Lockray 工作台展示合成的前后依赖树](docs/images/workbench.png)

*截图使用合成包。计数单位是安装位置，同一个包名的多个副本可能分别计数。*

## 把一次依赖升级放回上下文

直接依赖的一次升级，可能改动许多间接依赖。普通 diff 能告诉你字段变了；Lockray 帮你沿着记录中的关系继续追踪：

```text
之前：项目 → build-kit@2.4.0 → parser@1.8.0
之后：项目 → build-kit@3.0.0 → parser@2.0.0
```

- **从直接依赖开始。** 把变化的安装位置归入前后任一快照中能够到达它的直接依赖。
- **跟着证据看。** 查看从项目根开始的一条最短路径、确切安装位置，以及前后字段。
- **分清版本和元数据。** 检查新增、删除、版本变化，以及来源、完整性、安装脚本标记和依赖元数据变化。
- **单独看根依赖声明。** 即使安装版本没变，范围字符串和依赖类别的变化也会单独记录。
- **发现需要人工检查的信号。** 来源域名变化、新记录的安装脚本和完整性变化都值得结合上下文审查。它们不是漏洞结论，也不代表包具有恶意。
- **带到 PR 里讨论。** 浏览器与 CLI 都能导出 Markdown 报告或结构化 JSON。
- **输入留在本地。** 分析没有上传接口、遥测、远程字体或 registry 查询；浏览器输入仅保存在当前标签页内存中。

这是一个**锁定依赖树可达性工具**。依赖路径说明两份快照中条目的连接关系，不能证明 npm 求解器为什么选择某个版本、业务代码是否使用了这个包，或某项改动是否导致故障。

## 本地运行

需要 **Node.js 22 或更新版本**。在本仓库目录中运行：

```sh
npm start
```

打开终端打印的本地回环地址。不需要先执行 `npm install`。你可以加载内置合成示例，或分别加载之前、之后的 `package-lock.json`。

1. 比较两份快照，查看整体变化数量。
2. 选择一个直接依赖，聚焦能够从它到达的变化。
3. 点击一个变动包，比较它的字段和前后最短路径。
4. 结合上下文检查信号，再下载 Markdown 或 JSON 报告。

浏览器应用是静态站点，可以构建后部署到静态 HTTP 托管服务：

```sh
npm test
npm run build
npm run package:release
```

静态构建写入 `dist/`。发布打包需要 Git 和已有提交：它从**已提交的 HEAD** 生成可复现的源码和静态站点 ZIP，不包含尚未提交的修改；压缩包与 `SHA256SUMS.txt` 写入 `releases/v0.1.0/`。替换已有发布文件使用 `npm run package:release -- --force`。模块加载需要 HTTP 或 HTTPS；不支持通过 `file://` 直接打开 `index.html`。

## 命令行

把两个版本的锁文件保存在本地，然后比较：

```sh
# 先试试内置合成文件对。
node bin/lockray.js samples/before.package-lock.json samples/after.package-lock.json

node bin/lockray.js before-package-lock.json after-package-lock.json

node bin/lockray.js before-package-lock.json after-package-lock.json \
  --format markdown --output dependency-review.md

node bin/lockray.js before-package-lock.json after-package-lock.json \
  --format json --output dependency-review.json

node bin/lockray.js --help
```

| 参数 | 用途 |
| --- | --- |
| `--format markdown\|json` | 报告格式，默认为 Markdown |
| `--output <path>` | 把报告写入文件，而不是标准输出 |
| `--force` | 允许替换已经存在的报告文件 |
| `--fail-on-signals` | 比较结果含审查信号时，返回非零退出码 |
| `--help` | 显示可用参数 |
| `--version` | 显示版本 |

CLI 读取这两个文件，不会下载 tarball 或调用 npm。覆盖已有输出需要 `--force`，不允许把源输入作为输出目标，包括符号链接和硬链接别名。退出码：`0` 表示成功，`1` 表示启用 `--fail-on-signals` 后检测到审查信号，`2` 表示输入或 I/O 错误。把信号接入 CI 策略前，请先完整检查报告：正常的依赖更新也会产生这些信号。

Lockray 目前没有发布到 npm，请使用上面的仓库命令运行。

## 模型覆盖范围

| 输入或问题 | v0.1 范围 |
| --- | --- |
| npm 锁文件版本 | `lockfileVersion: 2` 或 `3`，包含 `packages` 映射；根条目用于直接依赖解释 |
| 比较时的包身份 | 确切的安装位置，例如 `node_modules/a/node_modules/b` |
| 依赖归属 | 从根依赖声明出发，在记录中建立可达关系 |
| 路径解释 | 每份快照中一条受支持的最短依赖路径 |
| 来源和脚本审查 | 只检查锁文件元数据，不下载制品、不读取脚本 |
| 其他锁文件 | 不支持 npm v1、Yarn、pnpm、Bun 或其他生态 |

同一个变动位置可能被多个直接依赖到达，因此分组会重叠，不能把每组数字相加作为项目总数。显示的是从任一根依赖出发的一条最短路径，不代表全部路径，起点也可能不同于当前选择的分组。安装位置发生变化时，会报告为新增和删除，Lockray 不会猜测它是不是“迁移”。

每份输入最多 **10 MiB**，支持最多 **20,000 个非根包条目**、**100,000 条声明依赖边**。每份快照的全根依赖归属计算设有 **100,000 次关系处理预算**，达到上限时分组可能不完整。整个报告的路径输出另有 **50,000 个路径节点或 4,000,000 字符预算**，超出后的路径明确标为省略，不代表对应包不可达。缺少根条目的输入可以比较安装位置，但无法提供根依赖路径。这些情况会显示覆盖说明。

分析是一个有明确边界的锁文件元数据模型，不是 npm Arborist，也不是完整的安装过程。workspace、link、alias、可选依赖和 peer 关系有额外限制。找不到路径可能说明关系不在受支持的模型中。详见[模型说明](docs/MODEL.md)。

Lockray 不查询漏洞库、不检查 tarball 内容、不验证 registry 所有权、不估算 bundle 体积，也不判断运行时可达性。`hasInstallScript` 只记录脚本是否存在，不描述脚本内容。`integrity` 只是声明的摘要，本工具不下载字节进行验证。npm registry 主机名还可能是当前配置 registry 的占位表示。

## 隐私与导出

输入与派生图留在浏览器内存，清空或刷新页面后丢弃。应用没有分析后端和遥测。加载页面仍会正常请求应用文件和内置样例；托管服务与浏览器扩展具有各自的行为。

**报告不会自动匿名化。** 包名、安装位置、版本、registry URL 和其他元数据可能暴露内部项目。如果输入中的来源 URL 含凭据，导出也可能包含。分享前检查报告，公开 issue 请使用合成数据。详见 [SECURITY.md](SECURITY.md)。

## 相关工具

| 工具 | 主要用途 | Lockray 与它的侧重点 |
| --- | --- | --- |
| [LockSignal](https://github.com/aminhanifm/LockSignal) | 本地 npm 锁文件比较、审查信号、字段证据、浏览器与 CLI 报告 | 聚焦以直接依赖为根的可达分组，以及前后最短路径 |
| [lockdiff](https://github.com/root-Manas/lockdiff) | CLI 比较 npm 安装位置和审查元数据 | 提供交互式浏览器工作台探索 diff 背后的关系 |
| [npm-diff](https://github.com/marketplace/actions/npm-diff) | 在 GitHub Actions 中生成锁文件摘要 | 拿到两个文件即可在本地审查，不必连接仓库或运行 Action |
| [`npm explain`](https://docs.npmjs.com/cli/commands/npm-explain/) | 解释项目已经安装的依赖树 | 无需安装任何一棵树，即可比较两份保存的锁文件快照 |

这些都是独立项目。Lockray 没有打包它们的实现，也不能替代漏洞扫描器或包管理器。

欢迎贡献可复现的最小锁文件样例、有 npm 行为依据的路径解析修正、更清楚的说明和无障碍改进。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

MIT © 2026 Songxin Qu，详见 [LICENSE](LICENSE)。
