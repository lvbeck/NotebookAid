# MCP-05 创建与重试验收

状态：用户已明确验收 MCP-05 并授权继续 MCP-06。已验收 MCP-04 本地提交为 fbf4c0c；MCP-03 为 31d0559，MCP-02 为 a35ef2a。以下保留 MCP-05 的验证范围。

## 本项交付

继续复用 NoteLibrary.create 的现有持久化操作 ID、提交日志和内容指纹，不增加第二个写入器、幂等数据库、后台补写队列或新的存储格式。

[stdio 工具](../scripts/mcp-probe/authorized-server.cjs) 明确要求每条新笔记使用新的 UUID requestId；重试必须复用原 UUID、标题、正文、格式及目标目录。默认 TXT，Markdown 可选。输入校验与核心保持一致，拒绝空白标题、控制字符／损坏 Unicode、正文 NUL、未知字段、不支持的格式和超过 UTF-8 2 MiB 的正文，不截断、不改写正文。大小按编码字节计算，不能只按 JavaScript 字符数判断。工具声明仍为单一创建操作，无读取、搜索、编辑、删除、附件或路径入口。

[本地客户端](../desktop/external-client.ts) 在调用开始时固定本次输入和凭据快照。等待 Passkey 时，即使宿主调用方修改原对象，解锁后的 create 仍使用原 requestId 和内容。管道 close 与 end／error 一样立即结束等待，避免已关闭连接继续占用完整创建超时。

[端点](../desktop/external-endpoint.ts) 对已经开始分派的处理异常返回 COMMIT_STATUS_UNKNOWN。原先统一返回 ACCESS_DENIED 不能排除处理已提交的情况，可能使调用方误以为没有保存；现在同步抛错和异步拒绝都保守报告结果不确定。帧解析失败仍返回 ACCESS_DENIED，不暴露异常原文。

## 重试契约

| 情况 | 行为 |
| --- | --- |
| 同一 requestId、相同规范化创建参数 | 返回同一笔记，不再提交或重复发出变更事件；省略默认 text／绑定目录与显式填写一致 |
| 同一 requestId 改变标题、正文或格式 | INVALID_INPUT，不创建替代笔记；越权目录仍先按授权规则拒绝 |
| 新 requestId、相同内容 | 视为新的创建意图，可产生另一条笔记 |
| saved=true、indexed=false | 正文已经保存，属于创建成功；索引故障不能诱导生成新 UUID 重复创建 |
| 应用锁 | 保留 MCP-04 的一次认证和一次原请求续传，不循环认证 |
| 发送后断线、丢回执、意外处理异常 | COMMIT_STATUS_UNKNOWN，不能断言没有保存；调用方可明确使用原请求重试 |
| 发送前离线或没有端点 | BACKGROUND_UNAVAILABLE，不启动应用，不将内容写入离线队列 |

不确定结果不会触发额外的自动写入循环，也不会生成替代 requestId。调用方必须保留原始参数；如已确认失败且用户明确要改变内容，应当视为新意图，而不是把变化内容塞入旧重试。

去重范围沿用现有笔记本核心的操作 ID 命名空间，不是按客户端分别计数；每个新意图都应使用新的随机 UUID，避免与其他客户端或桌面操作复用 ID。重启不清除已有提交记录，但本项不承诺用户永久删除笔记、清理相关历史／操作记录或恢复旧备份后的无限期 exactly-once。清理历史可能使旧重试被拒绝，永久删除会清理相关操作记录；此时不能把旧请求当作恢复已删除内容的接口。没有新增永久保留正文指纹的账本。

## 实际验证

- 桌面 TypeScript 编译通过。创建／重试、后台认证、Passkey、授权、笔记核心、addon、安全及探针相关测试共 76／76 通过，零跳过、零失败。本项新增 8 个定向测试。
- 分别在 journal、revision、head、index 阶段强制退出独立合成进程，确认到达目标阶段后重开核心，使用原 requestId 重试，最终只有一条已提交笔记，正文逐字一致。提交前退出允许重新创建；提交后退出复用原笔记，不再产生新提交事件。未提交的 staging／恢复诊断资料按既有核心规则保留，不额外清理。
- 通过真实本地管道在保存后主动关闭端点，使回执实际丢失，客户端立即报告不确定；重启端点后原请求成功重放，仍只有一条笔记。另行模拟提交后抛错，验证 COMMIT_STATUS_UNKNOWN，且客户端没有隐式第二次调用。
- 验证等待认证时调用方修改原始对象不会改变正在执行的请求；验证 Markdown 原文保持、相同 ID 改参数被拒绝、TXT 默认值及 saved／indexed 分离。
- 真实 Electron 44.7.0／SDK 2.3.1／Codex Desktop/CLI 0.163.0-alpha.10.2 集成共 20 项检查通过。包含 stdio 并发重试、真实 Codex 重试、后端重启后原 ID 重放、变化参数拒绝、UTF-8 大小和未知字段拒绝、授权持久化与撤销，以及七条成功合成笔记重开后的完整正文校验。BrowserWindow 始终为零。
- 最终集成报告 output/mcp05/latest-success.json：ok=true、20 个 checks 均为 true、modelRequests=0、globalConfigChanged=false、pluginInstalled=false。报告包含合成 fixture 位置；不保存 bearer token、私钥或异常原文。

## 用户复验

Windows PowerShell，项目根目录，根依赖与 scripts/mcp-probe 的锁定依赖已安装，Codex CLI 可从 PATH 调用。

```powershell
$validationNode = $env:CODEX_MCP_NODE_PATH
if (-not $validationNode) { $validationNode = 'node' }
& $validationNode node_modules/typescript/bin/tsc -p tsconfig.desktop.json
if ($LASTEXITCODE -ne 0) { throw 'Desktop compilation failed' }
& $validationNode --test test/external-retry.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Create/retry tests failed' }
& $validationNode scripts/mcp-probe/authorization-run.cjs --create-retry
if ($LASTEXITCODE -ne 0) { throw 'Create/retry integration failed' }
```

预期定向测试 8／8；集成报告 task=MCP-05、ok=true、20 项 checks 均为 true。验证器复用 MCP-03 的隔离授权夹具，因此合成数据仍位于 output/mcp01，私有测试客户端名称可能仍带 mcp03；本项报告单独写到 output/mcp05，不覆盖 MCP-03 验收报告。每次运行使用新目录。

## 限制与回滚

以上使用真实文件、单写入核心、进程退出、本地管道及 Codex 协议直接调用；没有真实模型请求或自然语言插件调用，也没有真实用户笔记／凭据、物理 Passkey 交互、Windows 安装、macOS 或断电硬件测试。进程退出测试不等同于实际磁盘损坏或系统断电。

产品版本保持 0.15.19，不新增依赖、数据库迁移或持久格式；没有生成新 ZIP／安装包或替换便携程序。正式插件配置、凭据交付和程序分发仍在后续任务。MCP-05 已验收，按规则仅提交已验收范围；MCP-06 已获开工授权。

回滚只恢复本项 external-client.ts 的快照／close 处理、external-endpoint.ts 的分派异常分类及 stdio 验证器输入／说明改动，移除新增重试测试、合成 crash worker 和说明。保留 fbf4c0c 及更早验收提交，不整文件重置其他待验收修改，不删除用户笔记、授权或 Passkey。output 下的合成证据可保留，无需恢复用户数据。
