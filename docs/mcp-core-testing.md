# MCP-02 核心创建入口

状态：2026-10-19，用户已明确验收 MCP-02 并授权继续 MCP-03。已验收的 MCP-01 本地提交：4e70443。

## 交付范围

新增 [ExternalNoteService](../core/external-notes.ts) 和 [共享契约](../shared/external-notes.ts)。服务不依赖 Electron、Angular、Thunderbird 或 MCP SDK，不打开第二个笔记本，不直接写文件，只使用宿主已经持有的 NoteLibrary.create。正文保存、索引、操作去重、编辑锁及变更事件继续由原核心负责。

宿主通过两个独立回调提供当前状态和可信创建绑定；请求本身不能声明自己已授权、已解锁或可访问任意路径。绑定精确指定 libraryId 和一个 folderId，未提供有效绑定时拒绝。MCP-03 才实现持久授权、客户端身份和正式外部接入；本项没有开放真实笔记本的 IPC/MCP 入口。

已验收的连接探针改为调用新核心服务，保留其开发／self-test／合成数据三重限制。普通启动及已打包应用不会启用该探针。

## 契约

create 接收 libraryId、requestId、title、body，以及可选 format、folderId。format 仅允许 text／markdown，默认 text。省略 folderId 时使用宿主绑定的文件夹；显式指定其他文件夹会被拒绝。拒绝未知字段、任意路径、无效标识符、空白标题、控制字符和损坏的 Unicode；正文上限为 UTF-8 编码后 2 MiB，超过上限拒绝而不截断。标题沿用核心 300 个 UTF-16 代码单元的容量上限。

成功返回有限回执：libraryId、requestId、noteId、folderId、format、version、saved、indexed。不返回标题、正文或本地路径。已提交正文而索引失败时返回 saved=true、indexed=false，避免误报为未保存。失败仅返回稳定 code，不返回异常原文、堆栈、凭据或文件路径。

入口逐次检查宿主绑定、应用锁、繁忙状态、当前库和精确文件夹绑定。应用锁返回 APP_LOCKED；已配置主密码且未解锁的笔记本返回 NOTEBOOK_LOCKED。两者互不替代。本项只返回状态，不弹出认证窗口，也不实现 MCP-04。

## 实际验证

- 桌面 TypeScript 编译通过。
- 核心、MCP 探针、既有 library/addon/security 回归共 42 项通过。最后对 Unicode 完整性和实际切库／撤回绑定的补充断言另行复验相关新测试；未重复无关完整回归。
- 新入口的实际文件测试覆盖 TXT 默认值、Markdown、中文与 Emoji、精确文件夹绑定、锁定／繁忙／缺库／切库拒绝、越界和伪造权限字段、2 MiB UTF-8 边界、重试及重启去重、索引故障、写入失败与错误脱敏。
- 创建新笔记不更改已有编辑会话；原桌面会话仍可保存，另一个核心仍被单写入锁拒绝。Passkey 已解锁状态不能绕过笔记本主密码。
- 复用 MCP-01 的真实 Codex/SDK 探针，验证新入口在零 BrowserWindow 的 NotebookAid 后台创建合成笔记、断开 MCP 后后台存活、重开笔记本正文一致。13 项连接检查通过；没有模型请求、全局插件安装或 Codex 配置变化。
- 本项证据汇总位于 output/mcp02/latest-success.json，其中记录已验收连接探针的具体 fixture 报告及当前编译核心摘要。探针仍有 24 KiB 正文和 64 KiB 帧限制；2 MiB 是核心入口容量，不表示现有探针已支持该传输容量。

## 用户复验

Windows PowerShell，从项目根目录运行；项目依赖及 scripts/mcp-probe 的独立锁定依赖必须已安装，Codex CLI 必须可从 PATH 调用。

```powershell
$probeNode = $env:CODEX_MCP_NODE_PATH
if (-not $probeNode) { $probeNode = 'node' }
& $probeNode node_modules/typescript/bin/tsc -p tsconfig.desktop.json
if ($LASTEXITCODE -ne 0) { throw 'Desktop compilation failed' }
& $probeNode --test test/external-notes.test.cjs test/mcp-probe.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Core tests failed' }
& $probeNode scripts/mcp-probe/run.cjs
```

预期直接测试 12/12 通过，探针 JSON 的 ok=true，13 个 checks 均为 true，zeroBrowserWindows=true，modelRequests=0，globalConfigChanged=false，pluginInstalled=false。每次运行创建新的合成数据目录，无需操作笔记编辑器。探针为复用的 MCP-01 验证器，输出 task 仍标记 MCP-01；MCP-02 汇总明确记录其用途，不将它冒充正式插件安装验证。

## 限制与回滚

本项没有实现客户端授权存储、日常可安装插件、自动发起 Passkey 认证、外部请求队列、附件或远程访问；真实 Windows Hello／手机 Passkey、macOS、安装包及用户真实笔记仍未验证。不新增持久化格式、迁移或运行依赖，也未调用 AI。

这是核心模块交付：产品版本保持 0.15.19，不生成新的应用 ZIP／安装包，不替换现有便携程序，完整程序分发在后续任务交付。用户已明确验收 MCP-02，本地提交仅包含已验收范围。

回滚只移除本项新增的 core/external-notes.ts、shared/external-notes.ts 和相关测试／说明，并恢复 desktop/mcp-probe.ts 对 NoteLibrary.create 的原调用。保留已验收的 MCP-01 提交以及其他任务未提交改动，不整文件重置，不删除或恢复用户数据。MCP-03 已获开工授权，后续任务仍需逐项验收和明确授权继续。
