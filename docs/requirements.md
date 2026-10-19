# 需求规格

MCP 新增决定（2026-10-19）：用户批准“Codex 插件＋本地 stdio MCP＋NotebookAid 后台核心”的方案，并要求按项目规则逐项交付、等待验收。首期只提供创建 TXT／Markdown 笔记，默认 TXT；目标为事先绑定且后台已打开的笔记本。不自动启动程序，不操作编辑器，不开放任意文件路径，不自动调用 NotebookAid 的 AI 提供商。MCP-04 补充决定：应用被 Passkey 锁定时，可发起一次系统认证，由用户通过已注册的 Passkey／Windows Hello 解锁；不得读取或导出私钥、绕过用户验证。成功后重新检查授权及目标，再沿用原 requestId 继续；取消、失败或超时保持锁定且不创建，合并并发认证请求以避免反复弹窗。认证等待与创建分开处理，不替代笔记本主密码。搜索、读取、附件、修改／删除、Telegram 和远程访问留待独立授权。MCP-01 仅验证隔离合成数据连接，正式授权及插件分发不在本项交付范围；见 [MCP-01 验证说明](mcp-connection-testing.md)。

MCP-02 实施边界：新增独立于界面和协议的创建服务，由宿主提供可信库／文件夹绑定和当前状态；请求不能自行声明授权。复用已有单写入核心及保存结果，TXT 默认、Markdown 可选；核心正文上限沿用 UTF-8 2 MiB，不截断。应用锁与笔记本主密码锁分别检查，失败返回稳定错误，成功只返回有限回执。尚未完成 MCP-03 授权前不开放正式外部传输；见 [核心入口验证](mcp-core-testing.md)。

MCP-03 实施边界：每个客户端使用独立随机凭据，持久授权绑定精确笔记本和文件夹，默认无授权且不监听。服务端仅保存 token 摘要，逐次认证与检查范围，撤销立即生效且重启后保持。独立本地管道只提供 create，不允许自助授权或读取／搜索／修改／删除；公开运行信息不得包含 token。宿主授权管理仅为受信任的进程内部接口；用户配置界面、凭据安全交付和正式插件安装留待 MCP-06。应用锁当前只返回 APP_LOCKED，不提前实现 MCP-04 的认证窗口。正文 UTF-8 2 MiB 限制适用于新传输，丢失提交回执时保留不确定状态并复用原 requestId；见 [客户端授权验证](mcp-authorization-testing.md)。

MCP-04 实施边界：已授权创建遇到应用锁时，允许一次独立的内部 unlock 认证阶段，复用系统 WebAuthn 与已注册 Passkey 的签名验证；不读取私钥或显示编辑器。并发等待合并为一次认证；成功后重新检查授权、状态、当前库和目录，再以原 requestId 及内容创建。取消、失败或超时不创建、不自动反复认证；全部等待者断开或宿主退出时中止认证。认证等待期限与创建期限分开，后台离线不自动启动，忙状态拒绝写入，应用解锁不替代主密码。正式插件交付仍在 MCP-06；见 [后台状态与解锁验证](mcp-background-testing.md)。

MCP-05 实施边界：创建工具明确 TXT 默认、Markdown 可选及 UTF-8 2 MiB 限制；每个新意图使用新的 UUID，同一创建重试沿用原 requestId 与参数，复用已有核心持久操作记录，不另建写入器或账本。认证等待期间固定输入快照；提交后丢回执或意外分派异常报告 COMMIT_STATUS_UNKNOWN，不自动生成新 ID 重写；saved=true/indexed=false 仍为成功。通过进程退出、真实断线、并发和重启验证去重；不承诺用户清理历史、永久删除或恢复旧备份后的无限期重放。见 [创建与重试验证](mcp-create-retry-testing.md)。

状态：T01–T06-A 已批准；T06-A 已提交，T07 及本轮编辑界面调整待用户验收。更新日期：2026-10-11。

本文中的“已确认”来自用户在本聊天及此前“评估 Thunderbird 记事本方案”（`01a1204e-6566-7dd0-afd3-0c34d98bb474`）中的决定。后续新增需求与建议默认值分别记录；技术细节需对应任务验证，记录计划不等于实施授权或验收通过。

## 已确认需求

| 编号 | 要求 | 主要任务 |
|---|---|---|
| R01 | 产品名 NotebookAid，副标题“AI 笔记与写作助手” | T01、T14 |
| R02 | 独立应用＋共享本地核心＋轻量 Thunderbird addon；共用一份笔记本 | T02、T03、T10 |
| R03 | 独立应用负责编辑、数据、目录、文件写入、搜索、导入导出及备份 | T03–T09 |
| R04 | 创建、编辑、保存、删除；所有笔记本地保存，可设置保存目录 | T03、T07、T09 |
| R05 | Markdown、HTML、TXT，默认 Markdown；可导出三种格式副本 | T04 |
| R06 | Quill 2.x；Markdown／HTML 富文本编辑，纯文本普通编辑 | T02、T04 |
| R07 | 文件夹、多层子文件夹树与笔记移动 | T05 |
| R08 | 关键词搜索、标签过滤；独立应用与 addon 共用搜索接口 | T05、T10 |
| R09 | 本地标签独立管理；映射 Thunderbird 标签的标识、名称和颜色 | T05、T10 |
| R10 | Thunderbird 删除标签不直接删除本地标签、笔记或关联 | T10 |
| R11 | addon 提供类似 Tasks 的标签页及侧边入口，可搜索、查看、删除，编辑时打开独立应用 | T10 |
| R12 | 应用窗口未打开时 addon 仍能搜索；关闭 Thunderbird 后独立应用继续运行 | T02、T10 |
| R13 | addon 删除正在编辑的笔记必须拒绝，并提示正在编辑 | T03、T10 |
| R14 | 保存后通知 addon 更新列表及预览；重连后核对版本 | T03、T10 |
| R15 | 从 Thunderbird 导出的 ICS 导入 Tasks；第一版不做任务回写 | T13 |
| R16 | ChatGPT 订阅登录、Gemini API Key、Claude API Key；模型选择和连接设置 | T11 |
| R17 | 第一版提供 AI 辅助写作 | T12 |
| R18 | 对已保存笔记手动生成并保存摘要，默认不自动生成 | T12 |
| R19 | 逐笔记加密，默认不加密；文件夹名称不加密 | T08 |
| R20 | 笔记本主密码＋独立恢复密钥；恢复密钥可恢复访问并重设密码 | T08 |
| R21 | 隐藏笔记不在 Thunderbird addon 中显示，仍可在独立应用管理 | T08、T10 |
| R22 | 自动保存，显示保存状态和失败信息 | T03、T04 |
| R23 | 置顶、最近使用 | T05 |
| R24 | 回收站、历史版本 | T07 |
| R25 | 图片和附件 | T06 |
| R26 | 定期备份及恢复能力 | T09 |
| R27 | 主题支持 | T02、T14 |
| R28 | 极简界面，接近 Mail AI Assist 风格，采用开源图标 | T02、T14 |
| R29 | 英语、德语、法语、意大利语、西班牙语、葡萄牙语（葡萄牙）、简体中文、繁体中文 | T02、T14 |
| R30 | 首版 Windows 10 及以上 x64；架构预留 macOS、Linux | T02、T15 |
| R31 | Thunderbird 最低 157.0.1，按 2026-10-09 的 Release 稳定渠道确定 | T02、T10、T15 |
| R32 | 固定技术路线：Electron、TypeScript、Angular、Quill 2.x、SQLite、Native Messaging、Lucide | T02 |
| R33 | 首版开源与本地个人使用；BSD-3-Clause；Jin Lu；it@live.cn | T01、T15 |
| R34 | Gemini Notebook 同步延期至第二版；商业发布以后评估 | T01 |
| R35 | 每项任务交付后等待用户测试与明确批准，才执行下一项 | 全部 |
| R36 | 参考用户提供的 ZUB Esther 截图，提供通知卡片与消息历史管理；弹出位置可选右下角，统一当前主题和图标风格 | T03-A、T14 |
| R37 | 持久记录多个笔记本的保存路径；侧栏“选择笔记本”打开列表，可切换已保存库或添加新库 | T03-B |
| R38 | 侧栏“全局设置”更名为“设置”，其内区分全局设置与各个笔记本设置，明确生效范围 | T03-C、T08、T09、T11、T14 |
| R39 | Windows 桌面右键“新建”子菜单增加带主图标的“NotebookAid 笔记”，文字按安装语言翻译；Windows 11 使用现代菜单，Windows 10 使用传统菜单；点击打开当前笔记本并新建笔记 | T15-A、T14、T15 |
| R40 | 保留 Markdown／HTML／TXT，未来新增可选 Delta 原生富文本笔记；独立任务实施，不迁移既有笔记，不作为默认对外交换格式 | T06-A |
| R42 | NotebookAid 后台运行时，通过本地 Codex 插件／MCP 创建笔记；复用单写入核心，不操作用户界面，逐项交付验收 | MCP-01–MCP-07 |

