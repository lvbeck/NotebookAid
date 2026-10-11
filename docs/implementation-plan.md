# 实施计划与进度

更新日期：2026-10-11。各任务须分别获得用户实施授权。

## 执行规则

每次只执行一个任务：待开发 → 开发中 → 待用户验收 → 已批准。开发检查通过不等于用户验收通过；修复意见不等于下一任务授权。交付时在当前聊天通知，不自动创建新聊天、定时任务或启动下一任务。

每次交付提供文件／测试包入口、改动说明、实际检查、未验证项、用户测试步骤及回退方法。需要真实账户或实机条件的测试与模拟测试分别记录。

自 2026-10-10 起使用本地 Git 仓库（main）。用户明确验收通过一个任务后，检查该任务改动与暂存内容，提交对应源码／测试／文档／资源，使用英文 commit message，并告知提交哈希。待验收任务不提前提交，不自动推送远程。首次整体基线已在 T04 验收与侧栏修复后提交（455a4bf）；不伪造 T01–T03 的历史快照。生成目录、依赖、测试输出与环境密钥不提交。

## 任务清单

| 任务 | 内容与交付 | 状态 | 批准记录 |
|---|---|---|---|
| T01 | 需求、项目约定、架构／数据／接口草案、界面线框、验收清单、许可证与进度文档 | 已批准 | 2026-10-09：“T01 通过，开始 T02” |
| T02 | Electron＋Angular 骨架、Windows 测试包、Quill／SQLite／Native Messaging 生命周期原型、依赖版本锁定 | 已批准 | 2026-10-09：“T02 测试通过，开始 T03” |
| T03 | 本地笔记核心、稳定 ID／版本、手动与自动保存、编辑锁、索引及异常恢复 | 已批准 | T03 各子项已验收；用户明确“T03-C验收完成，开始T04” |
| T03-A | 通知卡片、位置设置、消息中心与本地历史，接入现有操作反馈（R36） | 已批准 | 2026-10-09：“T03-A验收成功，开始T03-B” |
| T03-B | 笔记本路径列表、添加／新建／切换／重新定位及异常处理（R37） | 已批准 | 用户确认“验收完成”，随后授权 T03-C |
| T03-C | “设置”入口、全局／各库分组、继承与覆盖、旧配置兼容（R38） | 已批准 | 用户明确“T03-C验收完成，开始T04” |
| T04 | Quill 编辑器、Markdown／HTML／TXT、导入导出、撤销重做及格式保真样本 | 已批准 | 用户明确“T04的测试都通过了”，侧栏修复后基线提交 455a4bf；随后授权“开始T05吧” |
| T05 | 文件夹树、移动、标签、搜索过滤、置顶和最近使用 | 已批准 | 2026-10-11：多语言修正完成后验收 T05； 2026-10-11：“开始T05吧”；同层名称唯一规则已确认；自动化通过不等于用户验收 |
| T05-A | 原生跨库导入、目标库升级、预览与备份回滚（R41） | 已批准 | 2026-10-11：多语言修正完成后验收 T05-A； 2026-10-11：“来源旧库保持不变，只升级目标库和导入的数据。开始T05A，完成后我再验收T05的其他项” |
| T06 | 图片附件、重名与路径、生命周期和缺失处理 | 已批准 | 2026-10-11：用户明确“这个修改完成后，验收T05-A和T05完成，直接开始T06吧” |
| T06-A | 可选 Delta 原生富文本笔记、版本化存储、受控导入导出与旧格式兼容（R40） | 待开发；计划在 T06 后、T07 前 | 2026-10-11 用户批准加入计划；未授权实施 |
| T07 | 回收站、恢复、主动永久删除、历史版本及保留规则 | 待开发 | 无 |
| T08 | 主密码、逐笔记加密、恢复密钥、锁定、核心可见性过滤及残留边界 | 待开发 | 无 |
| T09 | 手动／定期备份、完整性检查、恢复及存储目录迁移 | 待开发 | 无 |
| T10 | Thunderbird Spaces、浏览搜索预览、删除、编辑定位、标签映射、事件与重连 | 待开发 | 无 |
| T11 | ChatGPT 订阅登录、Gemini／Claude API Key、模型与连接管理 | 待开发 | 无 |
| T12 | AI 写作、结果预览与应用、手动摘要、取消及版本冲突处理 | 待开发 | 无 |
| T13 | Tasks ICS 导入预览、字段映射、日期时区、去重与异常报告 | 待开发 | 无 |
| T14 | 八语言、主题、快捷键、可访问性、缩放及统一异常体验 | 待开发 | 无 |
| T15-A | Windows 桌面新建笔记入口：ShellNew 可行性验证、单实例新建、本地化文字与图标、注册及撤销（R39） | 待开发，安排在 T14 后、T15 发布验收前 | 新需求已记录，待逐项授权 |
| T15 | Windows x64 安装包与 XPI、桥接注册、升级恢复、真实环境发布验收及许可清单 | 待开发 | 无 |

技术风险应在 T02 提前暴露。若原型发现已选路线存在关键限制，先说明证据、影响和具体调整建议，不默默更换框架或扩大功能范围。

## T03 新增子任务安排（2026-10-09）

用户要求先说明方案并固定需求，暂不修改程序。前一轮只改文档。用户随后明确授权 T03-A，接受 CDK 方案并将历史上限定为 100 条；该轮 T03-B／C 未开工，后续授权与交付见当前任务表。沿用 T04–T15 原编号，将新增工作放在 T03 内逐项验收。

执行顺序：用户确认方案并授权 T03-A → T03-A 交付并等待测试批准 → 用户授权 T03-B → T03-B 交付并等待测试批准 → 用户授权 T03-C → T03-C 交付并等待测试批准 → T03 整体验收；仅用户明确授权才开始 T04。不得将对子任务或文档的认可当成后一任务的授权。

| 子任务 | 具体交付顺序 | 核心验收与边界 |
|---|---|---|
| T03-A | 核对并锁定 Angular CDK 兼容版本／许可证；建立受限的通知服务及应用级历史存储；实现通知卡片与右侧抽屉、铃铛、位置选项；接入保存／重建／错误反馈；打包交付 | 浅深主题与图标统一；位置、关闭、未读、筛选、清理、重启保留；连续错误聚合、自动保存不刷屏；消息存储失败不影响笔记提交；验证键盘焦点及敏感信息不进入历史。位置设置暂接现有全局设置页，T03-C 归并 |
| T03-B | 建立版本化库注册表并导入当前路径；提供列表与添加已有／创建新库；实现安全切换、名称、移除记录与重新定位；接入 T03-A 通知；打包交付 | 多库记录重启保留；切库前保存；目标不可用／占用／保存失败保留原库；不存在的库不被重建为空库；大小写路径去重与同 ID 副本提示；移除记录不删除笔记；仅一个活动库 |
| T03-C | 将入口改为“设置”；分全局与按库设置；保留并迁移旧主题／语言／自动保存偏好；实现自动保存继承／覆盖和最终值说明；归并通知设置与当前库维护；打包交付 | 默认仍开启 5 分钟；继承与覆盖互不串库；切库后定时器使用正确库设置；离线库维护禁用；配置失败保留旧值；正常退出与手动保存不受关闭定时保存影响 |

