# MCP-04 后台状态与 Passkey 解锁验收

状态：用户已明确验收 MCP-04 并授权继续 MCP-05。已验收 MCP-03 本地提交为 31d0559；MCP-02 为 a35ef2a，MCP-01 为 4e70443。以下保留 MCP-04 的实际验证边界。

## 交付行为

后台已运行且授权有效时，stdio 创建工具先尝试原 create。应用未锁定时直接复用现有核心；被 Passkey 锁定时，客户端只发起一次独立 unlock 请求，等待用户认证，成功后重新发送原 create，沿用原 requestId 和内容。

unlock 是内部本地协议操作，不增加可被模型直接调用的工具，不签发权限、不创建笔记。它先验证客户端、完整创建输入和授权范围，拒绝伪造状态、未知字段及越权目录；繁忙时不弹出认证。认证后重新验证持久授权、应用锁、当前笔记本、精确目录和主密码状态。最终 create 再走同一核心的完整校验，不使用认证前缓存的写入许可。

- 后台不在运行：BACKGROUND_UNAVAILABLE，不自动启动程序。
- 授权无效／已撤销：ACCESS_DENIED，不发起认证。
- 切库／恢复／批处理等宿主忙状态：LIBRARY_IN_USE，不排队写入。
- 目标库改变：LIBRARY_CHANGED；目标目录删除：INVALID_INPUT，不跟随新库或改写到根目录。
- 笔记本主密码未解锁：NOTEBOOK_LOCKED；应用 Passkey 成功不能替代主密码。
- 用户取消／认证失败：PASSKEY_CANCELLED；helper 超时：PASSKEY_TIMEOUT；平台／helper 不可用：PASSKEY_UNAVAILABLE；其他原生认证正在运行：PASSKEY_BUSY。均不继续创建。
- 创建已发送后丢失回执仍为 COMMIT_STATUS_UNKNOWN，不能假定未保存。保持原 requestId 和内容重试。

## 原生认证与并发

[现有 Windows helper](../native/Passkey.cs) 继续调用 WebAuthNAuthenticatorGetAssertion，由 Windows 提供 Passkey／Windows Hello 交互，核心继续验证注册凭据、公钥签名、RP、origin、userHandle、挑战、计数器及用户验证标志。不读取、导出、枚举私钥，不绕过用户确认，不改变注册和密钥保管方案。系统实际提供哪些本机／安全密钥／手机选项由 Windows 和已注册凭据决定，不保证优先自动选择某种设备。

