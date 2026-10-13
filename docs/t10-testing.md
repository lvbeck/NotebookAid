# T10 Thunderbird 集成验收 — 0.10.0-t10.2

2026-10-13 桥接修复（桌面 0.12.0-t12.2／XPI 0.10.3）：Windows 注册持续保留，不需要每次重启重新注册。旧测试目录更新曾清除注册项指向的 native-host.json／native-host-legacy.json，导致三个连接按钮均失败。已恢复当前用户原路径注册（回滚快照位于 %APPDATA%\NotebookAid\bridge-backups）；更新脚本现在只重建已归属该目录的主机配置，不新建已移除的旧别名或修改其他目录的注册。安装新 NotebookAid.xpi 后，桥接缺失会明确提示运行 Register-Bridge.ps1；新版“打开应用”可在应用未运行时独立启动。电脑重启后可点击“启动后台”或“打开应用”；若开启 Passkey，仍需在应用内解锁。换程序目录或首次安装才需要运行对应目录的注册脚本。真实 Thunderbird 的重连仍需用户复测。

状态：构建、核心及便携验证完成，等待用户真实 Thunderbird 验收。T09／T09.3 已根据用户明确批准提交 ec7ac53；T10 不提交、不开始 T11。

## 安装与打开

1. 完全退出旧测试程序后，使用本轮便携 ZIP。启动 NotebookAid 并确认当前笔记本。
2. 在便携目录运行 Windows PowerShell：

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Register-Bridge.ps1
~~~

此脚本注册当前用户的 Native Messaging 主机，修改专用 HKCU 项并生成 native-host.json；助手没有自动修改用户注册表。新主机名为 de.zub_systems.notebookaid，插件 ID 为 notebookaid@zub-systems.de。本轮必须重新运行注册脚本。脚本会保留指向同一程序目录的旧主机别名以兼容旧插件，并在 %APPDATA%\NotebookAid\bridge-backups 保存注册快照；失败时自动尝试回滚。若旧注册属于其他目录，会拒绝修改，请先从原目录撤销注册。
3. 已使用过旧插件时，先安装 NotebookAid-Compatibility.xpi 替换旧 ID 的插件（保持旧插件存储），再安装新 ID 的 NotebookAid.xpi。新插件会通过仅允许指定插件 ID 的本机消息转移 profileId 和已授权标签映射列表，不传输笔记或凭据。完成后建议先禁用 NotebookAid migration helper，保留旧插件存储用于回退；确认不再需要回退后再移除。确认新插件连接和标签映射正常后，可运行 Register-Bridge.ps1 -RemoveLegacy 移除旧主机别名，保留新注册。请勿在迁移前卸载旧插件，否则 Thunderbird 可能删除其独立存储。若先装了新插件，请在安装迁移包后重新载入新插件，并在迁移完成前不要导入标签。
4. 将配套 NotebookAid.xpi（内部版本 0.10.3）安装至 Thunderbird，或在调试附加组件中临时载入 manifest.json。产品基线 Thunderbird 157.0.1，Gecko 声明最低 157.0；未签名测试 XPI，能否常规安装以 Thunderbird 提示为准。
5. 点击 Spaces 侧栏 NotebookAid 或工具栏按钮。出现笔记页后可搜索、按文件夹及标签过滤、分页和预览；首次打开不会自动启动程序。连接断开时点击启动后台，或先手动打开桌面应用。

标签 API 要求 messagesRead 和 messagesTagsList 权限；本 addon 只读取标签定义，不读取邮件正文、不修改邮件或 Thunderbird 标签。请查看并确认安装权限提示。

## 操作验收