## 2026-10-09 新增需求与设计方案

用户明确要求“先不修改，告诉我你准备怎么做，然后固定新需求，加入现有的开发计划”。该方案轮次仅更新文档，没有修改程序、安装依赖、迁移配置或生成新程序包。R36–R38 是已确认需求；该轮为方案阶段。用户随后确认“Angular CDK＋项目自己的通知组件，只保留最近100条，其他按你的意见完成，开始T03-A吧”。因此方案已确认、容量调整为 100 条，该轮仅 T03-A 获实施授权；此后 T03-A 已通过、T03-B 已获授权，见当前任务状态。

### R36 通知卡片与消息中心

- 参考截图中的“类型图标＋标题＋消息内容＋关闭＋查看历史”结构，保持 NotebookAid 的紫色强调色、细边框、圆角、浅色／深色／跟随系统；全部操作继续配 Lucide 图标。成功、信息、警告、错误用小面积语义颜色区分，并保留文字。
- 建议默认右下角，在全局设置中选择四角位置。成功消息 4 秒、信息 5 秒、警告 8 秒后关闭；错误保留到手动关闭。悬停／键盘聚焦暂停倒计时，同屏最多 3 张，溢出消息仍进入历史。通知不抢占编辑焦点。
- 顶栏增加铃铛及未读数量；点击或在卡片中点击“查看历史”，打开右侧消息中心抽屉。按时间倒序，显示时间、类型、消息、关联笔记本与已读状态；提供类型／未读／笔记本筛选、单条与全部标记已读、单条删除、清空历史（确认后执行）。成功消息默认已读（含合并消息与旧版成功记录），不计入铃铛未读数；Info、警告、错误默认未读。关闭卡片不删除历史、不改变已读状态；打开抽屉也不把所有记录自动标已读。
- 按用户确认，仅在本地持久保存最近 100 条，超限按最旧时间淘汰，UI 明示容量；该上限仅针对操作消息，不涉及笔记历史版本或笔记文件。消息历史在应用重启后保留，与可重建的笔记索引分开存储。
- 手动保存、重建索引、切库和明确设置提交显示结果；自动保存成功只更新保存状态，不逐次弹出或占用历史。自动保存失败进入消息中心；同类连续失败按库与操作聚合计数，完成进度更新同一条记录，避免刷屏。
- 历史只保存结构化的消息类型、时间、状态、关联库标识和允许的简短参数。不写入笔记标题／正文、解密内容、密码、密钥、令牌、原始 API 响应、HTML 或堆栈。允许显示库的本地名称；诊断详情保留稳定错误码。消息存储失败不能把已经成功保存的笔记报告为保存失败，也不能递归生成错误通知。
- 推荐 Angular CDK Overlay／A11y 配合项目自己的通知组件与消息存储。CDK 为 MIT；已锁定兼容版本 @angular/cdk 22.2.2；本次实施仅新增该依赖；来源与候选比较见 [许可记录](sources-and-licenses.md)。消息历史不是 CDK 或 AlertifyJS 自带的项目业务能力，需在 NotebookAid 实现。

### R37 多笔记本列表与切换

- “选择笔记本”进入列表页，不再直接弹出目录选择框。每行显示名称、完整路径、最近打开时间、当前库标记及可用状态；当前库也应在主界面明确显示。
- 提供“打开”“添加已有笔记本”“创建新笔记本”“修改显示名称”“重新定位”“从列表移除”。移除仅删除本机路径记录，不删除磁盘上的笔记本；当前库需先切换或关闭后才能移除。
- 添加已有库必须验证库清单与格式，创建新库只接受空目录／明确新建目录。不存在、离线、无权限、格式不兼容或被其他进程占用时，保留列表项并说明原因；打开旧记录失败不得在原路径自动创建空库。
- 一次只激活一个库。切换前保存当前草稿，保存失败留在原库；目标库验证、锁获取和配置持久化成功后才完成切换，切换失败保持原库可用。阻止并发切换；晚到保存或索引结果不能写到或显示成新库的结果。
- 按规范化 Windows 路径去重，维持现有路径与链接检查。相同 libraryId 出现在不同目录时明确提示可能是副本，不自动合并记录或改写 ID。重新定位用于已移动库，核对原 libraryId 后更新路径，不移动文件；实际数据搬迁仍属 T09。
- 建议启动尝试上次成功打开的库；不可用时显示库列表与原因，不默默切到其他库。路径记录位于应用配置目录，独立于各库的笔记文件。

### R38 设置层级

| 层级 | 本轮拟提供内容 | 生效范围 |
|---|---|---|
| 设置 → 全局设置 | 语言、主题、通知位置和历史管理入口、默认自动保存开关与 1–60 分钟间隔 | 当前应用，自动保存默认开启、5 分钟 |
| 设置 → 笔记本设置 → 选择库 | 显示名称、路径与状态；自动保存“继承全局／使用本库设置”；当前库索引状态与重建入口 | 明确选中的库，其他库不受影响 |
| 后续笔记本设置 | 历史保留、加密与恢复、备份计划／目录 | 随 T07／T08／T09 功能交付，当前不放可操作的假设置 |
| 后续全局设置 | AI 账户连接、Thunderbird 连接、关于与许可等 | 随 T10／T11／T14／T15 交付 |

- 建议各库默认继承全局自动保存；本库覆盖可设置开关和间隔，提供“恢复继承”操作，显示最终生效值与来源。关闭定时保存仍保留手动保存、切换笔记／笔记本和正常退出保存。
- 可查看已登记库的本机偏好；离线／未激活库的维护按钮禁用并提示先打开。自动保存覆盖和显示名称先作为本机按库记录的偏好，不承诺随复制笔记目录迁移到另一电脑；加密等权威库配置按后续任务单独设计。
- 新应用配置由主进程／共享核心校验和写入，通过受限 IPC 访问。升级时备份旧路径配置与非敏感偏好，导入当前库记录和现有主题、语言、自动保存值；默认保留原配置以支持回退，不改动笔记修订、正文或现有笔记数据库格式。

