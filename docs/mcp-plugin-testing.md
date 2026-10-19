# MCP-06 本地插件与授权配置验收

状态：MCP-06 已获用户验收（2026-10-19），已授权继续 MCP-07 最终验证、打包与便携更新。以下保留 MCP-06 交付时的验证范围。已验收 MCP-05 本地提交为 8d4edc1；MCP-04 为 fbf4c0c，MCP-03 为 31d0559。

## 已交付

设置的全局区域新增默认折叠的 MCP / Codex 面板，提供客户端名称、当前笔记本的精确目标文件夹、创建插件、查看授权、打开插件目录与撤销。授权前通过现有应用确认对话框显示客户端和范围；取消不签发。界面支持现有十种语言，沿用主题、设置行与按钮风格。它不增加笔记编辑器的常驻按钮。

创建时由受保护的主进程 IPC 验证输入、应用锁、当前库、主密码、忙状态和目录。凭据生成后加密保存，再次检查状态并输出插件配置；失败时尝试撤回本次授权，包含等待加密期间应用重新锁定的情况。回滚本身失败会报告 ROLLBACK_FAILED，不能将其描述为授权必已移除。管理能力不暴露为 MCP 工具。renderer 收到的只是授权元数据和状态，不收到 token。

每个客户端在 app data 中生成独立的 mcp-plugins/<clientId> 本地 marketplace 和插件目录，包含 .codex-plugin/plugin.json、.mcp.json、项目 LICENSE 和 INSTALL.txt。配置只有本机程序路径、profile ID 与 180 秒工具超时，无 token、命令行密钥、明文环境变量或任意笔记路径。每个 marketplace 名称带独立 clientId，避免多个客户端互相覆盖。插件仅包含 notebookaid_create_note，不提供搜索、读取、编辑、删除、附件或 Telegram。