- 主窗口隐藏至托盘后，搜索和预览仍可用；完全退出后清除预览并提示断开，不自动启动。关闭 Thunderbird 后桌面进程仍在。
- 在桌面保存笔记，检查 addon 列表和已选预览刷新。切换笔记本、隐藏笔记、锁定应用或锁定加密内容后，旧预览须清除；按 ID 请求不可绕过过滤。仍可见的普通笔记不因笔记本加密锁定而消失。
- 点击在桌面编辑，窗口显示并定位同一笔记；已有草稿先按既有切换流程保存，失败时不切换。编辑中的笔记禁止从 addon 删除；选择其他笔记结束其会话后，可确认移至回收站，在桌面回收站恢复。
- 桌面与 addon 协议不兼容应提示升级匹配版本；重启后台后游标失效，重新拉取当前列表，不重放隐藏笔记事件。
- 点击“从 Thunderbird 导入标签”：保存当前 Thunderbird 配置的独立 profileId，将来源 key、名称、颜色映射到本地标签。同名本地标签保留，必要时新映射名添加 Thunderbird 后缀；不会修改邮件标签。同步之后来源标签增删改会更新已映射的当前笔记本；来源删除仅标记缺失，保留本地标签和笔记关联。切换至其他笔记本需单独同步授权。
- addon 与桌面语言和主题一致；八语言新增标签已提供。浅／深色、缩放和窄窗口需人工检查。
- 所有应用确认对话框标题前的 info 图标已移除；警告及安全专用图标保留。选择笔记本与锁定／解锁入口位于新建笔记上方，折叠时只显示图标。

## 传输与隐私边界

仅本地 Native Messaging 和带令牌的命名管道，无 HTTP 服务、AI 请求或外部预览资源。预览 HTML／Markdown 清洗后显示，Delta 使用只读 Quill；所有外部图片、链接导航、脚本及活动嵌入禁止。PNG／JPEG／GIF／WebP 附件可分块显示；SVG 和其他媒体留在桌面查看。每次分块读取重验可见性与版本，正文／图片只保留在内存，页面失效时清除 DOM 并释放 Blob URL，不存 browser.storage。storage.local 仅保存随机 profileId 和已授权同步的笔记本 ID。

协议版本 1，帧上限 64 KiB：笔记页每次最多 20 条，组织每次 30 条，正文每块 4096 个 UTF-16 字符，图片每块最多 32 KiB。变化通知为不含笔记 ID、标题和正文的失效游标；长轮询每 250ms 检查变化、最多等待 15 秒。正常本地连接在收到通知时清除旧预览；断线按超时清除并重新连接。任意已经显示给 addon 的内容不能被加密撤回用户截图或系统内存副本。

## 验证记录与限制

核心专项、实际 C# 桥接和模拟 browser API 的页面检查记录见 implementation-plan.md。本轮不把 Electron 中的 addon 页面检查当成 Thunderbird Spaces、权限、原生安装及真实标签事件已验证。未操作用户真实笔记本、Thunderbird 配置或邮件；真实安装与双端操作由用户验收。

## 回退

完全退出应用与 Thunderbird，先用当前 Register-Bridge.ps1 -Remove 撤销本目录新旧注册，再使用保留的 0.9.3-t09.3 ZIP 替换程序，并卸载或换回旧 T02 addon。笔记内容和架构未因 T10 升级，标签来源字段向后兼容；旧版会忽略这些字段，但重新编辑映射标签可能丢失其来源信息。回退前可按 T09 备份整个笔记本。换便携路径时重新运行对应 Register-Bridge.ps1；撤销注册可加 -Remove，脚本只删除属于该目录的注册项。

官方核对：[Spaces API](https://webextension-api.thunderbird.net/en/mv2/spaces.html)、[消息标签 API](https://webextension-api.thunderbird.net/en/mv2/messages.tags.html)。

## 应用状态目录迁移

首次运行将 %APPDATA%\NotebookAid-T02 中已知应用配置复制并校验到 %APPDATA%\NotebookAid\state，以同级暂存目录原子发布。保留旧目录，不移动笔记本或修改登记中的笔记本路径；不复制会话缓存或旧运行令牌。Passkey RP ID 仍为 notebookaid.local，因此不要求重新创建 iPhone 凭据。旧进程仍运行时拒绝迁移，目标已有新状态时继续使用新状态，未知非空目标拒绝覆盖。旧文件和阶段目录保留以便失败检查；未对用户真实状态执行迁移。回退程序会使用原先旧状态，因此迁移后的设置修改不会自动回写旧状态。

插件配置迁移使用[官方扩展间消息接口](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessageExternal)，真实 Thunderbird 配置交接与 iPhone 解锁仍需用户验收。