- 详细交互、建议默认值和持久化边界以 [新增需求](requirements.md#2026-10-09-新增需求与设计方案) 为准；布局以 [界面线框](wireframes.md) 为准。
- 实现预计涉及 Angular 通知／列表／设置组件、共享配置与 IPC 合约、主进程应用状态存储及相关测试。接口变更限于新增操作与兼容适配，保留现有笔记保存契约和核心路径检查。
- 应用状态拟与笔记本内容分离：路径／偏好采用有 schemaVersion 的原子配置文件，通知历史使用独立 SQLite 表／数据库；不放入可重建的 catalog 索引。精确文件命名与版本在各子任务实施前记录。
- 配置导入前保存原文件／原始非敏感值；只导入旧版已知字段，损坏数据不覆盖唯一副本。每次交付保留上一程序包与回退步骤；旧版不理解新增设置时说明功能差异。此次没有执行配置导入或数据库迁移。
- T07 延续笔记历史保留，T08 延续库安全设置，T09 延续库备份与实际路径迁移；T10 需按 libraryId＋noteId 处理活动库变化与旧预览失效；T14 统一检查消息中心和设置页八语言、缩放与可访问性。不提前实现这些任务。

文档固定记录：2026-10-09，新增 R36–R38、T03-A／B／C、对应未勾选验收项及界面方案。本记录不是新功能完成记录，该次文档固定时可运行版本为 0.3.0-t03.2；后续实施见交付记录。

## T01 交付记录

- 实施授权：2026-10-09，用户要求开始第一个任务。
- 交付范围：本目录 README、LICENSE、AGENTS.md 及 docs 下八份规格／计划文档。
- 已确定：Angular 技术路线、首版功能、同步延期、开源个人使用、加密恢复方案、BSD-3-Clause、Jin Lu、it@live.cn、Windows 10 x64、Thunderbird Release 157.0.1 基线。
- 建议待审阅：主格式与导出副本规则、窗口／后台默认行为、文件布局和接口草案、三栏交互及范围控制细节。
- 文档检查结果（2026-10-09）：11 个文件均为有效 UTF-8；13 个本地文档链接目标存在；R01–R35 各出现一次；T01–T15 计划行与 15 个验收章节完整；代码围栏配对、无尾随空白；版权人为 Jin Lu，许可证三项条件齐全；未发现问题。
- 状态检查结果：T01 待用户验收，T02–T15 均待开发且无批准记录；验收复选框全部保持未勾选。没有运行应用、打包、GUI 或实际 API 测试，也没有将文档检查等同于功能验证。
- 尚未开展：代码骨架、依赖安装、原型、账户登录、安装打包、Git 初始化与发布。
- 回退：T01 只新增文档，没有迁移或改动用户笔记。需要回退时按本任务新增清单移走或删除文档即可；任何删除应先核对目录并获得明确授权。
- 用户批准：2026-10-09，用户明确回复“**T01 通过，开始 T02**”。

## 后续交付记录格式

每个任务完成后，在此文件追加：任务编号、交付日期、涉及文件、运行版本、已执行检查及结果、未验证事项、用户验收反馈、修复情况、明确批准信息和允许开始的下一任务。不得提前填写成功结果或批准时间。

## T02 交付记录

- 日期：2026-10-09；授权：“T01 通过，开始 T02”。
- 范围：Angular 三栏骨架、浅深主题和语言入口、Quill 内存转换、SQLite 诊断读写、Electron 安全隔离与托盘、Windows 独立启动桥接、最小 Thunderbird 测试 addon、构建与测试脚本及便携包。
- 版本、检查证据与边界见 [T02 验证记录](t02-verification.md)，手动验收与回退见 [测试指南](t02-testing.md)。
- 原型发现并修复：严格 CSP 下 Angular 关键 CSS 优化造成样式未加载；Quill 导出代码块经 Markdown 转换丢失围栏。增加对应打包检查。
- 依赖审计：Quill 2.0.3 有一项 low 告警，转换前增加导出 HTML 清理；不声称依赖告警已消失或完成全面安全审计。
- 未做：正式笔记保存、实际 Thunderbird 安装注册、真实 Windows 10／输入法测试、AI 登录、Git 初始化与发布。
- 状态：待用户验收；没有 T02 通过记录，T03 未开始。

### T02 验收修复 0.2.0-t02.2

- 用户报告：Thunderbird 157.0.1 拒绝安装 XPI；编辑器变化未更新 Markdown 源码。
- 根因：本机 XPIInstall 将 gecko 范围映射至 TOOLKIT_ID，XPIDatabase 对比 platformVersion；Gecko 实际 157.0 小于原声明 157.0.1。源码框未订阅 Quill text-change。
- 修复：XPI 0.2.2 声明最低 Gecko 157.0；用户编辑事件更新 Markdown signal，清空旧检查结果，保留最近载入的原文快照；源码载入仍为显式操作。独立版本目录交付，保留旧包。
- 验证：生产构建与严格编译通过；打包报告 `output/smoke-packaged/1791558809982/smoke-report.json` 确认中文输入同步、删除同步、源码回载、原文保留及原有运行检查通过。
- 未验证：未在用户 Thunderbird 配置中安装 XPI；需用户复测安装及真实桥接。自动中文输入不等于输入法候选测试。
- 状态：T02 继续待验收，T03 未开始。

### T02 图标更新 0.2.0-t02.3

- 用户确认银白色金属切面 N 预览：“可以，就这样”。
- 背景直接复用所提供 icon.svg 的渐变定义与圆角矩形；N 为裁切后的金属纹理，SVG 是矢量背景与嵌入位图的组合。提供 16–512px PNG 与九尺寸 Windows ICO。
- 已接入 EXE、窗口、托盘与左上角品牌标识。资源和再导出方法见 assets/README.md。
- 生产构建／严格编译和打包运行检查通过，报告为 output/smoke-packaged/1791559495067/smoke-report.json；已提取并查看 EXE 实际嵌入图标，查看应用截图确认品牌图标加载。
- 实际托盘和 Windows 不同 DPI 下的视觉效果留待用户验收。旧包保留，新包为 0.2.0-t02.3；T02 待验收，T03 未开始。

### T02 等宽图标与插件统一 0.2.0-t02.4

- 用户要求笔画严格等宽，Thunderbird 插件使用同样图标。
- 用纯 SVG 恒定 8 单位描边替代位图字母裁切，三段直线均按垂直方向等宽，5.4 单位内描边表现银白金属面。背景渐变与圆角保持原定义。
- 桌面与插件 PNG 由同一脚本输出；插件管理图标与工具栏 default_icon 均已配置，XPI 版本升为 0.2.3。文件存在性及两端对应 PNG 的 SHA256 一致性已检查通过。
- 新桌面包 0.2.0-t02.4 构建／编译通过；原测试包保留，实际插件显示需用户安装复核。此项不是 T02 整体批准，T03 未开始。

### T02 用户真实环境反馈（2026-10-09）

- 用户已临时载入 addon，重新运行 Register-Bridge.ps1 后连接成功。之前 No such native application 问题由用户重新注册解决；助手未修改注册表。
- 用户确认重启 Thunderbird 后 PID 15384 保持不变；明确退出 NotebookAid 后查询／打开窗口返回 BACKGROUND_UNAVAILABLE，只有显式启动后台才重新运行，符合预期。
- 截图报告桌面版 0.2.0-t02.4、packaged=true、win32 10.0.26300 x64、windowVisible=false。此记录来自用户实际测试，不是模拟 Job 结果。
- 生命周期的上述场景已获用户实测证据，T02 整体验收仍待明确批准；T03 未开始。

## T03 交付记录

- 用户授权及 T02 批准：2026-10-09，“T02 测试通过，开始 T03”。此前 T02 待验收文字为历史记录。
- 交付：0.3.0-t03.2；core/library.ts、shared/library.ts、desktop/library-ipc.ts、Angular NoteWorkspace 与对应界面、测试及文档。默认库 `%APPDATA%\NotebookAid\library`，支持选择空目录／已有库；无真实用户数据迁移。
- 能力：创建／打开、标题与 Markdown 正文分别保存、默认 5 分钟自动保存（全局开关与 1–60 分钟设置）、手动保存、退出保存、稳定 ID、不可变修订、版本与会话校验、单写入锁、幂等操作、核心编辑中删除拒绝、派生索引维护／重建、恢复项保留与损坏报告。
- 开发验证：17/17 测试通过，覆盖四阶段进程强制终止及写入／索引故障。最终 EXE 手动／自动保存、失败草稿保留、重试和独立进程重启通过；报告 `output/smoke-packaged/1791562418114/smoke-report.json` 与 `reopen-report.json`。Native Messaging 模拟 Job 生命周期回归通过。
- 详细证据及边界：[T03 验证记录](t03-verification.md)；用户操作及回退：[T03 测试指南](t03-testing.md)。原 T02 包保留，笔记本独立于程序目录。
- 未验证：真实 IME 候选、目录选择对话框用户操作、Windows 10 实机、硬件断电与长时间大库行为。未扩展到 T04 格式能力或 T07 删除／历史界面。
- 状态：T03 待用户验收，T04 未开始。

T03 验收修订 0.3.0-t03.2：保存与重建完成反馈、重建按钮样式、所有操作按钮图标（含桥接插件）、全局自动保存开关和分钟间隔。默认开启 5 分钟，未改变内容不生成修订。仍待用户验收，未启动 T04。

## T03-A 交付记录

- 日期：2026-10-09。用户批准 CDK＋自有组件方案，明确“只保留最近100条，其他按你的意见完成，开始T03-A吧”。此授权不包含 T03-B／C。
- 版本：0.3.0-t03a.1。新增 @angular/cdk 22.2.2（MIT），通知组件／服务、受限 IPC、独立 notifications.sqlite、白名单合约、4 项通知核心测试及 Electron 通知交互测试。
- 完成：四角通知卡片、铃铛未读、历史抽屉、类型／库／未读筛选、已读、删除、确认清空、最多 100 条、重复错误聚合、成功自动保存静默、历史失败与笔记提交隔离。位置与已读跨进程重启保留。
- 验证：生产构建与严格 TypeScript 编译通过；核心 21/21 通过。实际 EXE 证据为 output/smoke-packaged/1791573032014 下 smoke-report.json、notification-report.json、reopen-report.json。控制台错误为空；退出保存最终 version=6。
- UI 检查含四角位置、清空确认、记录筛选、Esc／焦点返回、错误不自动消失、鼠标／焦点事件暂停计时（隐藏窗口使用事件模拟），以及通知存储故障时笔记仍可保存。已检查浅／深消息中心和卡片截图。测试脚本的重复声明及隐藏窗口焦点事件问题已修正，不作为真实键盘实测证据。
- 边界：实际屏幕阅读器／物理键盘、真实中文 IME、Windows 10 与不同 DPI 仍需用户验收；自动保存分钟计时采用测试推进。没有对个人笔记执行故障操作。Thunderbird 桥接本次未更改也未重新实测。
- 交付入口与回退：[T03-A 指南](t03a-testing.md)。旧包保留；新增应用通知数据库，未迁移原偏好或笔记格式。
- 状态：T03-A 待用户验收。T03-B、T03-C 和 T04 未开始；只有用户明确批准并授权才继续。

### T03-A 已读策略修正

- 2026-10-09 用户要求普通成功消息自动已读，仅 Info、警告、错误默认未读。交付版本 0.3.0-t03a.2。
- 新增及合并的成功记录写入已读状态；旧版成功历史读取时按已读返回，无 schema 迁移。重复错误仍恢复未读。成功弹窗与历史保留不变。
- 验证：构建成功，22/22 核心测试通过；打包后的 Electron 界面和跨进程重启测试通过，报告 output/smoke-packaged/1791575603555/，控制台错误为空。实际用户操作仍待验收。
- 状态仍为 T03-A 待用户验收；T03-B／C 未开始。

## R39 系统新建入口安排

T15-A 单独交付和验收，保持原任务编号。先实机验证 Windows 11 现代 New 与 Windows 10 传统 New 子菜单，再接入活动库、单实例启动与安全新建，最后完成安装语言文字、主图标、注册／撤销及升级卸载集成。相关边界见需求 R39。T15 安装包验收包含该集成，T14 提供八语言资源。记录 R39 当时 T03-A 仍待用户验收；后来用户已明确批准 T03-A 并授权 T03-B，仍不跳过逐项验收。

## T03-B 交付记录

- 授权：2026-10-09 用户明确“T03-A验收成功，开始T03-B”。T03-A 记为已批准，T03-B 交付版本 0.3.0-t03b.1，待用户验收。
- 实现：本机库注册表与旧路径备份导入、列表／添加／创建／打开／显示名称／重新定位／确认移除；当前库及最近打开时间；规范化路径与库 ID 去重；未知版本和损坏配置保留；新建与已有模式分离；切换失败保留旧库会话，旧请求无法跨库保存。消息中心显示本机库名。
- 检查：Angular／TypeScript 构建通过；28/28 核心测试通过；开发态和最终便携包 Electron 界面及跨进程重启测试通过；最终报告 output/smoke-packaged/1791576806964/ 中 smoke-report.json、registry-report.json、notification-report.json、reopen-report.json，控制台错误为空。
- 浅／深色库列表截图已检查；按钮图标检测通过。目录选择结果和故障为自测夹具；未宣称已验证真实 Windows 10、原生目录选择器操作、网络断线及断电。
- 交付和回退见 [T03-B 指南](t03b-testing.md)。旧程序包、旧路径配置保留；不修改笔记格式，不迁移主题／语言／自动保存偏好。
- T03-C、T04 及 T15-A 尚未开始，继续等待用户逐项测试批准。

## T03-C 交付记录

- 用户先确认 T03-B“验收完成”，随后明确“开始 T03-C”。交付版本 0.3.0-t03c.1，当前待用户验收。
- 实现：设置入口、全局／按库分组、语言／主题共用主进程配置、全局自动保存与本机按库覆盖／恢复继承、生效来源说明、名称／路径／状态和当前库索引维护。非当前／离线库维护禁用。
- 兼容：settings.json schemaVersion=1；首次导入原三个 localStorage 键之前备份原值，保留旧值以便回退。损坏配置不覆盖；写入失败保留旧值，读取失败暂停定时保存但不阻断手动保存。通知位置沿用既有通知数据库。
- 验证：Angular／TypeScript 构建成功，34/34 核心测试通过；开发态和最终便携包 Electron 界面／跨进程重启测试通过。最终报告 output/smoke-packaged/1791580883211/，包括 settings-report.json、smoke-report.json、registry-report.json、notification-report.json、reopen-report.json；控制台错误为空。浅深主题截图已检查。
- 已验证：非当前库设置不重置当前计时器、旧定时回调失效、失败提交保留计时器及界面值、非法间隔拒绝、关闭定时保存后切库仍保存、恢复继承、离线库维护禁用、重启保留覆盖。计时器通过推进模拟，真实 Windows 10／长时间运行／原生输入法／断电场景未作为通过项。
- 入口与回退：[T03-C 指南](t03c-testing.md)。旧版 0.3.0-t03b.1 保留。T04、T07、T15-A 未开始。

## T04 交付记录

- 授权：用户明确“T03-C验收完成，开始T04”。据此将 T03-C 及 T03 汇总记为已批准；历史交付段的待验收文字仅表示当时状态。
- 交付日期：2026-10-10；版本 0.4.0-t04.1。实现三种主格式、新建格式选择、UTF-8 单文件导入、三格式副本导出预览、源码／富文本切换、受限 HTML 预览、正文撤销重做与键盘快捷键、组合输入保存协调。
- 保真边界：Markdown／HTML 支持已声明安全结构子集；载入比较转换前后 Delta，不支持的语法保留原文并切到源码编辑。复杂列表、任务、表格、图片和带语言代码块等不承诺富文本往返。TXT 按字面编辑；跨格式副本转换先预览，不自动改笔记主格式。
- 数据：Markdown 修订保持兼容，不改写历史；HTML/TXT 新建 content.html/content.txt。旧 T03-C 不理解新格式，回退使用升级前库副本，保留新版库。文件导出不覆盖既有文件，保护应用／配置／已登记库路径；HTML 增加 UTF-8 BOM 编码标记，正文原文不加包装。配置和通知代码未迁移，XPI 仍为 0.2.4。
- 验证：Angular 生产构建和严格 TypeScript 编译通过；38/38 核心测试通过，最终 HTML 编码／大小边界调整后相关 4 项测试再次通过。最终 EXE 完整界面及跨进程重启检查通过，证据为 output/smoke-packaged/1791583669478/ 的 editor-report.json、smoke-report.json、registry-report.json、settings-report.json、notification-report.json、reopen-report.json，consoleErrors=[]。
- 已检查最终浅深主题截图，修正行内代码对比度和重复滚动条。自动测试包括中文、基础格式、源码保护、HTML 危险内容不进入预览、真实导出文件与拒绝覆盖、取消、组合事件保存延迟、撤销／重做按键事件、TXT 重载及旧功能回归。测试过程中修正了导航断言与清洗器隐式 body 误报；失败夹具保留，不作为通过证据。
- 未实测：Windows 10、原生文件选择器交互、真实 IME 候选、实体快捷键布局、屏幕阅读器、网络盘／断电／长期大库。对话框与 composition 采用隔离夹具／事件模拟；未改个人笔记本或注册表，未重新做 Thunderbird 实机连接测试。
- 入口与回退：[T04 测试指南](t04-testing.md)。T04 当前待用户验收；T05、T07、T15-A 未启动。
T04 ZIP 校验：d8c3107289e660522055b2f893c3515bfd25101020aaf4c4f4188e591d863e7c。已核对 ZIP 中 app.asar 与最终已测程序一致，T04 指南与工作区一致，EXE／XPI／许可证文件齐全；XPI 校验值未变化。

## 固定便携测试目录部署（2026-10-10）

用户要求每次开发步骤完成并生成压缩包后，检查并清空 `C:\Softwares\NotebookAid-win32-x64`，将新包内容部署到此目录，确保 NotebookAid.exe 在根目录；权限不足时申请授权。

执行工具：`scripts/Prepare-TestPortable.ps1`。仅替换该固定目录的程序文件，检查进程／链接／疑似用户数据；先校验版本 ZIP 的路径、必需文件和内容哈希，再直接清空目标目录并解压，最后逐文件核对 SHA256。不生成旧目录备份或解压临时副本，仅保留部署报告。发现运行中程序或用户数据时暂停替换。失败或回退时使用 release 中保留的对应版本 ZIP。程序不会自动启动，任务验收仍由用户决定。

本次已将 0.4.0-t04.1 部署到固定目录，所有解压文件哈希核对通过，无多余套层目录。部署报告：output/portable-preparation/20261010-093756-337/deployment.json；当时的 previous/ 备份已按用户后续要求删除，回退使用版本 ZIP。没有修改个人笔记本或执行桥接注册。T04 仍待用户验收。

## T04 验收修正：Select 控件（2026-10-10）

用户明确“先修改 Select box 控件的式样”，没有批准 T04。修订版本 0.4.0-t04.2：10 处原生 Select 统一使用 Angular CDK 浮层，保留原生模型绑定；触发按钮左右内边距 12px，菜单复制按钮圆角，主题背景、边框与 Lucide 勾号统一。Quill 标题菜单同步样式。包含键盘导航／输入首字查找、Escape、Tab、外部点击和嵌套通知面板检查。未增加依赖、迁移数据或变更桥接协议。

开发态完整界面及重启检查通过（output/smoke-development/1791658569599/），一次较早测试提前退出且没有完整报告，不计为通过。最终程序以本轮便携验证报告为准。T04 继续等待用户验收，尚无 Git commit，不启动下一任务。

0.4.0-t04.2 最终验证：生产构建及严格编译通过；最终便携 EXE 的控件、保存、设置、通知、三格式编辑及跨进程重启回归通过，consoleErrors=[]。证据：output/smoke-packaged/1791658759380/，新增 select-report.json、select-dark.png、select-light.png、select-editor-dark.png。已检查浅深主题与 Quill 展开截图。本轮未改核心存储，未重复执行此前 38 项核心测试；未完成 Windows 10 和屏幕阅读器实测。

0.4.0-t04.2 ZIP SHA256：8a0c11d3fb25306720bdc928e7f751a7b5fec984c9ec8b61e87d12ef9162e7a8。已部署 C:\Softwares\NotebookAid-win32-x64，EXE 位于根目录；逐文件校验通过，已测 app.asar 与部署版本一致。部署记录：output/portable-preparation/20261010-210041-403/deployment.json；当时的 previous/ 备份已按用户后续要求删除。明确退出应用后使用保留的 t04.1 ZIP 回退。本次没有改个人笔记或注册表。T04 仍待用户验收。

## 测试部署流程调整（2026-10-10）

用户明确要求取消 C:\Softwares\NotebookAid-win32-x64 的目录备份，并删除现有备份。已修改 AGENTS.md、Prepare-TestPortable.ps1 和测试指南：校验 ZIP 后清空固定测试目录、直接解压到根目录并逐文件校验；仅保留版本 ZIP 和小型部署报告，不保留 previous/staged 程序副本。进程、链接、用户数据及路径检查仍保留，不能强停应用或删除笔记数据。

已删除 output/portable-preparation 下两个部署批次（20261010-093756-337、20261010-210041-403）的 previous 和 staged，共 1,574,677,861 字节；部署报告及全部 release ZIP 保留。PowerShell 语法检查通过。实际运行验证触发“程序仍在运行”保护，目标目录没有清空或替换；新直接解压分支尚未实机执行。此次只调整测试流程，不重新打包应用、不提交 Git，不代表 T04 验收。

## 0.4.0-t04.3 HTML 修复复测

HTML 富文本的相对链接此前会被 Quill 按 Electron 的 file: 基址判定为不支持，替换成 about:blank 后又被清洗器移除 href。现以固定虚拟 HTTPS 基址校验协议，保留原始 href 字符串，支持网页链接、相对路径与页内锚点；仍拒绝 javascript:、data:、file: 等地址，点击笔记链接仍不导航。

请用 `<p><a href="/produkte/helena">More</a> <a href="#details">Details</a></p>` 测试富文本修改后切换源码、保存、重开，确认 href 保留。被旧版覆盖丢失的 href 无法自动推断，需重新输入或重新导入原文件。

home_en.html 包含 div 布局、class 与图片，继续采用源码编辑和原文保存，不提供网页布局的富文本编辑。这不是保存失败；提示已明确说明“仍可正常保存”。导入后可直接保存，在源码中修改再保存，然后切换笔记重开验证。原文件不修改；只导入不改写换行，textarea 源码编辑后换行按浏览器规则统一为 LF。

本次不迁移库结构，回退可退出应用后解压 release 中保留的 0.4.0-t04.2 ZIP；旧版仍有链接问题。T04 等待用户验收，不提交 commit。

0.4.0-t04.3 验证结果：生产构建／严格 TypeScript 编译通过。最终便携 EXE 完整界面与跨进程重启检查通过，consoleErrors=[]，报告 output/smoke-packaged/1791659613015/。html-regression-report.json 确认绝对／相对／锚点 href 在富文本编辑及源码切换后保留，用户 home_en.html（10,219 字节）原文导入、源码修改保存及重开通过。原文件未改；输入文件只读取为隔离测试材料，没有加入源码或发布包。第二项未复现保存失败，已修正文案说明源码保护不阻止保存，复杂网页仍以源码编辑。

失败记录：修复前复现相对链接不支持；首次附件断言因 textarea 的 CRLF 规范化而失败，改为核对核心保存原文及规范化后的编辑值。完整测试首次超出原 60 秒上限，新增回归后调整到有界 90 秒并通过。未重复执行未受影响的核心存储测试；未重新实测 Windows 10、真实输入法、Thunderbird。T04 尚未验收，未提交 Git。

0.4.0-t04.3 ZIP SHA256：b78daba9dba730105c5e39dfe91d54e89a55c5677a7aec00768cb60d9fbd03ae。部署尝试触发运行进程保护，未清空 C:\Softwares\NotebookAid-win32-x64；等待用户明确退出程序后继续部署。新流程不生成目录备份。

用户确认已退出并允许部署后，0.4.0-t04.3 已成功部署到固定测试目录，NotebookAid.exe 位于根目录。逐文件 SHA256 校验通过，部署 app.asar 与已测便携包一致；backupCreated=false，没有创建旧目录备份或解压临时副本。新无备份流程已实际执行通过。T04 继续等待用户验收，未提交 Git。
Deployment report: output/portable-preparation/20261010-223250-120/deployment.json

## T04 HTML 导入策略变更（2026-10-10）

用户要求导入时清除影响应用安全／行为的内容，发现清除项时告知用户，保存清理后的 HTML；保留常用属性和结构，无法无损富文本编辑的部分继续保护。此决定覆盖此前新导入 HTML 一律原文保存的约定。实施见 [HTML 导入与编辑边界](html-import-policy.md)。原文件不改，已存在笔记不迁移。版本 0.4.0-t04.4，T04 仍待验收，未进入下一任务。

0.4.0-t04.4 最终验证：Angular 生产构建和严格 TypeScript 编译通过；格式／通知相关 9 项测试通过。最终便携 EXE 完整界面及重启回归通过，consoleErrors=[]。证据：output/smoke-packaged/1791665963057/，包含 html-safety-report.json、html-regression-report.json、editor-report.json、notification-report.json 和 reopen-report.json。home_en.html 原始文件未修改，测试确认清理后的 class／链接／布局保存重开、清理警告、隔离预览及应用样式未受影响。已检查隔离预览截图。首次验证因测试试图执行 iframe 内脚本触发预期安全拒绝，调整测试后通过，没有放宽 sandbox。

本轮没有新增第三方依赖；DOMPurify 使用现有锁定版本，构建复制同版本运行文件用于隔离导入。完整网页像素保真、任意 class/style 的富文本编辑、真实 Windows 10、屏幕阅读器、外部资源启用均未实现或未实测。保留旧 ZIP 回退，但清理后的笔记不会因回退程序而恢复删除内容，需要重新使用原 HTML 文件。T04 继续待验收，未提交 Git。

0.4.0-t04.4 已无备份部署到 C:\Softwares\NotebookAid-win32-x64，EXE 在根目录，全部文件及已测 app.asar 校验一致。ZIP SHA256：08dcf813123910aa7d939c3676106b9faa35c532e1757f36a47f7c80dd2513cf。未改用户原始 HTML 文件、个人笔记本或注册表。T04 仍待验收。
Deployment report: output/portable-preparation/20261010-230109-364/deployment.json

### T04.5 验收修复：明确源码保护原因

依据用户 test_markdown.md 反馈，增加按格式显示的诊断列表、Markdown 可定位行号、HTML 标签/属性名称与解析元素位置、重复次数及调整建议。保留源码保护和无损检查。版本 0.4.0-t04.5，T04 仍等待用户验收，不提交 Git，不进入下一任务。

T04.5 实际验证：Angular 构建与 TypeScript 编译通过；最终打包程序以用户 test_markdown.md 和 home_en.html 为输入完成自动化测试，Markdown 六类限制、HTML 标签/属性诊断、链接保留、安全清理、源码保存/重开和进程重启通过，consoleErrors=[]。报告位于 output/smoke-packaged/1791666860802/。已检查 Markdown/HTML 诊断截图。开发态测试曾因截图主动关闭通知导致断言失败，已修正测试顺序，最终打包测试通过。自动化检查不代替用户验收。

### T04.6 列表修复（已验收）

用户授权：“先开始任务列表和嵌套列表的修复，完成后打包并更新测试目录，等我验收通过后再做图片和表格。”本步新增任务勾选与缩进工具栏、Markdown 任务状态转换、HTML data-list 保存、8 级缩进边界保护及列表回归测试。未进入图片/表格。T04 仍待验收，未提交 Git。

T04.6 验证：Angular 生产构建、TypeScript 编译、开发版及最终便携版自动化测试通过。最终报告 output/smoke-packaged/1791667616647/：任务勾选写回、混合嵌套、撤销/重做、保存重开、HTML 列表往返、超过 8 级保护、其他格式诊断和进程重启通过，consoleErrors=[]。已检查列表截图。真实 Windows 10 和人工工具栏操作仍由用户验收。
ZIP SHA256: 6b98bbd59a7ab44adc2aab83079b47e882f5a1a9d3d23e01d5c6e37557cc3ee3
T04.6 已部署至 C:\Softwares\NotebookAid-win32-x64，EXE 位于根目录，逐文件哈希验证通过，backupCreated=false。保留旧 ZIP 回退。等待本步用户验收，不实施图片和表格，不提交 Git。

### T04.6 列表验收记录

用户明确确认：“任务列表和嵌套列表验收通过，开始图片和表格功能的修复。如果Quill 2.0.3能支持语言代码块，也一起修复”。列表子步骤已通过；整体 T04 仍有当前修复待验收，按首次基线提交规则暂不提交混合工作树。

### T04.7 图片、基础表格与语言代码块（实施中）

复用 Quill 原生 image/table/syntax；本地 highlight.js 11.11.1（BSD-3-Clause）用于语法高亮。保留图片地址，外部图片离线占位，不自动联网。普通矩形表格保留表头、列对齐，提供行列操作；合并单元格/复杂布局继续保护。语言代码块保留支持列表中的语言标签。分隔线不实施。完成后打包部署，再等待验收。

T04.7 最终验证：生产构建、TypeScript 编译及最终便携版完整回归通过，报告 output/smoke-packaged/1791669043890/。图片地址/说明、内嵌位图、离线占位、表头/对齐、加行及创建空表格、Python/JavaScript 语言与首尾空行、保存往返、现有编辑功能及进程重启通过，consoleErrors=[]。已检查表格、图片与代码截图。highlight.js 许可证已包含在打包的第三方许可证文件。

早期回归发现并修复：表头单元格边界、相邻不同语言代码块合并、图片 HTML 序列化导致被 CSP 拦截的加载尝试、Markdown 默认代码渲染合并末尾换行。最终包不放宽 CSP，不自动加载外部资源。

ZIP SHA256: ec06f54554aa6f64447356e5c33965cae2da80d30f9f8baeb6b3fb9d120c6181
人工文件对话框选择/拖入、全部语言、全部表格编辑组合和真实 Windows 10 尚未逐项实测，按 docs/t04-testing.md 验收。示例 docs/examples/rich-text-t04.md 不含分隔线。整体 T04 仍待验收，未提交 Git。
T04.7 已部署至 C:\Softwares\NotebookAid-win32-x64，EXE 位于根目录，逐文件 SHA256 验证通过，backupCreated=false。等待用户验收；可用保留的 T04.6 ZIP 回退程序。

### T04 验收与 T04.8 侧边栏收尾

用户明确确认：“T04的测试都通过了，不过还有一个临时问题，解决后再commit”。本次仅调整新建格式入口、统一新建/导入按钮及导航间距；不进入 T05。点击新建后显示格式按钮，选择后创建并收起，Escape 可取消展开。

0.4.0-t04.8 生产构建、TypeScript 编译和最终便携版完整界面回归及进程重启通过，报告 output/smoke-packaged/1791670135069/，consoleErrors=[]。新增检查验证按钮等宽等高、导航间距及选择格式前不创建笔记；三种格式创建沿用完整编辑回归。已检查浅色展开及深色收起截图。用户已批准 T04 功能；本次侧栏视觉效果仍待用户复核。依用户“解决后再commit”的授权准备首次 T04 基线提交，不伪造此前任务提交。

T04.8 已部署至 C:\Softwares\NotebookAid-win32-x64，EXE 位于根目录，逐文件校验通过，未创建备份。ZIP SHA256: d47c6bcdabf791c8cd7a3dd599359395293a70407480746a1f47e78cfeff5dd9。回退可使用保留的 T04.7 ZIP 替换程序文件。首次提交检查仅发现 i18n.ts 原有四处行尾空白，已清理；不影响程序内容。

## T06-A Delta 原生富文本计划（2026-10-11）

安排在 T06 附件管理之后、T07 历史与回收站之前，便于复用附件引用，并让后续历史、加密、备份、Thunderbird 与 AI 接口统一覆盖第四种格式；保留原任务编号。新增计划不自动启动 T05 或 T06-A。

交付顺序：定义原生文档版本和支持格式清单 → 扩展统一核心存储／校验及原子保存 → 接入 Quill 完整 Delta 文档读写和新建入口 → 提供受控原生导入导出与三种通用格式副本 → 打包部署并等待独立验收。具体文件扩展名、附件交换容器及旧程序遇到新格式时的兼容行为须在实施前说明。

验收标准：

- 原有 Markdown／HTML／TXT 创建、保存、重开及导入导出无回归，默认仍为 Markdown，旧库不自动迁移。
- Delta 笔记的文字、支持的格式、任务与嵌套列表、图片引用、基础表格和代码语言保存重开后语义一致；撤销重做、自动保存、切库及异常恢复沿用核心保护。
- 保存完整文档快照，不误把单次 text-change 增量当作整篇正文；标题、稳定 ID、修订与索引行为一致。
- 未知版本／属性／嵌入、损坏或超限 JSON、危险资源地址与缺失附件有明确反馈；失败不覆盖已有笔记，不触发外部资源自动加载。
- 原生交换验证元数据和附件完整性；导出 Markdown／HTML／TXT 前说明损失，导出不改变原笔记。复杂 HTML 继续使用既有源码保护。
- 验证 T05 搜索能从 Delta 提取可搜索文本；在 T07–T12 的相关验收中覆盖 Delta 的历史、加密、备份、addon 展示与用户主动 AI 内容提取。

本次仅更新 requirements.md 和本计划，不改代码、不打包、不宣称 Delta 已实现；实现必须等待用户单独授权，交付后仍需用户验收才提交该开发任务。

### T05 开工记录（2026-10-11）

用户授权“开始T05吧”，随后确认同层文件夹名称唯一规则：忽略大小写、去首尾空格；不同父文件夹可同名。本任务仅组织与搜索，T06/T06-A/T07 未开工。实施与验收边界见 [T05 测试](t05-testing.md)。Delta 需求文档增量保留，未实现。

T05.1 验证完成：生产构建、TypeScript、43 项核心测试及最终便携版完整界面／重启回归通过。最终报告 output/smoke-packaged/1791709739884/，consoleErrors=[]。文件夹与标签管理、组合查询、分页、置顶和最近使用、重建、跨库隔离、不确定组织提交重试均通过。已检查浅深主题截图；实际 Win10 和长时间大库未测。等待用户验收，不提交 T05，不进入 T06。早期重启失败为测试库注册项未清理，修复测试脚本后已通过。

T05.1 已部署至 C:\Softwares\NotebookAid-win32-x64，NotebookAid.exe 在根目录，逐文件 SHA256 校验通过，backupCreated=false。ZIP: release/NotebookAid-0.5.0-t05.1-win-x64.zip；SHA256: 025a69d1ce3cc91b05de77841c175e1e476537b48540953d19032093288ff110。保留 T04.8 程序 ZIP；回退旧程序须使用升级前完整库副本，不能手改已升级库的格式版本。

### T05-A 交付记录（2026-10-11）

按用户授权加入 T05-A；T05 原有项仍待验收。目标卡片支持来源选择、版本与数量预览、备份确认、原生导入及重复跳过。来源只读；导入历史、正文、组织、置顶与删除状态；更新来源另建副本。实现与回退见 [T05-A 测试](t05a-testing.md)。目标格式升至 3，旧程序须配合导入前备份回退；来源不升级。

验证：生产构建及 TypeScript 编译通过；最终 55/55 核心测试通过。实际便携 EXE 完整界面与跨进程重启通过，证据 output/smoke-packaged/1791712050524/，含 library-import-report.json、smoke-report.json、reopen-report.json；consoleErrors=[]。验证来源树逐文件哈希不变、重复跳过、目标切换、版本提示、原生正文、默认已读成功消息；已检查浅深主题截图。核心另覆盖原生 BOM／换行、历史链、删除状态、冲突、版本变化、忙碌／损坏／路径拒绝、故障回滚和进程中断恢复。Win10 实机、用户真实旧库、长时间大库、真实断电未验证。

过程记录：一次完整核心回归出现 WRITE_FAILED，单项诊断和后续两次完整回归均未重现，底层原因未确认。首轮界面测试因测试脚本重复声明变量中断，已修正；同时将预览滚动改为 Angular 渲染完成后执行，最终便携复测通过。未将这些失败记录冒充成功，保留输出用于追踪。

交付版本 0.5.0-t05a.1。等待用户验收 T05-A 与 T05 其他项后再提交，不进入 T06。

已生成 release/NotebookAid-0.5.0-t05a.1-win-x64.zip，SHA256: 5abfbd020b060d2759804b5efa5fd7840dd94bdb3af47e61b016a2eaff0029e3。已通过 Prepare-TestPortable.ps1 部署至 C:\Softwares\NotebookAid-win32-x64，EXE 位于根目录、逐文件校验通过，backupCreated=false；保留版本 ZIP 用于程序回退。

### T05 验收期间工具栏整理（2026-10-11）

用户授权立即将表格／代码语言／撤销重做整合进现有工具栏，并要求后续功能遵守极简界面原则。属于当前验收修正，不代表 T05 或 T05-A 已批准。版本 0.5.0-t05a.2；移除底部常驻操作行，表格使用 CDK 菜单，表内操作仅在当前表格上下文启用，代码语言仅在代码块内显示，图片说明改为按钮帮助提示。验证结果待完成后记录。

工具栏修正验证完成：生产构建、TypeScript 编译、开发态及最终便携 EXE 完整界面／跨进程重启检查通过；最终报告 output/smoke-packaged/1791713551472/，consoleErrors=[]。覆盖表格菜单插入／加行、表外禁用、代码语言真实菜单切换、普通段落隐藏语言入口、源码／TXT 撤销重做和既有导入回归。检查深色工具栏／表格菜单及语言选择截图，浅色主题包含在界面回归中。首轮测试直接设置隐藏 select 未正确模拟自定义控件交互，改为真实菜单点击后通过；截图发现的 Quill 选择框样式干扰已修复并复验。本次未改核心存储逻辑，未重复运行上一版已通过的 55 项核心测试。仍未做 Win10 实机和全套人工可访问性验证，等待用户验收，不提交 commit。

0.5.0-t05a.2 ZIP 已生成并部署至 C:\Softwares\NotebookAid-win32-x64；EXE 位于根目录，逐文件校验通过，backupCreated=false。ZIP SHA256: ecf8ba928e96f864c1c6e9a935490bfe110ffc4cc5ec3227c77b23e6ccb2e42e。本次界面回退可使用保留的 0.5.0-t05a.1 ZIP，无新增库格式迁移。

## T05-A 界面精简补充（0.5.0-t05a.3，待验收）

新建格式菜单强调主题色；编辑模式使用统一分段单选控件，导出格式与导出操作合并在同一行，窄窗口允许换行。移除编辑区 Quill 版本字样，发行包仍保留完整第三方许可证。文件夹创建、改名仍在“文件夹与标签管理”管理页面。请测试模式切换、导出、浅深主题和键盘操作。没有数据格式变更；退出程序后可用保留的 0.5.0-t05a.2 ZIP 回退程序。

验证记录：生产构建、TypeScript、git diff --check、便携 EXE 全套界面及跨进程重启检查通过（output/smoke-packaged/1791715180389，consoleErrors=[]）。已检查浅深主题截图；Windows 10 实机与用户真实笔记本待人工验收。


0.5.0-t05a.3 已部署至 C:\Softwares\NotebookAid-win32-x64，Prepare-TestPortable 验证通过，未创建目录备份。ZIP SHA256: 54d12111392ee01d27660b792bf98e15018251e7a5915491690ffdd1c339ad38。T05 / T05-A 仍待用户验收，未提交 commit。

## T05-A 文件夹与颜色修正（0.5.0-t05a.4，待验收）

父文件夹空选项明确为“顶层（无父文件夹）”；未分类固定入口与顶层文件夹对齐，并提供用途说明。未分类是 folderId=null 的笔记视图，不是真实文件夹，不能重命名。修正颜色输入框尺寸，增加即时色块和色值。请检查创建顶层/子文件夹、改名、标签颜色修改保存与重新选择，以及浅深主题。没有数据迁移；退出程序后可用保留的 .3 ZIP 回退。
验证：生产构建、git diff --check、便携 EXE 全套界面及重启测试通过。报告 output/smoke-packaged/1791716333312，consoleErrors=[]。T05 / T05-A 待验收，未 commit。
部署：0.5.0-t05a.4 已更新 C:\Softwares\NotebookAid-win32-x64，哈希验证通过，backupCreated=false。ZIP SHA256: c52d01dd8bfa25686334a31f7cf365be37cc6205bed30200fa57932de0356c86。

## T05-A 标签选择预览落地（0.5.0-t05a.5，待验收）

按用户确认的预览实现 CDK 多选浮层、主题色选中背景与勾选、计数及已选标签。点击外部或 Escape 关闭，展开不挤动正文；无标签时引导到文件夹与标签管理。源码框 margin-top 为 16px。请检查选中/取消、保存后重开、浮层键盘操作及浅深主题。没有数据迁移；退出程序后可用保留的 .4 ZIP 回退。
验证：生产构建、git diff --check、便携 EXE 全套界面与重启检查通过（output/smoke-packaged/1791720205148，consoleErrors=[]）。新增断言覆盖浮层不挤动正文、勾选后保持展开、已选标签展示及源码 16px 上边距；已检查浮层截图。真实笔记本和 Windows 10 实机待验收。
部署：0.5.0-t05a.5 已更新 C:\Softwares\NotebookAid-win32-x64，哈希校验通过，backupCreated=false。ZIP SHA256: 44e566a8f0349a7594f907cca2ee5567ed048095b3c31146d2695e60734c3b2f。等待用户验收，未 commit。

## T05-A 筛选、排序与失败取消（0.5.0-t05a.6，待验收）

用户批准预览并授权实施。标签筛选使用主题圆角折叠按钮和紧凑清除入口；文件夹同层上下移动，点击保存排序持久化到 organization.json。未分类不参与排序；子文件夹随父级显示。标签在管理、筛选、选择及笔记标签展示中按当前语言名称自然 ASC 排序，忽略大小写。文件夹/标签操作失败在管理页独立提示，重试使用当前表单，取消只清除错误、保留编辑，不触及笔记正文。删除留 T07。

请验证排序保存及重启、改名保序、非法父级移动后取消与修改父级重试、标签名称排序和浅深主题。可选 order 字段不要求迁移，旧版会忽略顺序且编辑文件夹可能清除该项；回退前保留库副本，正常退出后用 .5 ZIP 回退程序。

补充：同层文件夹同时支持 CDK 拖动手柄排序与上下按钮。拖动父文件夹携带其子树，不能通过排序改变父级，统一点击保存排序。请测试鼠标拖动、保存、重启及不同层级隔离。

验证记录：生产构建与 git diff --check 通过。排序新增核心用例通过，覆盖重启、改名保序、不完整/重复 ID、版本冲突、原子失败；组织用例单独 6/6 通过。全套核心 56 项执行中 55 通过，近期使用批量创建用例偶发 WRITE_FAILED；测试诊断捕获 Windows renameSync EPERM（修订临时目录到 revisions），单项及组织组复核通过，但全套串行复核仍有一次同类失败，不能称全套完全通过。诊断为测试进程临时包装，未修改生产写入逻辑。文件见 output/t05a6-core-final.txt 与 output/t05a6-diagnostic-test.txt。
最终便携 EXE 全套界面与跨进程重启检查通过，output/smoke-packaged/1791725239847，consoleErrors=[]；包含实际模拟鼠标拖拽、上下排序、父子关系保留、错误取消和修改后重试、标签 ASC，已核对主题截图。Windows 10 实机与用户真实库待验收。
部署：0.5.0-t05a.6 已更新 C:\Softwares\NotebookAid-win32-x64，哈希验证通过，backupCreated=false。ZIP SHA256: e8580c248b205be0cf6aa1abd381218f3c45e29b415de6fac289cb335f92e2db。T05/T05-A 待验收，未 commit。

### T05 acceptance follow-up: compact navigation and fullscreen editing (0.5.0-t05a.7)

- 用户批准侧边栏预览：标签筛选单行、侧边栏图标折叠、右侧 Tooltip，并记住折叠状态。新增当前笔记的应用内全屏编辑。
- 同属当前 T05 验收修复，不开始下一任务；仍等待用户验收，不提交 commit。
- 全局设置新增可选 sidebarCollapsed 布尔值；旧配置缺省为展开。全屏状态不持久化；Ctrl+Shift+F 切换，Esc 在无弹层时退出，保留已挂载编辑器与草稿。
- 全屏保留当前笔记标题、工具栏和保存操作，隐藏导航、列表及顶部区域；保存错误提示仍保留，避免隐藏失败状态。

验证记录（0.5.0-t05a.7）：生产构建、settings 测试 7/7、git diff --check 通过；成品 Electron 完整 UI 回归和进程重启通过，consoleErrors=[]。新增布局报告涵盖右侧 Tooltip、折叠菜单、全屏按钮／快捷键／Esc、窄窗口单行及笔记保持；重启断言验证折叠状态。产物记录位于 output/smoke-packaged/1791726882806（不提交）。焦点和快捷键采用测试事件注入，实际键盘与不同显示缩放仍请人工验收。未重跑全量核心测试；此前记录的 Windows 临时测试目录 rename EPERM 未在本次修改范围内解决。

### T05 acceptance follow-up: persistent note action bar (0.5.0-t05a.8)

用户要求笔记顶部格式／版本、保存状态、全屏开关和保存按钮不随编辑区滚走。操作栏在普通与全屏编辑中固定于编辑视口顶部；全屏开关同时显示图标及“全屏模式：开启／关闭”，保留 aria-pressed、高亮和 Ctrl+Shift+F／Esc 提示。本次仍等待 T05 用户验收，不提交、不进入下一任务。
验证（0.5.0-t05a.8）：生产构建与 diff 检查通过；成品 Electron UI 回归及重启通过，consoleErrors=[]。output/smoke-packaged/1791727613172/layout-report.json 记录 stickyNoteActions 和 fullscreenStateLabel 均通过。自动测试对编辑区添加临时长内容，验证普通与全屏滚动后的顶栏位置及命中区域；真实长笔记、源码编辑与不同显示缩放仍请人工验收。

### T05 acceptance follow-up: notebook terminology and compact folder browser (0.5.0-t05a.9)

- 用户确认从此以“笔记本”表示原来的库概念；界面、提示及项目文档统一用词，英文对应 Notebook。内部 library API、文件名、用户自定义名称及数据格式不变。
- 侧边栏选择笔记本使用与笔记本卡片一致的 BookOpen 图标。
- 折叠侧边栏只保留单一居中文件夹入口；点击后右侧弹出全部文件夹和未分类，保持层级、已保存排序与当前项高亮。点击选择、外部点击或 Esc 关闭，CDK 菜单支持键盘导航。展开侧边栏保留原文件夹树。
- “文件夹与标签管理”统一为入口和页面名称。仍为 T05 验收修复，等待用户验收，不提交。
验证（0.5.0-t05a.9）：生产构建、diff 检查、成品 Electron UI 回归及进程重启通过，consoleErrors=[]。output/smoke-packaged/1791728779709/layout-report.json 中 collapsedFolderBrowser、notebookTerminology 均通过。实际键盘菜单导航、长目录名称和不同缩放仍请人工验收。
T05 验收修复 0.5.0-t05a.10：补齐界面中“新库／当前库／此库／来源库／目标库／库 ID”等遗漏简称，统一使用“笔记本”；包括设置继承说明、维护和导入提示。仅修改显示文字，仍等待用户验收，不提交。
验证（.10）：界面源文件残留用词检索、生产构建及 diff 检查通过；包内 renderer 与本次构建逐字节一致。本次纯文案修正，未重复运行完整 Electron UI 回归，实际页面由用户验收。


## T05 / T05-A 验收与香港繁体修正（2026-10-11）

用户明确授权：“这个修改完成后，验收T05-A和T05完成，直接开始T06吧”。0.5.0-t05a.11 已完成八语言独立完整字典（各 273 键）、香港繁体用语、Quill 控件及托盘文案。生产构建、TypeScript、9 项语言／设置测试、打包版完整界面及重启回归通过（output/smoke-packaged/1791732840932，consoleErrors=[]）。依此实际条件验收 T05-A 与 T05；不把自动化本身当作用户批准。此前核心全量测试的偶发 Windows EPERM 记录保留，未宣称全部核心测试重跑通过；隐藏截图帧滞后、Win10 和母语审校边界见 T05 测试文档。下一步用户已授权 T06，T06-A 仍待授权。


## T06 附件实施（2026-10-11）

T05/T05-A 已提交 ab9abc6，0.5.0-t05a.11 已部署并核对哈希，无测试目录备份。T06 在其后开始。附件范围、20 MB／50 个／200 MB 限额、格式 4 与升级备份、原生跨笔记本导入、错误与回退边界见 [T06 测试](t06-testing.md)。T06-A 与 T07 未开工。

T06.1 交付验证：生产构建、TypeScript、串行 63 项核心测试、最终打包版完整界面及重启通过（output/smoke-packaged/1791734444217，consoleErrors=[]）。并行测试中既有存储的一次偶发 WRITE_FAILED 保留在验证记录；具体边界见 T06 测试文档。T06 未验收，未提交，不继续 T06-A/T07。

T06.1 部署完成：release/NotebookAid-0.6.0-t06.1-win-x64.zip，SHA-256 17ab9921166586253e8be68704116ba09b015b292cdbe27f8077b19397f4e62a。Prepare-TestPortable.ps1 已清空并解压至 C:\Softwares\NotebookAid-win32-x64，EXE 位于根目录，verified=true，backupCreated=false。等待用户验收 T06。

### T06 acceptance follow-up (0.6.0-t06.2)

- Add attachment unlink as a revisioned core operation with session, version and replay checks. Retain physical payloads, historical associations and unchanged body references; inline confirmation explains that remaining image references become unavailable.
- Show each notebook manifest schemaVersion in notebook settings, localized as 架构版本 in Simplified Chinese and 架構版本 in Hong Kong Traditional Chinese. Unavailable manifests show an em dash.
- SVG remains a generic attachment with escaped source preview. The current application image allowlist is PNG/JPEG/GIF/WebP; safe SVG sanitization and controlled rendering are not implemented in this follow-up.
- T06 remains awaiting user acceptance; no commit or task advancement.

### T06 SVG and image sizing (0.6.0-t06.3; awaiting acceptance)

- Authorized local SVG support: parse XML in an isolated sandbox with network/permissions/navigation denied, use DOMPurify and a static SVG allowlist, strip scripts/events/style sheets/foreign objects/external references/animations and unsafe recursive reuse. Preserve local gradients, clip paths and bounded shape reuse. New SVG attachments store cleaned bytes, source files remain unchanged; existing SVG payloads are cleaned for every display. Sanitization produces a warning notification when content is removed.
- Keep schema 4 metadata compatible: stored SVG remains application/octet-stream; runtime image classification derives from bounded content or SVG filename. No notebook schema migration for this change.
- Contextual image sizing below the toolbar: width/height (1–8192 px), original-aspect-ratio checkbox, proportional scale slider. Only shown when an available image is selected. HTML persists dimensions; Markdown uses supported inline img tags with dimensions. SVG import/preview is limited to 1 MB and 5000 elements.
- T06 is not accepted or committed. No advancement to T06-A/T07.

### T06 image sizing position fix (0.6.0-t06.4; awaiting acceptance)

- Replace the permanent image sizing row with a fixed contextual panel anchored to the selected image. Prefer below the image; use its visible center when there is insufficient room below. Constrain the panel to the visible editor bounds and track scrolling, image resizing, pane resizing and fullscreen changes.
- Hide the panel when the image leaves the visible editor; close on Escape, another editor selection, source mode or note/page change. Preserve existing dimensions and serialization.
- T06 remains awaiting user acceptance; no commit or task advancement.

## T06 用户验收完成（2026-10-11）

用户明确：“图片尺寸浮层验收通过，T06完成，提交commit后开始下一步任务。”验收版本 0.6.0-t06.4；最终便携界面及重启报告 output/smoke-packaged/1791743233125，测试目录已部署且哈希验证通过。按用户要求提交 T06，随后进入计划中的下一任务 T06-A。
