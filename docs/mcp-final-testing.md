# MCP-07 Windows 最终交付验收

状态：MCP-07 已于 2026-10-19 获用户验收，已授权本地提交。MCP-06 已验收并提交为 e5a7619。应用交付版本 0.15.20；插件版本 0.1.0。不进行下一项任务，不正式发布或推送。

## 使用与验收

1. 从便携测试目录运行 NotebookAid.exe，保持后台运行。设置 → MCP / Codex，选择当前笔记本的目标文件夹，创建客户端并确认范围。
2. 打开生成的插件目录，执行 INSTALL.txt 中的本地 marketplace add / plugin add 命令，然后重开 Codex 本地会话。命令只有本机路径与 profile ID，不需要粘贴 token，也不需要另装 Node。
3. 请求创建 TXT（默认）或 Markdown 笔记，确认指定文件夹中标题、中文、换行与内容正确。每个新意图使用新 UUID；同一请求重试保持原 UUID 和参数。保存成功但索引失败仍算成功；COMMIT_STATUS_UNKNOWN 时保持原请求重试。
4. 隐藏主窗口后继续创建。应用退出时应返回 BACKGROUND_UNAVAILABLE；重新启动后可用同一授权创建。撤销客户端后，旧 Codex 会话应被拒绝。
5. 如果启用应用 Passkey 锁，创建会触发一次系统认证；手动选择 Passkey 并完成认证。取消或失败不创建笔记，多个同时请求共用一次认证。不会自动读取 Passkey 私钥。笔记本主密码锁继续需要在应用内解锁。

本期仅提供 notebookaid_create_note，不包含搜索、读取、编辑、删除、附件、Telegram 或远程服务。日常创建不操作编辑器界面。

## 自动验证与限制

最终验证结果记录在项目 output/mcp07。桌面／Angular／MCP bundle／DPAPI helper 构建通过；全量回归中 369 项通过、1 项跳过，唯一失败是旧便携夹具缺少本次必需文件，补齐后相关 4 项定向测试全部通过。

打包版通过 17 项真实 Electron／Windows DPAPI／隔离 Codex 检查：取消不授权、确认签发、凭据加密、十语言、打包路径、自带 Node、隐藏主窗口创建、TXT／Markdown、同一请求回执去重、插件发现／调用／卸载、撤销运行中客户端、断开后后台存活及重开后正文一致。集成探针仅使用带标记的 output/mcp01 合成目录与独立 CODEX_HOME，不安装到用户全局 Codex，也不访问真实笔记。打包探针显式指定 --mcp-test-workspace 和 --mcp-test-home，拒绝目录链接、越界目录和指向其他笔记本的注册表；正常导出的插件没有这些测试参数。

Windows PowerShell 在项目根目录可复验（需已安装开发与探针依赖）：

```powershell
node scripts/mcp-probe/plugin-run.cjs 'release/0.15.20/NotebookAid-win32-x64/NotebookAid.exe'
./scripts/Verify-TestDelivery.ps1
```

分发检查逐项核对安装文件清单、ZIP 全部文件内容、EXE／MSI／ZIP／XPI 校验和、五个 helper 的版本、MCP 三个组件的许可清单和嵌入 XPI。便携更新另外核对进程、链接、用户数据与完整 ZIP 哈希，不创建目录备份；部署记录在 output/portable-preparation。

最终结果：EXE／MSI／ZIP 构建成功；133 个清单文件、ZIP 中 136 个文件和 6 个校验和通过。MSI 十语言各 37 条字符串、字体和原生属性动作通过，installationExecuted=false；保留既有双安装范围的 ICE105 警告，不据此宣称安装成功。EXE 仍未签名。Defender 对三个应用包的扫描退出码均为 0，禁用修复；这不代表 SmartScreen／浏览器信誉认证。

便携目录 C:\Softwares\NotebookAid-win32-x64 已更新到 0.15.20，verified=true、backupCreated=false，恢复两个原本归该目录所有的桥接清单。更新后的实际程序再次通过全部 17 个 MCP 检查，测试没有安装用户全局插件或调用模型。报告见 output/mcp07/packaged-success.json、latest-success.json、distribution-verification.json、msi-verification.json、security-scan.json 与 output/portable-preparation/20261019-185948-081/deployment.json。随包的 MCP-FINAL-TESTING.md 提供使用与回滚步骤；本仓库指南补充最终部署结果。

| 包 | SHA256 |
| --- | --- |
| NotebookAid-0.15.20-win-x64.zip | a18fc68960206c7cbb1584a34d554a4fd08644c3b2b5729fc308a2af3b4f39b9 |
| NotebookAid-0.15.20-Setup-x64.exe | 2eb64444a3ec3731575a1d5a6c32fe5bf0f853834351e8fdc76075e97a2c303f |
| NotebookAid-0.15.20-Setup-x64.msi | f2124c1705ddc51b0577f147b075dd0ef4f3ea4ac918a1065dffeef6efc26c03 |

用户后续在安装版中创建授权并安装本地插件，通过本聊天实际调用 notebookaid_create_note 创建 TXT；回执 ok=true、saved=true、indexed=true，用户确认笔记创建成功并明确验收 MCP-07。此记录不保存真实笔记正文、标识符或凭据。此前 output 中的隔离测试仍保持 modelRequests=0，不因后续用户测试改写历史报告。

真实 Passkey 选择窗口、完整安装／升级矩阵、物理 macOS／Keychain 与跨系统用户 DPAPI 拒绝仍需相应环境验收；自动化及本次用户确认不代表这些项目已验证。

## 回滚

关闭 NotebookAid 和所有客户端 broker／helper，从 Codex 卸载对应插件并在应用内撤销真实客户端。保留笔记与授权撤销记录，不恢复旧 external-clients.json，避免重新启用旧权限。

保留 release/NotebookAid-0.15.19-win-x64.zip 作为程序回滚来源。先关闭开机启动并选择 Continuous（连续）布局，然后按既有便携更新检查流程恢复旧 ZIP 到原测试目录；不要删除用户数据或建立目录备份。旧程序不提供本次 MCP 功能。移动新版程序后需创建新客户端／插件并撤销旧客户端，因为配置绑定可执行文件路径。