方案已确认；用户于 2026-10-09 明确“T03-A验收成功，开始T03-B”，T03-B 已通过，T03-C 已获用户批准，当前实施 T04；执行顺序和验收门槛见 [实施计划](implementation-plan.md)，新增检查见 [验收清单](acceptance.md)。

## 第一版交互与可靠性规则

以下是对已确认功能的具体设计建议，随 T01 一起审阅：

- 每篇笔记只有一个主格式；其他格式是导出副本，不在副本与原笔记之间自动双向更新。
- 从 T07.5 起，关闭原生窗口、侧边栏退出及托盘退出均先确认，再结束应用和后台；“隐藏到托盘”仍可单独保留后台。addon 不应在用户明确退出后反复自动重启，显示连接状态并提供启动操作。
- 尚未运行时，addon 可按需启动后台；只有打开编辑操作才显示编辑窗口。
- 编辑锁按编辑会话判断，自动保存不释放锁；普通预览不占用编辑锁。删除含编辑中笔记的文件夹应整体拒绝。
- 删除默认移入回收站；永久删除由用户主动执行。确认保留规则前不自动永久清理。
- 摘要独立保存，记录来源正文版本；正文改变时提示摘要可能过时，不自动重新调用 AI。
- T12 将摘要作为可选笔记元数据保存在架构版本 8，沿用历史、逐笔记加密、完整备份与跨库导入；首次保存摘要前通过现有升级确认先备份。普通写作不要求架构升级。本轮文字请求不包含图片／附件，返回纯文字；单篇格式导出不包括独立摘要。
- AI 结果先预览，再由用户插入或替换，并支持撤销。建议命令包括润色、改写、扩写、缩写、翻译、续写和自定义要求。
- AI 请求失败不改正文，不自动换提供商或计费渠道；晚到响应不得覆盖新版本或重新创建已删除笔记。
- 加密、Thunderbird 可见性是独立设置。隐藏过滤覆盖列表、搜索、计数、摘要、最近记录、按 ID 读取和已有预览。
- 普通编辑、搜索、保存、格式转换和备份不需要大模型或联网；AI 请求只在用户主动操作时发送所选内容。
- 原生接口和文件路径不能让 addon／渲染进程任意读写用户目录；访问边界由核心执行。
- 主界面采用三栏；主题建议为浅色、深色、跟随系统，首次使用跟随系统。

## 加密与恢复边界

- 2026-10-12 用户最终确认分层解锁：“用 passkey 解锁应用，然后用密码解锁加密笔记本”。目标设备为 Windows 11 与 iPhone iCloud 钥匙串。应用锁可选；Passkey 不承担笔记本解密，笔记本继续使用独立主密码和恢复密钥。Windows 身份验证界面由系统提供，其他应用弹窗继续使用 CDK。

- 主密码可在全局设置中开启或关闭，也可对每个笔记本分别开启或关闭（2026-10-12 用户确认）。全局默认关闭，只控制默认开关，每个笔记本使用独立主密码和恢复密钥；开关变化不得隐式解密已有笔记或移除其密钥保护。
- 用户确认自动锁定策略：解锁后连续 15 分钟无操作自动锁定，应用退出或切换笔记本时锁定；锁定前若保存失败，保留编辑并提示，不丢弃未保存内容。
- 对选定加密笔记，保护正文、标题、摘要、附件及相关历史；磁盘搜索索引不落盘这些内容的明文。
- 文件夹名称可见。随机 ID、文件大小、时间等结构元信息可能可见；这一方案不承诺隐藏笔记存在或流量特征。
- 锁定时不能读取正文或检索正文。解锁搜索使用可清除的内存索引；锁定后清除 UI 中的敏感内容和缓存。
- 恢复密钥由用户单独保管，不默认与备份一起保存，不上传给开发者；主密码与恢复密钥均丢失时无法解密。
- 恢复密钥不代替数据备份。备份必须携带可恢复的加密元数据，但不得包含明文解密密钥。
- 导出普通 Markdown／HTML／TXT 为明文操作。加密笔记发送给云端 AI 前需明确提示发送范围。
- 启用加密不能追溯清除用户复制出的明文、外部文件和旧备份；T08 必须说明现有本地历史及缓存的转换结果和残留边界。

## 范围外

第一版不实现 Gemini Notebook／其他外部笔记服务同步、完整双向 Tasks 同步、商业分发、macOS／Linux 安装包、多人实时协作、移动端、网页端、OCR、语音转写、知识图谱或插件市场。后几项为范围控制建议，新增时另行确定任务。

第一版按单用户本地笔记本设计，不支持多个计算机同时写同一个网络或云同步目录。多进程访问由单一本地核心协调。

## 待细化但不阻挡 T01 的事项

| 事项 | 处理时间 | 当前边界 |
|---|---|---|
| Electron／Angular／TypeScript 等精确版本与 Windows build | T02 | 选择可兼容组合并锁版本，不能只写 latest |
| Markdown／HTML 支持范围、Quill 扩展 | T02、T04 | 不因存在扩展就承诺任意内容无损转换 |
| 自动保存间隔、历史快照频率与数量 | T03、T07 | T03 默认开启、5 分钟，全局可关闭或设置 1–60 分钟；仅有修改时保存，继续输入不推迟计时。历史保留数量仍在 T07 确定；输入法组合期间不触发保存 |
| 定期备份频率、保留数量和目标目录 | T09 | 2026-10-12 用户确认：默认关闭，按笔记本选目录后开启每日备份，仅应用运行时执行，启动提示错过，不自动删除旧备份 |
| 默认笔记本路径、附件大小限制 | T03、T06 | 路径可更改；限额与失败提示在实现前明确 |
| 加密算法、密码派生参数和恢复密钥格式 | T08 设计前 | 使用成熟库；参数与格式版本化，并做错误密码和损坏数据测试 |

上述建议可在用户审阅后调整，不可伪称已经实机验证。

## Windows 桌面新建入口（R39，2026-10-09）