[桌面 Passkey 适配器](../desktop/passkeys.ts) 为后台认证临时创建未显示、无页面／preload 的空窗口，仅提供原生 HWND；不调用 createWindow、不加载 Angular 编辑器、不将主窗口显示或置前，结束后销毁该临时窗口。Microsoft 文档要求向原生认证传入显示 UI 所用的窗口句柄：[WebAuthNAuthenticatorGetAssertion](https://learn.microsoft.com/en-us/windows/win32/api/webauthn/nf-webauthn-webauthnauthenticatorgetassertion)。隐藏 owner 的真实系统弹窗前台／焦点表现仍需要设备验收。

[后台协调器](../core/external-background.ts) 将同时等待的有效请求合并到一个认证会话。一个请求取消不关闭其他请求仍在等待的弹窗；最后一个请求断开、取消或宿主关闭时，中止会话、使挑战失效，并终止该会话自己的 helper。原有用户手动认证与后台认证复用同一 busy 防护，不同时启动第二个原生认证。

每次工具调用最多自动认证一次、重新 create 一次，没有自动认证循环。同一客户端和 requestId 的认证失败在当前进程保留 10 分钟，最多 128 条，仅含标识与固定状态，避免同一请求重试不断弹窗。手动成功解锁应用后再重试原 create 可以正常继续；重启清除该内存抑制记录。该记录不缓存内容、凭据或写入权限。

认证等待独立于 15 秒的帧接收／创建期限：通过验证的 unlock 才将当前连接期限延长至 140 秒；客户端认证连接等候至 145 秒。原生 helper 使用既有 120 秒指导时限，宿主在 135 秒强制结束自身 helper。正常 create 仍为 15 秒。原有最多 4 个本地连接限制保留，没有无界队列。后续插件配置需为整个工具调用设置足够时限；验证中的 Codex 进程设置 tool_timeout_sec=180，没有修改用户全局配置。

## 实际验证

- 桌面 TypeScript 编译通过。授权、后台状态、笔记核心、addon、安全、Passkey 和探针相关回归 67／67 通过；随后新增原生超时断言，Passkey 后台适配器定向 4／4 通过，未无故重跑无关完整项目测试。
- 新测试覆盖无授权不认证、输入和范围拒绝、共享认证、原 requestId 去重、认证期间撤销／切库／忙／重新锁定／缺库、主密码不可绕过、取消与失败抑制、单个及全部请求断开、宿主关闭，以及原生 owner 的隐藏与销毁。
- 原生适配器测试使用模拟 child process／窗口，但签名由合成 P-256 密钥生成，实际 AppPasskeys 验证。伪造签名被拒绝；135 秒 helper 超时通过模拟时钟验证，不等待真实设备超时。既有 Passkey 的无用户验证、错误 origin／RP／user、挑战和计数器回归也通过。
- 新合成 Electron 后台及真实 Codex Desktop/CLI 0.163.0-alpha.10.2 集成 14 项检查通过：等待 16 秒超过原创建超时仍成功，两个同请求并发只认证一次、保存一次；取消／超时不创建且取消后重试不再弹出；忙状态拒绝；Codex 发现工具并完成锁定、签名认证及创建；断开后后台存活；关闭后调用不自动拉起应用。最终只有两条成功笔记，重开后正文逐字一致。
- 本机既有原生 helper 的只读 probe 返回 apiVersion=9、supported=true。它只证明接口可用，没有调用真实设备认证。
- 集成证据 output/mcp04/latest-success.json：ok=true、14 个 checks 均为 true，modelRequests=0、globalConfigChanged=false、pluginInstalled=false、virtualSignedAssertions=true、physicalPasskeyTested=false、nativeDialogTested=false。

首次定向测试有一项链接用例因沙箱 EPERM 失败，已按审批权限复跑通过；新增测试最初引用了不存在的密码设置方法，修正为现有 securityCommand 后通过。不将这些失败尝试计为通过。

## 用户复验与限制

Windows PowerShell，在项目根目录，依赖和 Codex CLI 已安装。以下仅创建新的 output 合成目录；不访问用户笔记、不注册真实系统 Passkey、不发送模型请求。

```powershell
$validationNode = $env:CODEX_MCP_NODE_PATH
if (-not $validationNode) { $validationNode = 'node' }
& $validationNode node_modules/typescript/bin/tsc -p tsconfig.desktop.json
if ($LASTEXITCODE -ne 0) { throw 'Desktop compilation failed' }
& $validationNode --test test/external-background.test.cjs test/passkey-background.test.cjs test/passkeys.test.cjs test/external-access.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Background tests failed' }
& $validationNode scripts/mcp-probe/background-run.cjs
if ($LASTEXITCODE -ne 0) { throw 'Background integration failed' }
```

预期定向测试共 26 项通过；集成报告 14 个 checks 均为 true。集成签名认证器只有开发构建、self-test 标志及隔离目录守卫同时满足才加载，其私钥只在内存，报告不含 token 或私钥。该认证器验证真实核心和协议，不冒充 Windows 系统弹窗。

真实 Windows Hello／本机 Passkey／手机扫码、安全密钥、系统弹窗焦点与取消后的原生 UI 关闭、物理 macOS、自然语言模型请求及安装版插件均未验证。真实设备验收需在后续正式插件及程序交付后：开启应用 Passkey并锁定，后台创建，确认只出现一次系统认证、编辑器不主动显示，成功后仅创建一次；取消／超时无新增笔记；认证期间撤销／切库不越权；主密码锁保持独立。当前普通设置中的插件授权交付仍在 MCP-06，不把现有便携程序描述为已经支持本项。

## 交付与回滚

版本保持 0.15.19，没有新增运行依赖、数据库迁移、ZIP／安装包或便携程序替换，没有真实用户数据／授权改动。MCP-04 已验收，按规则仅提交已验收范围；MCP-05 已获开工授权。

回滚仅移除本项 ExternalBackground、后台合成验证器、测试和说明，并撤回 passkeys.ts 的后台方法／取消支持、main.ts 的 unlock 回调、新内部 unlock 协议／超时及授权客户端的认证重试包装。恢复 MCP-03 的行为后，被锁应用只返回 APP_LOCKED；保留 31d0559、a35ef2a、4e70443 和其他未验收改动。不整文件重置，不删除用户授权、Passkey 或已保存笔记。合成 output 目录可保留作为验收证据。