本机 Codex 0.163.0-alpha.10.2 实测新版根 plugin.json／mcp.json 未解析出 MCP 声明，因此最终只生成已验证的 Codex 兼容格式，没有同时放置会遮蔽兼容清单的根清单。该格式仍受 [OpenAI 官方插件文档](https://developers.openai.com/plugins/build/plugins) 支持。此处是本地私有插件，不提交公共目录；不把它描述为已获得公共 stdio 插件发布资格。

## 凭据与运行时

- 服务端继续只保存 token 摘要。客户端凭据加密文件位于 mcp-profiles/<clientId>.bin，不在插件包里；目录与导出文件加入 Git 排除规则。
- Windows 通过小型 [McpCrypt helper](../native/McpCrypt.cs) 调用系统 ProtectedData／DPAPI，使用 CurrentUser，未实现自定义加密算法、未采用 LocalMachine。它不是针对同一 Windows 用户下恶意进程的隔离边界；[微软 CurrentUser 文档](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.dataprotectionscope?view=netframework-4.8.1) 说明该保护关联当前用户上下文。复制插件目录不会复制凭据；换机器／系统用户需重新授权。
- macOS 代码使用 Electron safeStorage／Keychain 分支，但未在物理 Mac 验证，不能视为已交付验证通过的 macOS 集成。Linux 不启用配置，避免安全存储不可用时使用明文后备。
- 新 entry.ts 在 --mcp-stdio 模式进入独立凭据 broker，不初始化主窗口、笔记写入核心或单实例锁。它只读取指定 profile，解密后通过私有额外管道交给 stdio 子进程。明文不经过 MCP stdout、配置、日志、环境变量或命令行。broker 不会启动主应用或离线写入队列，后台离线仍由工具返回 BACKGROUND_UNAVAILABLE。
- stdio 子进程复用 NotebookAid 的 Electron Node 运行时，无需用户另装 Node；--mcp-stdio 与 ELECTRON_RUN_AS_NODE 子进程是两种明确分开的运行模式。创建仍通过已授权本地端点进入同一后台核心，应用锁仍走 MCP-04 的原生认证，读取凭据不构成解锁。
- [独立 mcp 包](../mcp/package.json) 锁定 SDK 2.3.1、Zod 4.6.5；构建生成 dist/mcp/server.cjs、组件清单和第三方许可文本，实际 bundle 包含三个第三方组件。应用打包脚本已接入新 entry、运行时、Windows helper 和许可目录；正式 EXE/MSI/ZIP 的验证与便携部署仍留在 MCP-07。

撤销先使服务端 token 失效，再尝试删除加密文件，已运行并持有旧 token 的客户端也不能继续创建。即使清理加密文件失败，已成功保存的撤销仍生效；生成的非秘密插件目录保留，便于用户卸载和查看说明。插件配置中的程序路径随本机位置绑定，移动程序后需创建新客户端／插件并撤销旧客户端。

## 实际验证

- 桌面 TypeScript 与 Angular 构建通过，MCP bundle 和 Windows helper 构建通过。相关授权配置、创建重试、后台认证、核心、addon、Passkey、安全与探针回归 79／79 通过；补充加密期间锁定的回滚断言后，配置定向测试 3／3 再次通过。
- 使用真实 Electron 设置页面、应用确认对话框、Windows DPAPI 和真实 Codex CLI 完成 14 项集成检查。包括取消不授权、确认后加密落盘、十种语言、renderer／导出中无 token、broker 跨进程解密和自带运行时、SDK 创建、独立 Codex 安装、工具发现与创建、运行中撤销拒绝、断开后后台存活、插件卸载及两条笔记重开后正文一致。
- 测试在 output 下新建独立 CODEX_HOME，实际执行 marketplace add、plugin add、plugin remove。仅此测试配置发生安装／卸载；用户原有全局配置摘要前后相同。没有全局插件安装、模型请求、真实用户笔记／凭据或物理 Passkey 操作。
- 浅色与深色截图已目视检查，深色测试使用应用允许的较窄窗口。最终证据 output/mcp06/latest-success.json：ok=true、14 个 checks 均为 true，isolatedCodexInstallation=true、globalPluginInstalled=false、globalConfigChanged=false、modelRequests=0。fixture 中保存 UI 截图与独立配置，未保存原始 token。
- 初次离线 npm 安装因缓存缺包失败，之后按工具权限安装同一锁定版本。初次 UI 语言 ID 与项目的 pt-PT／zh-TW 不一致，修正后十语言检查通过；一次 Angular 资源输出受沙箱 EPERM 阻止，获工具权限后构建通过。初版 Electron safeStorage 跨进程解密未通过，Windows 已改为真实验证通过的直接 DPAPI。根清单试验未发现工具，最终兼容清单的安装／发现／调用／卸载全部通过。这些失败尝试不计为通过。

## 用户复验

Windows PowerShell，项目根目录。根项目依赖、scripts/mcp-probe 的验证依赖和 Codex CLI 需已安装；首次构建还需安装 mcp 的锁定依赖。

```powershell
npm ci --prefix mcp --ignore-scripts
npm run build
node --test test/mcp-plugin.test.cjs
node scripts/mcp-probe/plugin-run.cjs
```

若本机 node shim 不可用，以 $env:CODEX_MCP_NODE_PATH 替代 node。预期 3／3 定向测试与 14 个集成 checks 通过。验证会显示自己的合成设置窗口和确认流程，不操作真实笔记；脚本自动化只用于验收，日常笔记创建不操作 UI。

开发版手动复验可运行 npm start：设置 → MCP / Codex → 输入客户端名称、选择当前笔记本目标文件夹 → 创建本地插件 → 审阅并确认 → 打开插件目录。安装命令已写入该目录的 INSTALL.txt；运行这些命令才会修改用户自己的 Codex 配置，本任务没有替用户执行。

```powershell
codex plugin marketplace add '<生成的本地 marketplace 目录>'
codex plugin add 'notebookaid@notebookaid-local-<clientId>'
```

重开 Codex 本地会话后使用 NotebookAid 创建 TXT／Markdown；保持后台运行。可在 NotebookAid 设置撤销，再确认旧会话不能创建。卸载用 Codex 插件管理或 codex plugin remove；卸载插件不会替代撤销授权，也不删除已经保存的笔记。

## 限制与回滚

应用版本保持 0.15.19，插件协议包版本 0.1.0。没有新应用 EXE／MSI／ZIP、安装验证或便携程序替换；当前便携测试程序仍不包含 MCP-06 界面与 helper。应用最终分发、实际打包路径／Electron fuses、安装升级与便携部署验证属于 MCP-07。自然语言模型调用、物理 Mac／Keychain、真实 Passkey UI、公共插件目录提交与跨用户解密拒绝实测均未验证。没有将已有 AI 账号接入当作新 API 资格，没有调用 AI 或产生模型费用。

本项源码未提交，等待验收，不推进 MCP-07。源代码回滚只撤销 MCP 设置、broker、独立包和构建接线，恢复原 main 入口，保留 8d4edc1 与更早验收提交及其他未验收 UI／版本改动。不要整文件重置 package.json、main.ts 或混合文档。

撤销真实客户端后，从 Codex 卸载对应插件／marketplace，再关闭 NotebookAid；此时可以移走对应的非秘密 mcp-plugins/<clientId> 和已失效的加密 profile，保留服务端授权状态的既有备份策略。不要为了回滚程序恢复旧授权文件，这可能重新启用已撤销的权限。不删除已创建笔记、主密码或 Passkey。测试只产生新的 output 目录，可保留证据，无需回滚用户数据。
