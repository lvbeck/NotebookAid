# MCP-01 后台连接验证

状态：2026-10-19，用户已明确验收 MCP-01 并授权继续 MCP-02。产品版本保持 0.15.19。

## 本项交付

本项是 Codex 插件／MCP 接入的第一项技术验证，尚不是供日常笔记使用的正式插件。没有安装全局插件、注册市场、修改 Codex 配置、生成新的应用安装包或替换便携测试程序。正常启动和已打包程序不会开放此验证入口。

验证链路：真实 Codex app-server → stdio MCP → 独立的本机受限 IPC → NotebookAid 已运行的本地核心 → 合成测试笔记。另用官方 MCP SDK 客户端验证相同链路。Codex 使用 ephemeral 协议会话，不生成模型回复，不创建持久聊天。

- [后台验证入口](../desktop/mcp-probe.ts)：只在开发构建、self-test、专用环境变量同时满足时启用。数据必须位于项目 output/mcp01 子目录并具有明确的合成数据标记；登记的笔记本只能指向该目录内的 library。
- [MCP 适配器](../scripts/mcp-probe/server.cjs)：只暴露 notebookaid_create_note，不支持搜索、读取、修改、删除、任意路径或用户界面操作。
- [完整验证脚本](../scripts/mcp-probe/run.cjs)：生成全新夹具、启动后台、执行调用、关闭自己启动的测试进程并重开笔记本核对正文。
- [参数与边界测试](../test/mcp-probe.test.cjs)：校验异常输入和测试库边界。
- 依赖单独锁定在 scripts/mcp-probe/package-lock.json：官方 MCP client/server 2.3.1、Zod 4.6.5；没有改变应用运行依赖或升级现有框架。

## 实际验证结果

- 桌面 TypeScript 编译通过。
- 相关自动测试 22/22 通过，包括 MCP 输入／目录边界、既有 addon 权限和生命周期回归。首次沙箱运行有一项旧测试因创建符号链接被拒绝而失败，随后在所需文件系统权限下重跑全部 22 项通过。
- 真实 Codex Desktop/CLI 0.163.0-alpha.10.2 成功发现工具并通过 mcpServer/tool/call 创建 Markdown 测试笔记。
- Codex 成功解析本地测试市场和插件清单，并识别其 MCP 服务；该夹具未安装为用户插件。首次夹具断言把名称当作 plugin.name，已根据当前协议改为 plugin.summary.name；此断言失败不计为通过。
- SDK 创建含中文和 Emoji 的 TXT 笔记；相同请求重试只保留一条，相同 requestId 的不同正文被拒绝，未知字段被拒绝。
- 两条合成笔记均经关闭后台、重开权威笔记本后验证正文完全一致；Markdown 格式保持不变。
- 创建时 BrowserWindow 数量为 0。断开 SDK MCP 和 Codex 后，NotebookAid 测试后台仍运行。
- 验证前后用户 Codex 配置摘要一致。未发起模型请求，未读写真实笔记，未自动启动用户程序或更改登录启动项。

通过的完整报告汇总位于 output/mcp01/latest-success.json，并记录实际 fixture 路径；每次重跑会创建新的 connection-* 目录与独立报告，旧失败报告保留，不将其覆盖成成功。

## 用户复验

适用环境：Windows PowerShell、Node.js 24.15 以上的 24.x、可从 PATH 调用的 Codex CLI，以及已安装的项目依赖。命令从项目根目录执行。

```powershell
npm ci --prefix scripts/mcp-probe --ignore-scripts --no-audit --no-fund
$probeNode = $env:CODEX_MCP_NODE_PATH
if (-not $probeNode) { $probeNode = 'node' }
& $probeNode node_modules/typescript/bin/tsc -p tsconfig.desktop.json
if ($LASTEXITCODE -ne 0) { throw 'Desktop compilation failed' }
& $probeNode scripts/mcp-probe/run.cjs
```

检查终端 JSON：ok 为 true，checks 的全部条目为 true，zeroBrowserWindows 为 true，modelRequests 为 0，globalConfigChanged 和 pluginInstalled 为 false。运行期间不需要点击 NotebookAid，也不需要向任何模型发送笔记正文。脚本结束后，独立报告和两条合成笔记留在打印的 fixture 目录。

若需要复验相关测试：

```powershell
& $probeNode --test test/mcp-probe.test.cjs test/addon.test.cjs test/lifecycle.test.cjs
```

## 边界与回滚

本项没有验证自然语言驱动的完整插件安装流程、正式笔记本授权、应用锁定／撤权、macOS 或安装包兼容性。24 KiB 正文上限仅为连接探针限制，不是正式接口容量承诺；现有 Native Messaging 的 64 KiB 帧限制需要在正式入口设计时单独处理。没有引入 Playwright、Electron UI 自动化、Telegram、远程 HTTP 服务或额外 AI 提供商。

无需回滚用户数据、Codex 配置或便携应用。撤销本项源码时，只移除 desktop/main.ts 中 MCP 探针启动分支及本项新增的验证文件，保留同文件里其他任务的改动；不要整文件恢复或重置工作区。测试目录可以保留供审查，不自动删除。用户已明确验收 MCP-01 并授权继续 MCP-02；后续任务仍分别交付验收。

参考：[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)、[Codex app-server](https://learn.chatgpt.com/docs/app-server)、[插件结构及本地市场](https://developers.openai.com/plugins/build/plugins)、[官方 TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)。
