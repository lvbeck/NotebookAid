# MCP-03 客户端身份与持久授权验收

状态：用户已明确验收 MCP-03 并授权继续 MCP-04。MCP-02 已验收并本地提交为 a35ef2a；MCP-01 为 4e70443。以下保留 MCP-03 交付时的验证范围。

## 交付范围

新增 [授权存储](../core/external-clients.ts)、[授权入口](../core/external-access.ts)、[宿主接入](../desktop/external-access.ts) 与独立的本地通信端点。每个客户端有独立 UUID 和 32 字节随机 bearer token，绑定一个 libraryId 和精确 folderId；null 表示根目录，不表示任意目录。唯一外部操作是 create。客户端不能列出、签发或撤销授权，也不能读取、搜索、编辑或删除笔记。

默认没有授权，不创建授权文件、监听端点或运行描述文件。正常后台启动仅在存在有效持久授权时启动端点；授权损坏时拒绝外部接入，主程序继续启动并仅输出固定故障分类。已有 Thunderbird Native Messaging 端点和协议不变。

宿主内部提供 list／issue／revoke／start／close 方法，签发前要求应用已解锁、笔记本未忙且已解锁，并验证当前库和目标目录。该管理对象不暴露给 renderer、preload、MCP 或外部管道。授权设置界面、一次性凭据的用户交付及客户端安全保存属于 MCP-06；因此当前安装版尚不能通过普通设置界面连接插件。验证适配器不作为日常插件发布。

## 授权与通信边界

- app data 中 external-clients.json 只保存客户端名称、UUID、库／目录绑定、创建时间和 SHA-256 token 摘要。原始 token 只在签发成功后返回一次，丢失后撤销并重新签发，不提供找回接口。授权原子替换失败时保留旧状态。每次请求重新读取授权，撤销即时生效，重启后持续生效。
- token 与 clientId 必须同时匹配；认证失败统一 ACCESS_DENIED，且不会读取应用锁或笔记本状态。通过认证后仍逐次检查应用锁、当前库、精确目录及笔记本主密码，不缓存解锁许可。
- 外部请求不能声明自身授权范围、解锁状态或文件路径。删除已绑定目录不会扩大授权范围；切换笔记本后不自动跟随到新库。
- Windows 使用单独命名空间的 named pipe；POSIX 使用当前 uid 的受限 socket 目录。没有 HTTP 监听或远程服务。external-runtime.json 仅含协议版本、地址、进程号和实例标识，不含 token；客户端只连接根据 app data 推导的固定地址。不能依赖该公开描述文件取得授权。
- 每个连接只接受一个长度前缀 JSON 帧，最多同时 4 个连接，每连接绝对生存时间 15 秒。正文仍受核心 UTF-8 2 MiB 限制；帧容量为 6 倍正文上限加 32 KiB，容纳最坏 JSON 转义。超大长度在分配正文缓冲区前拒绝，不进行无界片段累加。
- token 不放入命令行、Codex 配置、插件清单或报告。测试通过私有父子 stdout 管道一次性交付合成凭据，再以进程环境转发给 stdio 适配器；原始 ready 消息不打印、不保存。环境变量只用于本项验证，不是 MCP-06 的凭据保管方案。
- 本地 OS 用户及其 app data 属于信任边界。本项不抵御可读取同用户进程内存或改写应用／授权文件的恶意程序；token 机制也不是进程沙箱或远程认证服务。没有新增自制加密算法、数据库迁移或运行依赖。

已发送请求后丢失连接、超时或收到异常回执，客户端返回 COMMIT_STATUS_UNKNOWN，不能断言未写入；重试必须使用原 requestId 和原内容。客户端验证回执结构、关联标识、格式及固定错误码，不透传异常详情。未找到端点或连接前失败返回 BACKGROUND_UNAVAILABLE。

## 实际验证

桌面 TypeScript 编译通过。第一批授权测试 10 项与既有核心、library、addon、security、MCP 探针回归共 52 项通过；后补链接路径和异常回执测试后，最终授权定向测试 12／12 通过。覆盖默认拒绝、跨客户端 token 混用、授权落盘与重载、撤销、故障原子性、损坏／超大文件、链接路径、未知字段、权限伪造、精确目录、帧分片／UTF-8／长度／多帧拒绝、重复监听失败保护及半帧请求撤销。

真实 Electron 44.7.0 后台与 Codex Desktop/CLI 0.163.0-alpha.10.2 验证通过。最终报告 output/mcp03/latest-success.json：ok=true，15 项检查均为 true，7 条合成笔记重开后正文完全一致，包括 2 MiB 最坏转义正文和中文／Emoji Markdown。SDK 与真实 Codex 均发现并调用 notebookaid_create_note，所有后台实例 BrowserWindow 数为零；MCP 断开后后台存活；两次重启验证授权与撤销的持久性及客户端互不影响。

首次 Electron 验证因 Windows GUI 进程的继承 stdin 提前结束而关闭了测试宿主。已改用受合成目录守卫限制的测试控制文件，最终链路复验通过。该控制器只有开发构建、self-test 和隔离目录三重限制同时满足才加载，正式后台不加载；文件仅传递测试锁状态、撤销和退出命令，不含 token 或笔记正文。

没有模型请求、全局 Codex 配置变化、插件安装、真实用户授权或真实笔记访问。测试中的锁定是宿主状态模拟，不能作为真实 Passkey／Windows Hello 弹窗验证。原生认证仍属于 MCP-04；自然语言模型调用、正式凭据交付／插件配置、安装程序、macOS 和实际用户笔记尚未验证。

## 用户复验

Windows PowerShell，项目根目录；已有根依赖和 scripts/mcp-probe 独立锁定依赖，Codex CLI 位于 PATH。命令每次生成新的合成目录，不操作真实笔记，也无需打开编辑器。

```powershell
$validationNode = $env:CODEX_MCP_NODE_PATH
if (-not $validationNode) { $validationNode = 'node' }
& $validationNode node_modules/typescript/bin/tsc -p tsconfig.desktop.json
if ($LASTEXITCODE -ne 0) { throw 'Desktop compilation failed' }
& $validationNode --test test/external-access.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Authorization tests failed' }
& $validationNode scripts/mcp-probe/authorization-run.cjs
if ($LASTEXITCODE -ne 0) { throw 'Integration validation failed' }
```

预期定向测试 12／12；集成报告 ok=true，15 个 checks 为 true，modelRequests=0、globalConfigChanged=false、pluginInstalled=false、realPasskeyTested=false。输出目录位置由报告给出，失败不输出凭据或异常原文。报告记录的是协议直接调用，不冒充自然语言模型或安装版插件验收。

## 交付及回滚

产品版本保持 0.15.19。这是授权模块交付，没有新 ZIP／安装包、包验证或便携目录替换；既有便携测试程序仍是此前版本的功能。正式应用及插件交付在后续编号任务完成。MCP-03 已验收，按规则仅提交已验收范围，不发布、不推送。

开发回滚只移除本项新增 external-access／external-clients／external-client／external-endpoint／external-framing 文件、验证器、测试和说明，并反向恢复 main.ts、library-ipc.ts、.gitignore 中本项新增行。保留已验收提交与其他待验收改动，不整文件重置。

测试只产生新的 output 合成目录，保留它们即可，无需清理或恢复用户数据。未来若需要禁用已部署的授权，先退出后台，备份 external-clients.json 后移出该文件，再启动即默认不开放端点；这会使所有旧 token 失效，不删除已创建笔记。恢复授权文件会恢复旧权限，应仅在明确需要时操作。不要用回滚授权文件撤销用户已经保存的笔记。