- 用户确认：入口位于 Windows 11 桌面右键的 New／新建子菜单，Windows 10 位于传统右键菜单的新建子菜单。显示主程序图标，简体中文名称为“NotebookAid 笔记”，按安装时选择的语言提供对应翻译。
- 拟定交互：应用运行时使用当前活动库；应用未运行时启动并打开上次活动库。新建默认格式笔记，显示桌面窗口并定位编辑器。创建发生在笔记本中，桌面不留下空白笔记文件。
- 异常处理：尚无可用库时引导选择／创建；库不可用、被占用或锁定时显示具体处理入口，不静默切换其他库或重建空库。已有未保存编辑沿用核心保存保护；保存失败时保留草稿并停止新建。每次有效点击只创建一条笔记，重送请求去重。
- 技术候选：专用文件类型／ProgID 的 ShellNew Command 调用应用的新建入口，复用主进程单实例与统一笔记核心；不占用通用 .md／.txt 关联。扩展名与注册细节在原型验证后锁定，不改变现有笔记存储格式。
- Microsoft 文档确认 ShellNew Command 可以启动应用、菜单文字来自 ProgID 描述；Windows 11 现代 New 子菜单的展示、图标、无桌面残留行为必须实机验证，尚未验证，不能用仅出现在“显示更多选项”代替验收。若原型无法满足，先报告限制并讨论调整。
- 安装包提供可选集成项；升级维护安装路径和语言，卸载仅清理本程序拥有的注册项，保留笔记。便携版不自动注册。系统 New 注册可能同时出现在资源管理器目录背景菜单，原型需记录该行为；不承诺仅限桌面。
- 官方依据：[Microsoft Shell New 子菜单扩展](https://learn.microsoft.com/en-us/windows/win32/shell/context-menu-handlers#extending-a-new-submenu)。本轮仅固定需求和计划，没有修改程序或注册表。

## T15 安装与更新补充（2026-10-14）

- 用户明确搁置 T15-A，直接授权 T15；R39 保留为未完成，不加入本次安装包，也不作为本轮交付通过项。
- 安装向导支持当前用户与本机器所有用户两种模式；机器模式使用管理员权限及机器级桥接，用户的设置、凭据、笔记本注册和笔记仍各自独立。
- 用户要求支持自动更新，并确认“先实现机制，发布地址稍后配置”。设置提供自动检查／下载开关、状态和检查入口；下载后先确认并保存当前编辑，再重启安装，不在正常退出时擅自安装。
- 未配置发布源与签名发布者时明确提示，不发起请求。后续使用 HTTPS 发布目录和 Windows 签名校验，拒绝降级和无签名发布配置；真实端到端更新待配置后验收。
- 升级保留程序回滚副本，卸载默认保留笔记和用户设置；未知安装目录内容、运行进程或路径链接导致停止，不强制结束应用或递归删除用户数据。

## Select 控件外观补充（2026-10-10）

用户要求所有 Select 触发按钮左右留白一致，原生菜单改为主题浮层；菜单圆角与触发按钮一致，背景、边框、选中勾号采用现有 UI 配色。纳入 T04 验收修正，复用 Angular CDK，不新增依赖。保留现有选择和保存语义，支持键盘选择、Escape、Tab 和点击外部关闭；Quill 标题选择器同步外观。

## T04 HTML 导入策略变更（2026-10-10）

用户要求导入时清除影响应用安全／行为的内容，发现清除项时告知用户，保存清理后的 HTML；保留常用属性和结构，无法无损富文本编辑的部分继续保护。此决定覆盖此前新导入 HTML 一律原文保存的约定。实施见 [HTML 导入与编辑边界](html-import-policy.md)。原文件不改，已存在笔记不迁移。版本 0.4.0-t04.4，T04 仍待验收，未进入下一任务。

### T04 源码保护诊断补充（2026-10-10）

用户要求 Markdown 不得显示为 HTML；对 Markdown 不支持的结构和 HTML 不支持的标签/属性逐项说明，并提供切换富文本所需的调整建议。源码仍可保存，不要求删除内容。源码编辑后须重新检查，不能把旧诊断当作当前结果。

### T04 列表支持补充

按用户授权先实现任务列表和嵌套列表的富文本编辑、格式转换、保存重开。复用 Quill 2.0.3，不新增依赖。图片和表格必须等待本步用户验收后再实施；分隔线暂不实现。

### T04.7 富文本扩展

列表已验收后，用户授权图片、表格和 Quill 支持的语言代码块。范围为受控图片显示、基本矩形表格和语言标签/高亮，复杂结构保留源码保护；分隔线仍不实现。语言高亮依赖本地 highlight.js，不使用 CDN。

## 可选 Delta 原生富文本笔记（R40，2026-10-11）

用户确认：“保留现有三种格式，未来增加可选的 Delta 原生富文本笔记，作为单独任务加入现有开发计划”。本次仅固定需求，不授权开始开发。

- 新增可选“NotebookAid 富文本”类型，以完整 Delta 文档作为该类型的权威正文；保留 Markdown 默认值和现有三种格式的存储、编辑、导入导出行为，不批量迁移旧笔记，不同时维护两份权威正文。
- 标题继续独立保存。原生格式须定义版本、支持的属性／嵌入结构和自定义格式约定；具体扩展名和序列化结构在 T06-A 实施前确定。
- 普通分享优先导出 Markdown／HTML／TXT；转换遇到表达不了的内容时明确提示，不静默覆盖原笔记。Delta 不承诺承载任意 HTML／CSS，也不取消源码保护。
- 原生导入需由核心校验结构、大小、属性及资源地址，未知版本／扩展明确拒绝或保护，不丢弃后悄悄保存。附件沿用 T06 的受控管理，不自动加载外部资源。
- 原生迁移／交换须明确元数据和附件的携带方式；单个 Delta JSON 不等于完整备份。增量历史、实时协作不属于本任务。

## 原生跨库导入（R41，2026-10-11）

用户授权 T05-A：“来源旧库保持不变，只升级目标库和导入的数据”，完成后再验收 T05 其他项。

- 目标库卡片提供“从其他笔记本导入”。先选择来源并预览，再确认升级／备份／导入，不产生中间交换格式。
- 来源只读；保留原生正文、标题、组织信息、置顶和完整可达历史。仅在目标映射旧数据并升级目标版本。
- 先校验源数据与版本；未知较新格式不自动降级。预览提示版本变化、数量、重复和冲突。原生导入不重新清洗或有损转换正文。
- 写入前创建并校验目标完整备份（排除进程锁），失败回滚，意外中断下次启动恢复。导入结果、备份位置及错误需明确反馈。
- 重复来源快照跳过；更新来源另建副本，现有目标笔记不覆盖。合并同路径文件夹，同名异色标签自动改名。
- 详见 [T05-A 验收与回退](t05a-testing.md)。未来附件／加密／Delta 阶段须同时扩展原生导入能力；当前遇到不支持结构明确阻止，不悄悄忽略。

## 界面极简原则（2026-10-11）

用户要求以后完成新功能时优先整合进已有显示区域，保持页面整洁美观。优先复用工具栏和菜单；上下文操作按需显示，避免不断增加常驻按钮行。编辑操作统一在编辑工具栏，笔记属性仍归标题附近的属性区域。T05 待验收期间修正：表格菜单、代码语言上下文选择、图标化撤销／重做、图片按钮帮助提示。

界面约定（2026-10-11）：新建笔记格式选项需明显高亮；互斥编辑模式使用主题一致的分段式单选控件；导出格式和导出操作与编辑模式合并一行，窄窗口换行。编辑区无需显示 Quill 版本，发行包保留第三方许可声明。

T05 验收补充：支持持久化的同层文件夹手动排序；所有标签展示入口默认名称自然 ASC（忽略大小写）；组织编辑失败提供针对操作的重试和保留表单的取消；删除仍为 T07。

文件夹手动排序同时支持管理页拖动手柄与上下按钮，同层移动、保留子树，不用于跨父级移动；点击保存排序持久化。

### Compact navigation and fullscreen editor

- Sidebar supports an icon-only collapsed rail with right-side hover/focus tooltips. Persist its state in global settings; default to expanded for existing settings.
- Tag filter label stays on one line, with reserved space for count and chevron.
- Current-note fullscreen editing hides navigation, note list and application header without remounting the editor. Provide a toggle near Save, Ctrl+Shift+F to toggle and Escape to exit after dismissing overlays. Do not persist fullscreen mode. Keep save failures visible.

- The note action bar (format/version, save status, fullscreen toggle and Save) stays visible at the editor viewport top while its contents scroll, in both normal and fullscreen modes. The fullscreen control includes its current on/off state as text and a selected visual state.

### Notebook terminology and collapsed folder navigation

The product name for a library is now Notebook (Chinese: 笔记本); keep internal library identifiers, storage paths and user-defined names unchanged. The sidebar notebook selector uses BookOpen, matching notebook cards. In collapsed navigation, use one centered folder icon that opens all folders and Unfiled in a scrollable right-side menu, retaining hierarchy and persisted order. The organization page and entry are named 文件夹与标签管理 (Folder and tag management).

## 香港繁体及八语言完整性（2026-10-11）

用户指定繁体中文采用中国香港用语。八种界面语言使用完整独立字典，新增文案由 TypeScript 检查键完整性，不再以简体中文或英语隐式填补缺项。繁体选项显示「繁體中文（香港）」；保留既有配置 ID `zh-TW` 以兼容已保存偏好，界面 lang 与日期使用 `zh-HK`。正文、自定义笔记标题、文件夹和标签名称不随语言转换。

覆盖编辑器正文／标题选项、链接浮层、工具栏无障碍标签、新笔记默认标题、系统托盘及未保存退出提示。语言切换不重新创建编辑器、不改变笔记内容。


T06 实施默认值：每个附件不超过 20 MB，每篇笔记最多 50 个／200 MB；添加同名自动编号、重命名冲突拒绝。界面沿用现有操作区和主题浮层；受管图片用稳定引用，原生笔记本导入携带附件及历史。PNG/JPEG/GIF/WebP 图片和小型 UTF-8 文本可安全预览，其他格式导出后查看。首次使用升级到格式 4 并创建独立完整回退备份。详见 [T06 测试与边界](t06-testing.md)。

### T06 attachment association and schema display

Attachment association removal retains the payload and revision history and does not rewrite note content. Remaining inline image references become unavailable, explained before confirming the action. Notebook settings show the validated manifest schemaVersion; Simplified Chinese uses 架构版本.

2026-10-12 用户追加：在笔记本设置页的架构版本右侧提供手动升级按钮；最新架构只显示信息而不显示按钮。升级前确认并创建完整备份，失败保留原版本，可升级设置页中选中的非当前笔记本而不切换活动笔记本。升级本身不设置主密码或自动加密笔记。

2026-10-12 用户界面约定：密码输入框默认隐藏，右侧眼睛按钮切换可见性，重开恢复隐藏；未选中笔记时主区域只显示未选中提示，隐藏保存按钮和编辑区域。提示和按钮保持现有主题及八语言一致。

### SVG and editable image dimensions

Quill's image action accepts local SVG, with isolated sanitization and no external resource loading. Only sanitized new SVG bytes are stored; existing attachments are sanitized before display without rewriting old history. Removed content is reported. Selected images expose width, height, original aspect ratio lock and scale controls; dimensions survive saving, source/rich switching and restart. Markdown uses an inline img element where dimensions cannot be represented by standard image syntax.

T06 图片尺寸工具栏补充：选中图片时在图片下方或可见区域中间显示浮层，随滚动和尺寸变化定位，不要求返回编辑器顶部。保持现有宽高、原始比例和缩放操作。

R40 实施约定（T06-A）：选择性使用架构版本 5；完整 Delta 文档使用 NotebookAidDelta version 1，单篇原生交换使用 .nadelta / NotebookAidNative version 1，包含当前附件及完整性校验，不包含历史或组织设置。使用前确认升级并保留完整笔记本备份，普通三格式笔记本不自动迁移。

R40 容量修正（2026-10-11，用户明确要求）：原生交换与笔记附件统一，每篇最多 50 个附件、单个 20 MiB、合计 200 MiB；不再使用 20 MiB 附件总量／32 MiB 容器限制。交换文件上限覆盖 Base64 与文档元数据开销，超限或损坏必须拒绝，不可静默省略附件。

### T07 历史与回收站实施边界

T07 默认保留全部历史，不自动清空回收站，不自动裁剪旧版本。用户最终更正为“保留所有历史，并提供批量手动清理功能”：历史页允许手动指定保留最近 N 个版本，预览清理数量并确认后执行，当前版本始终保留；无自动 50 版本上限。历史恢复新增版本，恢复标题、正文、格式和附件关联，保留当前组织归属及置顶。永久删除必须主动确认，并移除该笔记本中的笔记、历史和附件，不代表磁盘安全擦除，也不删除外部备份或导出副本。

文件夹仅允许在没有子文件夹且没有笔记引用时删除；标签仅允许在没有笔记引用时删除，回收站笔记也计入引用。首次历史手动清理或组织删除使用架构版本 6，先创建完整升级备份；历史中已不存在的组织项不在恢复时复活，跨笔记本导入将失效的历史组织引用规范化。详见 [T07 验收指南](t07-testing.md)。这些为本轮实现默认值，待用户验收。
# T07 编辑界面补充确认（2026-10-11）

- 笔记归属操作保持单行：文件夹图标及所属文件夹、标签、置顶、历史版本、带文字的移至回收站；窄窗口可横向滚动，不拆行。
- 合并模式切换与编辑工具栏，整合附件和导出；空间不足时通过菜单展示格式工具和导出选项。导出格式按最长选项计算紧凑宽度，选项文字保持单行。
- 全屏编辑进入时最大化桌面窗口，笔记标题移入顶部固定保存栏；退出时返回普通窗口原有尺寸位置，标题返回原位置并保留编辑内容。按钮、快捷键和离开编辑页的退出路径一致。
- 本轮仅为 T07 验收前调整，不构成 T07 用户验收或 T08 开工批准。

### T07 source formatting and table presentation (confirmed 2026-10-11)

- Add a source beautify/minify toggle beside the editor mode switch for Delta JSON and HTML notes; use different icons and retain undo/redo. Markdown and TXT whitespace is not compressed.
- HTML formatting must preserve inline text spacing, attribute values, pre/code/raw content and CSS-sensitive whitespace. This is conservative formatting, not sanitization or aggressive minification.
- Match task checkboxes and table borders, spacing and header shading to the existing theme. Expose header/body row commands for HTML and Delta; Markdown uses its required first header row.
- Continue T07 acceptance fixes only; packaging and test deployment do not authorize a commit or T08.

## T07 dialog and fullscreen spacing correction (2026-10-12)

- Fullscreen note organization actions use equal 16 px vertical padding between the header and toolbar separators.
- Application confirmations use a shared Angular CDK dialog with existing theme colors and buttons. This includes lifecycle actions, attachment/Delta schema upgrades, and unsaved exit warnings. Native file, directory and Save As pickers remain unchanged, as explicitly confirmed by the user.
- Cancel has initial focus. Escape, backdrop and close cancel; keyboard focus stays inside the dialog. Closing/reloading/crashing the renderer cannot accept a pending operation. Main-process authorization and one-use request IDs protect responses.


## T07.5 exit confirmation (2026-10-12)

- Sidebar exit uses a Power icon and text; collapsed mode shows the icon with the existing right-side tooltip.
- Native window close, sidebar exit and tray exit use the same CDK confirmation. Saved notes show Confirm exit / Cancel. Unsaved notes show Save and exit / Discard changes and exit / Cancel.
- Inspect pending title/body/placement changes before saving; pause autosave and prevent editing while deciding. Await in-flight saves. Saving must finish successfully before exit; failure keeps the application and edits available. Cancel never saves or discards edits. Discard does not undo edits already saved earlier.
- Current architecture has one active editable note session and flushes before switching notes/notebooks; the exit check covers all pending note buffers in that session. Future multi-editor support must aggregate every session.
- This user decision supersedes the earlier close-to-tray default. Explicit Hide to tray remains available.

R26 实施约定（T09）：便携文件夹快照 `.nabackup`，包含原始笔记本内容及文件校验清单；索引重建，写锁不复制。默认每日策略关闭；开启后每 24 小时运行。恢复／迁移仅写空目标目录，保留原路径内容，校验后切换登记路径，不覆盖或自动删除原数据。错过的备份提示手动补做，成功后恢复下一次计划。

### 笔记本外观（2026-10-12 用户批准）

每个笔记本可设置颜色（默认蓝紫色、颜色选择器和清淡预定义色块）以及封面（默认无封面）。内置十个类似山和太阳的低饱和自然景色封面，也支持自选图片并进行 1:1 裁剪。选择笔记本卡片增加指定笔记本设置入口；名称前显示自定义颜色图标、路径右侧显示方形封面或占位图。顶部名称前优先封面缩略图，否则显示彩色笔记本图标，并与文字垂直居中。外观随笔记本备份及迁移；不改变笔记正文、架构和加密状态。
2026-10-12 补充确认：预定义色块扩展为十个，保持清淡配色；完成此修改后验收 T09.1。

R26 原地恢复追加决定（2026-10-12）：用户批准恢复到原笔记本目录。先在同级临时目录恢复并校验，保留当前目录为回滚副本后替换，失败时自动尝试回滚；保留副本不自动删除。恢复到其他新目录仍要求为空，不能覆盖其他笔记本。来源和目标选择窗口明确标识，错误显示具体原因。此决定覆盖早先仅允许新空目录恢复的约定。

2026-10-12 关闭行为追加决定：用户要求原生关闭窗口时询问最小化到系统托盘或退出。使用统一 CDK 对话框并保留取消，退出继续检查未保存笔记；托盘隐藏保留编辑、继续既有后台策略。侧边栏／托盘退出入口仍直接确认退出。此决定覆盖之前原生关闭只确认退出的行为。

T10 实施约定（2026-10-12）：沿用既有主机与 addon ID，Spaces 页面仅访问当前笔记本；本地协议 1、分块只读预览和不含正文的失效游标。标签映射以随机 profileId 和来源 key 为命名空间，用户先点击同步授权；来源删除保留本地标签与笔记关联。PNG／JPEG／GIF／WebP 可预览，SVG／其他媒体在桌面查看。最新用户追加：选择笔记本和笔记本锁定／解锁入口移至新建笔记上方，折叠仍仅显示图标。

T12.4 用户补充：HTML／Markdown／Delta 编辑工具栏增加下划线、删除线、文字颜色和背景颜色，位置在斜体之后、列表之前；TXT 去掉工具栏首竖线。增加独立“保存翻译”，再次进入翻译优先读取最近保存的本地内容，只有主动生成才调用 AI。翻译元数据采用架构 9，沿用逐笔记加密、历史、完整备份和跨库导入；旧结果不匹配当前正文／范围时可查看但不能应用，不自动重生成。

T13 实施补充：从 Thunderbird 导出的 VTODO ICS 以用户选择、只读预览、逐项确认导入当前笔记本，生成所选文件夹内的普通 TXT 笔记（默认未分类）；映射标题、说明、状态、优先级及日期字段。日期-only／浮动／UTC／TZID 明确保留；重复规则保留文字、例外独立导入，不展开提醒、不回写 Thunderbird。来源相同快照去重，来源变更另建副本保护本地编辑；导入前完整备份，异常和部分成功逐项报告，操作记录支持进程中断重试。

T13.2 用户批准预览后要求 Tasks 来源元信息独立保存为可见只读字段，正文仅任务描述；大量导入显示真实进度，并增加批量清空指定文件夹全部笔记，可回收或永久删除。实施采用现有 CDK 弹窗和紫色进度条，默认仅目标目录、可选择含子目录，先备份、明确数量／范围和永久删除确认。旧导入正文仅在同一 ICS 与导入记录精确核对时转换，修改过的内容保留。

T13.3 删除语义修正：永久删除笔记清理其 Tasks 导入记录，普通重导即可新增；回收站保留记录。强制选项仅供用户显式重复导入已有条目，创建独立副本。用户明确授权清理当前笔记本 43 条关联已永久删除笔记的旧记录，已备份并完成，未修改现存笔记。

## T14 界面质量交付（2026-10-13）

全局界面缩放默认 100%，提供 75%、90%、100%、110%、125%、150%、175%、200%，保存到应用设置并在重启及锁屏保持；大缩放保留当前三栏，通过滚动访问控件。新增 Ctrl+N 选择笔记格式、Ctrl+F 搜索、Ctrl+, 设置、Ctrl+＋／Ctrl+－／Ctrl+0 缩放；保留保存、全屏及撤销快捷键。弹窗、菜单、组合输入及切换期间保护上下文。八语言、主题、减少动画、控件名称和状态及安全异常提示验收见 [T14](t14-testing.md)。Windows 新建入口在本任务只准备八语言文字，实际注册与集成仍等待 T15-A 授权。

## 新手引导（2026-10-13，用户已批准预览并授权实现）

首次解锁进入应用后显示开始提示，以聚光灯遮罩及操作卡片介绍笔记本、新建、列表搜索、编辑保存、文件夹标签及设置。完成后不再自动显示，设置可关闭、继续或重新开始，暂停进度跨进程保存。欢迎及完成页面的图标和标题同一行垂直居中；旧设置默认开启且尚未开始。教学不自动修改真实笔记或执行敏感操作。采用开源库前核对许可证；本次 Driver.js 1.9.0 使用 MIT 并保留声明。验收及回退见 [新手引导](onboarding-testing.md)。

## 应用菜单与信息页面（2026-10-13，用户直接授权）

定期备份错过提示与设置按钮垂直居中。顶部主题选择器后添加菜单图标，菜单提供带图标文字的许可证、隐私声明、设置、关于；信息页面用统一 CDK 弹窗显示完整内容，关于显示实际运行版本，许可证显示项目 BSD-3-Clause 原文及随包第三方声明位置，隐私内容以实际数据路径及主动网络行为为依据。支持八语言及既有主题。验收见 [应用菜单](menu-testing.md)。

后续用户明确调整：菜单入口直接显示图标与“应用菜单”文字，不使用 Tooltip；菜单子项字号与主题按钮一致，图标缩小，关于入口显示“关于”。

## 右键菜单（2026-10-13，用户直接授权）

笔记卡片支持重命名、复制独立副本、置顶／取消置顶、删除（现有确认后移入回收站）、移动到文件夹及添加标签；编辑区支持剪切、复制、粘贴、全选。所有菜单项使用图标和文字，沿用 CDK 主题与当前保存、权限、加密和回收站语义。编辑命令保留原选区，原生剪贴板操作只执行主动选择的命令。验收见 [右键菜单](context-testing.md)。

## 关闭主密码的批量解除加密（2026-10-14，用户直接授权）

关闭主密码窗口列出当前笔记本全部已加密笔记，包括回收站；提供带图标文字的全部解除加密操作。锁定时先验证密码，标题只在解锁后可见。操作前自动备份，确认后复用逐篇转换事务，保留历史、附件和元数据，显示进度及具体失败原因。失败时保留主密码及剩余加密笔记；全部成功后用户继续关闭主密码。验收、明文边界和数据恢复见 [批量解除加密](decrypt-testing.md)。

## 启动性能（2026-10-14，用户批准分析方案并补充分页要求）

加载笔记本期间显示实际阶段及主题一致的进度，不显示误导性的空笔记本或未选中状态。列表与翻页仅使用元数据，不预读全部正文；打开笔记时读取并校验正文。主动全文搜索需按需读取未缓存正文，完整性验证仍全量检查。启动仍验证锁、恢复记录、元数据与历史引用；正文损坏在访问或完整性检查时报告，不替换或覆盖原内容。复用现有最近使用记录恢复上次打开的可读笔记。全局设置可选择每页 10／20／30／50／100 条，默认 30。计时只包含阶段和数量，不保存私密正文或凭据。见 [启动验收](startup-testing.md)。

## 彩蛋收集与开发信息条（2026-10-14，用户直接授权）

六枚彩蛋仅由明确界面动作发现，进度本机保存，默认开启，可关闭保留进度、减少动画、查看和确认重置。集齐后无声轻柔庆祝一次，关闭／跳过／Esc 可立即结束；系统减少动画显示静态效果。收集界面和动画按需延迟加载，不读取笔记正文或敏感信息，不访问网络或新增敏感接口。主题按钮随选择显示系统日月／浅色太阳／深色月亮；隐藏开发阶段信息条，不影响真实通知或备份提醒。见 [彩蛋验收](easter-testing.md)。


2026-10-14 T15 补充要求：全局设置区域按新手引导、基础设置、界面缩放、自动保存、AI 设置、安全设置（应用锁与主密码）、消息中心、彩蛋收集排列；应用更新置于末尾。笔记本设置按名称／路径／架构信息、外观设置（颜色与封面）、主密码、自动保存、备份与存储、笔记本维护排列。仅调整布局和八语言标题，保留设置存储及安全权限边界。

2026-10-14 T15 补充：用户已完全退出并授权继续更新测试目录，要求应用菜单加入带图标文字的“检查更新”。复用八语言更新文案及同一核心检查入口；点击进入全局设置的应用更新区域，显示状态／下载进度。无配置与便携版仅显示说明，不访问网络；重复点击由现有检查并发保护处理。仍待用户验收，不提交、不进入下一任务。

T15 安装向导补充：安装器与卸载器声明 DPI 感知；简体中文默认微软雅黑，繁体中文 Microsoft JhengHei。高 DPI 实际显示和控件裁切作为人工验收项。

2026-10-14 T15 补充：用户优先要求后台备份和前台进度，替换 NSIS 默认完成页图片，并提供桌面／Windows 开始菜单快捷方式选项。0.15.2-t15.2 将手动和定期备份改为分阶段异步文件 I/O、流式校验及可让出事件循环的完整性检查；只读查询与界面绘制继续响应，备份期间核心写入被保护，成功验证后才发布 backup.json 并记录完成。进度显示当前阶段真实比例，无总耗时估算。新图片使用项目自有标志和程序绘图，无新增素材许可依赖、不加入应用资源包。快捷方式默认桌面关闭、开始菜单开启，用户可分别选择，静默更新保存既有选择；仅删除或替换指向本安装的快捷方式，保留其他程序的同名链接。T15 仍待用户验收，不提交、不开始下一任务。

2026-10-14 T15 补充界面修正：用户要求隐藏侧边栏技术验证入口，并将基础设置的每页笔记数量移到主题设置之后。0.15.3-t15.3 仅隐藏入口、调整顺序及递增交付版本，保留既有设置值与内部验证逻辑。此次小修正仍待用户验收，不提交、不开始下一任务。此前0.15.2-t15.2已验收并提交fe891b8。

2026-10-14 macOS 测试发布追加授权：保留 Windows 功能，支持 macOS arm64 和 x64 独立 DMG／ZIP，由 GitHub Actions 自动构建并在 lvbeck/NotebookAid 上传测试产物，暂不创建正式 Release。Windows Passkey 门禁在 macOS 明确不支持，不自动解除已有门禁；笔记本加密保留。构建工具代码与资源不包含真实笔记、凭据及本地备份。

2026-10-14 T15 Windows CI 补充：Windows x64 安装 EXE 与便携 ZIP 通过 GitHub Actions 构建并作为测试 Artifacts 上传，同时保留插件和 SHA256 校验清单；不创建正式 Release、不启用未配置或未签名的更新源。见 [Windows CI 测试说明](windows-ci-testing.md)。

2026-10-15 测试交付补充：Windows与macOS版本统一为0.15.5，今后使用纯数字主版本.次版本.修订号，与两个插件及锁文件根版本保持一致，不使用平台／任务后缀。macOS双架构Actions测试产物需包含NotebookAid.xpi、八语言插件安装及当前用户桥接说明和校验清单，不正式发布。用户选择原生MSI，本轮仅准备详细方案，不生成MSI。现有NSIS安装器按用户后续要求将卸载显示名固定为NotebookAid，版本独立显示。

原生MSI待实施方案补充：用户明确要求MSI产品名和Windows应用列表显示名固定为NotebookAid，不拼接版本号；ProductVersion／DisplayVersion独立保存纯数字版本，稳定UpgradeCode及同安装范围内升级后的单一卸载记录纳入验收。当前仅设计，不生成MSI。

2026-10-15 原生MSI实施授权：用户明确要求按方案实现当前用户／本机所有用户安装，显示名固定NotebookAid，支持通过GitHub提供MSI更新。版本0.15.6，MSI与NSIS独立安装与更新渠道；检查、下载及签名／产品身份校验后，经用户确认调用Windows Installer，保持原安装范围，所有用户更新允许UAC授权。当前无签名发布者和正式Release，测试包不启用在线更新。README提供独立EXE／MSI下载入口，增加README.de-DE.md并与中英文互链，同步八语言插件说明；通过Actions上传测试产物，不正式发布。

### T15 installer and ten-language scope (2026-10-15)

用户要求 MSI 向导支持全部界面语言，简体中文使用微软雅黑；随后明确扩展应用日语、韩语，全部安装包支持十种语言。语言范围为 en、zh-CN、zh-TW（香港用语，兼容已有设置标识）、de、fr、it、es、pt-PT、ja、ko，AI 翻译目标语言同步扩展。README 共十种：默认英文 README.md，其余使用 zh-CN、zh-HK、de-DE、fr-FR、it-IT、es-ES、pt-PT、ja-JP、ko-KR 地区文件名，各版互链；macOS 安装桥接指南同步。DMG/ZIP 无 Windows 式向导，应用包声明十语言。用户授权 GitHub Actions 测试构建和上传产物，不正式发布。用户同时报告 EXE 和 MSI 外层 ZIP 被 Chrome 标为危险；须核实来源、哈希和检测证据，不将未签名等同误报，不绕过防护。

### Installer addon payload follow-up (2026-10-15)

Windows EXE/MSI and macOS DMG/ZIP must embed both NotebookAid.xpi and NotebookAid-Compatibility.xpi before installer construction/signing. Installed plugin content must match the standalone artifacts and current addon identity/version; missing or mismatched plugins must block test artifact upload. This follow-up creates test artifacts only and does not authorize a formal release.
The shared application language list preserves the original eight-language order and places Japanese then Korean last, including interface and translation selectors (user direction, 2026-10-15).

Fresh application-created notebooks, including the first default library directory and the settings Create action, start at latestNotebookSchemaVersion. Opening an existing notebook does not implicitly upgrade it; the explicit upgrade confirmation and backup workflow remains in place (2026-10-15).


### About and support information (2026-10-16)

- The About dialog and the bottom of global settings share software name, runtime version, author, contact, GitHub project link, expandable privacy statement, full BSD-3-Clause license, disclaimer and a voluntary Buy me a coffee action.
- GitHub points to https://github.com/lvbeck/NotebookAid and support to https://buymeacoffee.com/lvbeck. Open external destinations only after an explicit click through a fixed desktop allowlist; do not embed remote donation widgets.
- Translate all new explanatory text into the existing ten interface languages; preserve the Buy me a coffee brand and existing Easter egg triggers.


### Generated third-party inventory (2026-10-16)

- The license dialog displays component name, shipped version and license from the actual distribution manifest, including renderer/runtime dependencies, Electron/Node and platform notices. The project license remains separate. Load inventory only when the license page opens.
- Standalone XPI packages include complete bundled dependency notices, a versioned component inventory and the license file referenced by Quill. Packaging must verify their exact contents and reject vendored source/version mismatches.


### GitHub update build preparation (2026-10-16)

- Centralize the GitHub EXE/MSI update endpoints and inactive build policy. Windows signing is suspended after the unsuccessful SignPath application; signature checks must not be bypassed. macOS remains manual.
- Add a manual Actions workflow that builds/verifies Windows update candidates and uploads only test artifacts. Candidate metadata must use non-live names and explicitly report that updating is disabled. No tag, Release or publish permission is authorized.
- Future signed finalization must validate packaged feed configuration, payload inventory, trusted signer/publisher and actual product/version before hashing final installer bytes. Signing integration and real online update validation are deferred.

## T16 TXT defaults, selected note emphasis, export and printing (2026-10-18)

User authorization: defer multi-device synchronization and implement TXT as the default for new notes, visibly highlight the currently edited note card, rename Export copy to Export, show formats only after clicking Export, add PDF export, and add Print with Print preview and Print to PDF.

Existing notes retain their formats. The new-note format menu starts with TXT and keyboard focus follows it; explicit Markdown/HTML/Delta creation remains available. PDF is an output format, not a new editable storage format. Export options use the existing CDK menu and preserve current text/native exchange previews. The Print menu provides Print and Print to PDF. Print directly opens the native system dialog, without an application preview window. Windows supplies native page previews through an on-demand helper using PrintManager document-source interfaces; printing and preview use the same in-memory PDF snapshot. macOS retains its system print dialog. PDF generation uses the same A4 document layout. Remote resources and active content cannot execute or load during preview/printing. Safe embedded images remain available; attached files that are not inline images are not appended as printable pages. Protected-note plaintext output requires the existing warning. PDF output preserves existing protected-directory and no-overwrite guards.

Ten interface languages are required. No new third-party dependencies, cloud synchronization implementation, T15-A work, GitHub push or formal release is authorized by this task. Local test delivery uses version 0.15.13 and does not upgrade notebook schemas.

## T17 notebook-local preferences (2026-10-19)

User authorization: save notebook settings inside each notebook directory in preparation for future multi-device synchronization; inspect folder/tag isolation and correct it if needed.

- Notebook name, explicit autosave override (or inheritance) and daily-backup preference live in `notebook-settings.json`, bound to the stable library identity. New notebooks initialize it immediately; existing notebooks migrate their cached name and legacy local overrides on first activation or settings write. An existing valid notebook file takes precedence. Legacy device files remain available for rollback.
- Folder trees and tags already live in each notebook's `organization.json`; preserve their IDs, nested folders, tag colors and note assignments. Existing notebook appearance and encryption files remain notebook-local.
- Registry paths/IDs, backup destinations and execution timestamps, application-wide preferences and login credentials remain device-local. An inherited autosave preference continues to use that device's application default. A copied daily-backup preference does not schedule backups until a destination is configured on that device.
- Write settings atomically under the notebook writer lock; validate identity, shape and bounds, and reject damaged or linked files without replacing them. Include settings in verified notebook backup, restore and migration.
- This is storage preparation only. It does not implement cloud synchronization, cloud conflict detection, simultaneous multi-device editing or portable global settings. No GitHub push, formal release or next task is authorized.

### T17 follow-up: complete notebook archives (2026-10-19)

- Export a complete notebook as a ZIP-format `.nabook` file, with a dedicated document-and-metallic-N icon. Preserve notebook identity, notes, attachments, revision history, organization, appearance, security files and notebook-local preferences. Exclude the regenerable index and writer lock. Retain existing encryption; the archive does not add password encryption to otherwise plain notes.
- Put Import from .nabook beside Add existing notebook on the notebook page. Keep adding an existing folder and merging content from another notebook as separate existing operations. Put Export notebook in each notebook card's actions.
- Import prompts for a parent destination, confirms it will create a separate child folder, validates the archive and hashes before publication, then registers it without replacing or merging another notebook. A duplicate registered notebook identity is rejected; removing a registry entry preserves its original files. If final registration fails, retain the verified extracted notebook and report its path for recovery.
- ZIP processing and complete import validation run in a worker with progress. Restrict archive entries to the defined envelope, reject links/traversal/ambiguous paths/duplicate names, bound entries to 100002 and expanded bytes to 32 GiB, and preserve existing export files. Cancelled pickers/confirmation perform no notebook import.
- EXE/MSI installation registers the dedicated file type in the selected user/machine scope. macOS packages declare a document UTI and ICNS icon. Opening the file focuses the notebook page and makes the source available to the Import button; selecting the destination remains explicit. No ShellNew work or shared shell-cache changes.
- Add ten-language labels and automatically include the MIT ZIP dependencies/notices in the generated third-party inventory. No formal release, GitHub push, synchronization or T15-A work.

## Tag palette and Advanced Search (2026-10-19)

- Implement the approved preview with ten dark-focused preset tag colors and retain the native custom color picker. Opening an existing tag must preserve its color. No additional dependency is required.
- Replace the sidebar Pinned entry and collapsed-folder button with one Advanced Search entry. Keep the existing expanded folder tree and folder/tag management available; pinned note actions remain unchanged.
- Replace the note-card area on the search page with up to eight keyword inputs, themed AND/OR radios, descendant-inclusive folder filtering, all-selected-tags filtering and a pinned-only checkbox. Searches are explicit and separate from editor filters/pagination.
- Show a result list with pin icon/label before its title, separate folder and tag columns, then creation and modification timestamps as the final columns. Vertically center every cell. Bold literal keyword matches in titles without rendering title markup.
- Default to ten results, with 10/20/50/100 options. Return metadata only; open the selected result through the existing save/session flow. Preserve existing locked-note exclusion, clear stale results on notebook/security changes, and avoid automatic startup body searches.
- Supply complete labels for the existing ten locale IDs, build Windows EXE/MSI/portable ZIP, verify and update the authorized test directory, then wait for user acceptance. No formal release or remote push.
- Follow-up preview approval: align Add keyword and the entire AND/OR group to the keyword input width/left edge, excluding the remove control. Replace the descendant hint with a checkbox checked by default; unchecked limits the selected folder to direct notes only. Reset/new notebook restores the default. Existing callers without the new boolean retain descendant-inclusive behavior. Reuse the complete ten-language Include subfolders labels.

## T19 notebook color skins

- Implement ten notebook-color-derived skins, each with light/dark modes and automatic switching with the active notebook. Follow system remains available. Keep the default violet palette; the later user correction restores the initial muted Mist blue theme.
- Restore the original Mist blue name, selector swatch and full light/dark palette; retain version 0.15.18. Keep skin controls within existing notebook Appearance; do not add a main-page skin picker.
- Preserve legacy and custom colors without rewriting stored notebook data. The interim Capri blue selector color maps to Mist blue; custom colors use the closest preset hue, with a neutral fallback.
- Supply names in all ten languages, build and verify Windows EXE/MSI/portable ZIP, update the authorized test directory and await acceptance. No formal release or remote push.

### Startup settings (2026-10-19)

- Add Startup settings immediately after Basic settings. Automatic startup defaults off; its Window/Background segmented controls are disabled while off and initially select Background. Startup is local to the current device/user. Manual launch still opens the window; background login launch exposes the existing tray entry.
- Preserve the delivered version 0.15.19; no formal release or next numbered task.
