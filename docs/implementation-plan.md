# 实施计划与进度

更新日期：2026-10-14。各任务须分别获得用户实施授权。

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
| T06-A | 可选 Delta 原生富文本笔记、版本化存储、受控导入导出与旧格式兼容（R40） | 已批准 | 2026-10-11：“T06-A验收通过，提交commit后开始T07。” |
| T07 | 回收站、恢复、主动永久删除、历史版本及保留规则 | 已批准 | 2026-10-12：“验收T07，开始下一个任务” |
| T08 | 主密码、逐笔记加密、恢复密钥、锁定、核心可见性过滤及残留边界 | 已批准 | 2026-10-12：用户明确最后图标修正完成后验收 T08 及 T08.1–T08.7；修正已完成并验证，交付 0.8.0-t08.8 |
| T09 | 手动／定期备份、完整性检查、恢复及存储目录迁移 | 已批准 | 2026-10-12：用户明确“去掉所有dialog标题前的info 图标，验收T09.3和T09，开始下个任务”； 用户授权 T08 完成后继续；已确认默认关闭、按笔记本选择目录后开启每日备份、错过时启动提示、不自动删除旧备份 |
| T10 | Thunderbird Spaces、浏览搜索预览、删除、编辑定位、标签映射、事件与重连 | 已批准 | 2026-10-12：用户明确“验收T10，开始下个任务” |
| T11 | ChatGPT 订阅登录、Gemini／Claude API Key、模型与连接管理 | 已批准 | 2026-10-12：用户明确账户标签修改完成后验收 T11 并开始 T12；修正已完成并交付 |
| T12 | AI 辅助写作、翻译保存、编辑格式、手动摘要及版本冲突处理 | 已批准 | 2026-10-13：用户明确“验收T12，开始T13，完成后打包并更新测试目录，等我验收”； 2026-10-12：用户明确“好的，修改完成后验收T11，开始T12”；T11 修正交付并提交 c731b10 后开工，T12 检查通过不等于验收 |
| T13 | Tasks ICS 导入预览、字段映射、日期时区、去重与异常报告 | 已批准 | 2026-10-13：用户明确“验收T12，开始T13，完成后打包并更新测试目录，等我验收” |
| T14 | 八语言、主题、快捷键、可访问性、缩放及统一异常体验 | 已批准 | 2026-10-13：用户明确“验收T14，暂时不进行下个任务”；已提交 11bca74 |
| T14-A | 新手引导：聚光灯、进度、完成抑制与设置控制 | 已批准 | 2026-10-13：用户明确“验收新手引导和应用菜单” |
| T14-B | 顶部应用菜单、许可证／隐私／关于及备份提示对齐 | 已批准 | 2026-10-13：用户明确“验收新手引导和应用菜单” |
| T14-C | 卡片与编辑区右键菜单、独立复制及原生剪贴板 | 用户已批准 | 用户确认 Markdown 可正常编辑，明确“验收T14-C右键菜单，暂时不进行下个任务”；不开始 T15-A |
| T14-D | 启动性能、真实加载状态、按需正文、最近打开恢复及可配置分页 | 已批准 | 2026-10-14 用户明确“好的，按你的建议进行优化”，随后要求每页数量可配置、仅按需读取显示／打开笔记正文；不开始 T15-A |
| T14-E | 彩蛋收集、主题图标、延迟加载及开发条隐藏 | 已批准 | 2026-10-14 用户明确“彩蛋收集功能验收通过，暂时不进行 T15-A。”；验收版本 0.14.5-easter.3 |
| T15-A | Windows 桌面新建笔记入口：ShellNew 可行性验证、单实例新建、本地化文字与图标、注册及撤销（R39） | 暂时搁置，未验证通过 | 2026-10-14 用户明确“暂时搁置T15A，直接开始T15”；保留原型和结果，不包含在本轮安装包 |
| T15 | Windows x64 安装包与 XPI、桥接注册、升级恢复、真实环境发布验收及许可清单 | 本轮开发交付及0.15.3界面小修已验收；正式发布验证未完成 | 2026-10-14 用户明确“后台备份和安装向导修改验收通过，暂时不进行下个任务。”；Windows 10、多用户及签名在线更新仍保留未验证状态 |

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

## T06-A 开工（2026-10-11）

T06 已提交 b5dcc0f。下一任务为 T06-A；用户授权依据为“提交commit后开始下一步任务”。采用版本化完整 Delta JSON 正文，原生交换扩展名 .nadelta，单个 JSON 容器包含元数据和 Base64 附件及 SHA-256 校验。首次创建／导入 Delta 提示后备份并升级目标笔记本至架构版本 5；旧程序拒绝打开，普通三格式笔记本不自动升级。默认仍为 Markdown。T07 未开始。

### T06-A 交付验证（0.6.0-t06a.1）

完整快照与核心校验、架构 5 可选升级与完整备份、原生 .nadelta 附件交换、四格式入口及语义搜索已实施。构建和 TypeScript 通过；串行核心测试 69/69，最终小幅修改后 Delta 定向测试 3/3。最终便携包完整界面／重启 output/smoke-packaged/1791744779696（consoleErrors=[]）；Delta 专项含撤销重做、列表、表格、代码语言、SVG、交换及重启 output/delta-packaged/1791744778960，通过。真实确认对话框、Win10 和大规模边界未人工验证。参见 [T06-A 验收与回退](t06a-testing.md)。等待用户验收，不提交，不启动 T07。

T06-A 部署完成：release/NotebookAid-0.6.0-t06a.1-win-x64.zip，SHA-256 16a06221d4f71983fc44ccfd5aac0b4ab556059a5e8b9428a21f5835efe9c0b0。Prepare-TestPortable.ps1 已替换 C:\Softwares\NotebookAid-win32-x64，EXE 在根目录，verified=true、backupCreated=false。等待用户验收。

### T06-A 容量验收修正（0.6.0-t06a.2）

用户明确要求“每篇笔记最多50个附件，单个20 MB，合计200 MB，原生交换包也要完整支持”，并要求大附件及内存验证、打包更新测试目录后等待验收。已统一限额，主进程保留导入负载并使用有界凭据，逐附件导出，保留原生 v1 格式兼容。两组 200 MiB 便携交换／哈希／重启验证通过；主进程峰值约 1.21–1.28 GiB，界面约 101 MiB。通用存储回归存在间歇 renameSync EPERM，详见 T06-A 验收文档，不标记全量通过。最终便携完整界面／重启与 Delta 专项／重启通过。当前任务未验收、不提交、不启动 T07。

T06-A.2 部署完成：release/NotebookAid-0.6.0-t06a.2-win-x64.zip；SHA-256 52dd34feaa73a83c1cd7d881861fe34ef3f250a9d258daf32580333307e39d6d。Prepare-TestPortable.ps1 已更新 C:\Softwares\NotebookAid-win32-x64，EXE 在根目录，verified=true、backupCreated=false。等待用户验收。

### T06-A.3 导出菜单验收修正

用户反馈 Delta (.nadelta) 选项换行，要求保持单行。仅为导出格式选择器增加足够的最小宽度，并对其浮层选项禁止换行；其他选择器保持原样。图片 Markdown 导出未更改：现有 sizedImage/sizedImageBlock 规则使用 HTML 保留宽高及容器，标准 Markdown 图片语法无宽高字段，用户本轮询问原因而未要求舍弃尺寸。仍待 T06-A 验收，不提交、不进入 T07。

T06-A.3 已完成构建及便携 Delta 专项／重启检查（output/delta-packaged/1791747054773，包含选项单行和无溢出断言）。已交付 release/NotebookAid-0.6.0-t06a.3-win-x64.zip，SHA-256 bccf8112b89ef0e290cab9d99813c97036eb095f14b6cd2dc64dd3b22d145af3；测试目录更新 verified=true、backupCreated=false。仍待用户验收，未提交。

## T06-A 用户验收（2026-10-11）

用户明确：“T06-A验收通过，提交commit后开始T07。”验收版本 0.6.0-t06a.3；按此批准提交 T06-A，保留此前容量内存及间歇 EPERM 验证边界记录。提交后开始 T07。

## T07 开工

T06-A 已提交 1e67558。本轮实现笔记回收站、恢复、主动永久删除、历史查看及恢复；删除文件夹／标签仅允许空文件夹／未被笔记引用的标签，避免隐式批量改动正文与历史。历史保留规则向用户确认中；默认不自动永久清理。所有破坏操作在应用内明确确认，不操作用户真实笔记测试数据。


## T07.1 交付与验证（2026-10-11）

- 用户最终更正：“我点错了，应该选保留所有历史，并提供批量手动清理功能”。以此为准：默认全部保留，无自动 50 版本上限；手动指定最近 N 个保留版本，预览数量并确认后批量清理，至少保留当前版本。初始输入 50 可修改，不代表后台保留策略。
- 完成回收站、单篇恢复／主动永久删除、历史源码预览／恢复、空文件夹及未使用标签删除；成功消息接入现有通知，默认已读。历史恢复保留当前组织归属，原有附件实体不由清理历史删除。
- 首次历史清理或组织删除升级架构版本 6，先完整备份；历史保留边界独立记录，不改写保留版本的正文和版本号。清理及永久删除的已确认中断操作在重启时继续；跨笔记本导入覆盖历史边界与失效组织引用。
- 构建通过；核心回归 85/85（output/t07-core-cleanup-final.txt），随后请求重放参数校验补充后 T07 专项 13/13；git diff --check 通过。首次回归中的旧 trash 非法值断言已更新；一次组织批量创建测试出现此前已记录的间歇 WRITE_FAILED，后续回归通过，未将此环境问题宣称已根治。
- 便携完整 GUI 回归与重启通过（output/smoke-packaged/1791748549878，手动清理补充前）；最终便携 T07 专项与重启通过（output/lifecycle-packaged/1791749513131），覆盖历史恢复、手动清理及取消、回收站恢复、永久删除及取消、文件夹删除，以及删除笔记后编辑器清空／禁用。
- 尚未用户验收；未验证真实硬件断电、长期大历史性能、Windows 10 实机；永久删除不是安全擦除。指南与回退见 [T07 测试](t07-testing.md)。T07 未提交，T08 未启动。

T07.1 最终界面复查补充：移入回收站后清空并禁用旧编辑器；手动清理／删除组织项升级架构后立即刷新笔记本注册信息，设置页无需重启即可显示新架构版本。最终构建与便携专项复测通过。

T07.1 最终部署完成：release/NotebookAid-0.7.0-t07.1-win-x64.zip；SHA-256 7d14801ee99e3fe803ef6ebd8b350342542e0d8793edcc534eadc2346aee610a。Prepare-TestPortable.ps1 已替换 C:\Softwares\NotebookAid-win32-x64，NotebookAid.exe 位于根目录，verified=true、backupCreated=false。此前同版本构建为交付前中间产物，以此哈希为准。等待用户验收，不提交 T07、不启动 T08。
## T07.2 编辑布局与全屏联动（2026-10-11，待验收）

用户确认预览：标签选择器与置顶、历史版本、移至回收站保持同一行，合并模式切换和 Quill 工具栏；进入全屏最大化窗口并将标题移入顶部固定保存栏，退出恢复普通窗口与原标题位置。已按此范围实现；窗口 IPC 验证调用来源和布尔参数，核心数据格式不变。

- 构建通过；核心测试 85/85（output/t07-ui-tests-approved.txt）。沙箱内符号链接测试受 EPERM 限制，在授权测试环境重跑通过。
- 最终打包版本专项及重启通过（output/lifecycle-packaged/1791753357123）：960/1300px 操作不换行、合并工具栏不溢出、更多工具和导出菜单、源码模式、窗口最大化与尺寸恢复、标题位置及编辑保留、快捷键和进入历史页自动退出；另覆盖原 T07 生命周期测试。首轮新增布局测试产生额外历史影响旧断言，修正测试标题复原后通过。
- 版本 0.7.0-t07.2；T07 仍待用户验收，未提交、未启动 T08。测试步骤和回退参见 [T07 测试](t07-testing.md)。

T07.2 最终完整便携 GUI 回归和进程重启通过（output/smoke-packaged/1791753503313），consoleErrors=[]；覆盖保存、源码转换、代码语言、图片附件及导出。原代码语言测试需先展开新收纳菜单，已适配真实交互后通过。宽窗口隐藏多余收纳按钮的样式复查已包含在该最终构建。首次压缩与测试实例同时运行发生文件占用，已等待测试正常退出后重新生成 ZIP。

T07.2 部署完成：release/NotebookAid-0.7.0-t07.2-win-x64.zip，SHA-256 20e658cd36166a8ad6a0ff46c96f3266f86da537bf0bfd66fe78d3c56b1c2279。Prepare-TestPortable.ps1 已直接替换 C:\Softwares\NotebookAid-win32-x64，NotebookAid.exe 位于根目录，verified=true、backupCreated=false。保留 T07.1 ZIP 作为程序回退包；T07 待用户验收，未提交。

## T07.3 源码格式化、任务列表与表格样式（2026-10-11，待验收）

本轮按用户要求为 Delta 与 HTML 加入美化／最小化源码按钮及不同图标，保留撤销；格式化失败不覆盖原文。HTML 采用保守块间空白处理，保留行内文字、属性值、代码和 CSS 敏感空白，不承担清洗职责。任务列表改为主题勾选框；表格增加表头／正文行命令和默认表头，保存语义标记及 HTML thead/th。Markdown 保持首行表头约束。

自动验证与部署结果完成后补充。T07 仍待用户验收，未提交，不启动 T08。

T07.3 补充：模式名称统一缩短为“源码”，八种语言同步。新增列继承所在表头行标记；菜单关闭处理兼容非 Element 的事件目标。构建通过；核心串行回归 88/88（output/t07-source-tests-serial.txt），最终源码格式化单测 3/3。首轮并行核心回归的一次 WRITE_FAILED 已由组织专项及串行全量复测通过，但未确认底层暂时失败原因。开发版完整 GUI 与进程重启通过（output/smoke-development/1791754950213）。便携包完整回归中分别出现过测试笔记创建失败及新增截图事件触发的 target.closest 异常，已修正后者并以最终编辑器专项复测；最终结果见下。

T07.3 最终便携专项通过：output/editor-packaged/1791755750249 覆盖 HTML 美化／最小化、代码内容保护、撤销重做、表头／正文切换、新增表头列继承、语义 thead 及保存重载，未出现 renderer errors；output/delta-packaged/1791755818323 覆盖 Delta 美化／最小化、无效源码保护、任务列表、表格、图片、原生交换及进程重启。源码格式化针对最终保护补充单测 3/3。未对最终版再次运行全部 GUI 流程，已运行受改动影响的编辑器和 Delta 专项。等待用户验收，尚未提交。

T07.3 已部署：release/NotebookAid-0.7.0-t07.3-win-x64.zip，SHA-256 c8018d4fe034c13f73a974570f4780cbfe20c4f8de9d7f8ad0c6da030f058e77。Prepare-TestPortable.ps1 已清空旧测试程序并解压至 C:\Softwares\NotebookAid-win32-x64，NotebookAid.exe 位于根目录，verified=true、backupCreated=false。保留 T07.2 ZIP 可回退程序。T07 等待用户验收，未提交、未启动下一任务。

### T07 acceptance correction: consistent dialogs (2026-10-12)

User confirmed: unify application dialogs; keep native file pickers. Version 0.7.0-t07.4 replaces all four native message-box call sites with a shared CDK confirmation flow and fixes fullscreen metadata row vertical spacing. Pending trash confirmation preserves the visible note; cancelling returns focus to its action. T07 remains awaiting user acceptance; no commit or T08 authorization is inferred.

T07.4 verification: build passed; confirmation broker unit tests 2/2 passed; final packaged dialog smoke passed at output/dialog-packaged/1791757246687 (upgrade cancel/confirm, unsaved-exit cancellation, four cancellation paths, focus trap/restore, invalid response token rejection, confirmed trash, light/dark screenshots). Fullscreen metadata geometry passed at normal widths 960/1300 and maximized layout. Packaged lifecycle regression plus process restart passed at output/lifecycle-packaged/1791757255137, covering history restoration/manual cleanup, trash/restore/purge, organization deletion and persistence. git diff --check passed. This round did not rerun the entire core suite or every language/native picker manually; existing localization strings are reused and native picker paths remain unchanged.

T07.4 delivered: release/NotebookAid-0.7.0-t07.4-win-x64.zip, SHA-256 e105000c55cce91a2dcc1614ced75d84a8dfadf414192d8a345dea8fe29e4df5. Prepare-TestPortable.ps1 completed replacement at C:\Softwares\NotebookAid-win32-x64 with verified=true and backupCreated=false. The executable is directly at the target root. Retained T07.3 ZIP supports program rollback. Awaiting user acceptance; no commit or next task started.

### T07.5 exit controls (2026-10-12)

User requested a sidebar exit action and confirmation before sidebar/native window close, with Save and exit / Discard changes and exit / Cancel for unsaved notes, otherwise Confirm exit / Cancel. Implemented on the shared CDK dialog; tray exit uses the same flow. Autosave pauses during inspection/confirmation. Saving failure or inability to inspect never closes the application. The earlier close-to-tray default is superseded; explicit Hide to tray is retained. Eight UI languages updated, including Hong Kong Traditional Chinese. T07 remains awaiting acceptance and uncommitted.

Development validation: build passed; dialog broker unit tests 3/3; real Electron clean/save/discard exit plus restart passed at output/exit-packaged/1791758277299. Native close cancellation, sidebar collapsed entry, duplicate close guard and save failure were covered. Initial test run used the title input before note creation finished; its wait condition was corrected and all scenarios then passed. Final packaged validation and deployment are recorded below when complete.

T07.5 final packaged checks passed: output/exit-packaged/1791758383936 covers clean/save/discard real process exit and restart, sidebar collapsed entry, native close cancellation, duplicate-close guard, no saving before decision, and failed-save preservation. output/dialog-packaged/1791758393767 covers existing confirmation flows; output/lifecycle-packaged/1791758402202 covers history, recycle bin, organization deletion and restart. Build, dialog broker unit tests 3/3, locale completeness tests 2/2 and git diff --check passed. Full core suite was not rerun for this UI/exit protocol change. Tray routing is shared with the tested quit command; manual Windows tray/Alt+F4 and visual acceptance remain for the user.

T07.5 delivery completed: release/NotebookAid-0.7.0-t07.5-win-x64.zip, SHA-256 78d6d5ba0431d270cd12ec5a3efd1815c45b5c61af2bd5a143e5628db510b06c. Prepare-TestPortable.ps1 replaced C:\Softwares\NotebookAid-win32-x64, verified=true, backupCreated=false; NotebookAid.exe is at the target root. Retained T07.4 ZIP is available for program rollback. Awaiting user acceptance; no commit or next task started.

### T07.6 dialog heading alignment (2026-10-12)

User reported misaligned/undersized title icons and then requested an info icon without a circular frame. Shared confirmation headings now use a centered 24 px flex icon container, explicit title line height and a non-shrinking close control. Informational dialogs use an unframed variant of the existing Lucide Info strokes; warning dialogs retain TriangleAlert. All application confirmations share this component. The notification drawer has no leading title icon and already uses a flex header. T07 remains awaiting acceptance; no commit or next task authorized.

T07.6 validation: build and git diff --check passed. Packaged exit/restart scenarios passed at output/exit-packaged/1791790000211; packaged dialog regression passed at output/dialog-packaged/1791790009970. Screenshots were inspected for the unframed info heading and dark warning heading. No core logic changed; core tests were not rerun. Awaiting manual visual acceptance.

T07.6 delivered: release/NotebookAid-0.7.0-t07.6-win-x64.zip, SHA-256 942cfa10627c66df33078da3f81790d36a808571bbca8d8ecc3296736556c1bb. Test portable directory updated with verified=true, backupCreated=false. Retained T07.5 ZIP is the program rollback package. Awaiting user acceptance; not committed.


## T07 user acceptance (2026-10-12)

User explicitly accepted T07: “验收T07，开始下一个任务”. Accepted delivery is 0.7.0-t07.6, including lifecycle/history, source formatting and table presentation, editor layout, shared dialogs and exit confirmation. Scoped source, tests and documentation will be committed locally on main; generated packages and test output are excluded. The user also authorizes starting the next planned task, T08. Earlier pending-acceptance entries remain historical records.

T07 was committed locally on main as 89d1f68 (Complete T07 history, recycle bin and editor interface refinements). No remote operation was performed.

## T08 security settings decisions (2026-10-12)

- User accepted locking after 15 minutes of inactivity and on application exit or notebook switch. Failed saves must preserve edits and show an error instead of discarding them.
- User requested master-password enable/disable controls in global settings and independently for each notebook.
- User confirmed that global settings control only the default switch, which is off by default; every notebook has an independent master password and recovery key, with per-notebook overrides.
- Changing a setting must not implicitly decrypt existing notes or remove key protection. Enabling the global default alone does not create credentials or encrypt existing notes. T08 is not yet delivered or accepted.

### T08 Passkey scope clarification

User specified Windows 11 + iPhone iCloud Keychain and then clarified: “我希望的解决方式是用passkey解锁应用，然后用密码解锁加密笔记本”. Implement optional application Passkey authentication independently from per-notebook password encryption. Do not implement PRF-derived notebook keys. Physical cross-device authentication remains an acceptance check; native API availability and virtual signature tests cannot substitute for that check. See [security design](t08-security-design.md) and [T08 acceptance](t08-testing.md).

### T08 validation record — 0.8.0-t08.0

- Production Angular/TypeScript build and native WebAuthn helper compilation passed. Final core regression: 103/103 (`output/t08-core-final.txt`), including encrypted history/attachments, recovery, conversion interruptions, imports, filtering, request replay and Passkey signature validation. An earlier full run had one intermittent organization-write failure; its targeted rerun and the final full regression passed. Sandbox symlink/GUI restrictions required elevated test execution.
- Development Electron security workflow passed (`output/security-packaged/1791795723181`): setup/recovery acknowledgement, encryption, incorrect password rejection, clearing on lock, idle locking, draft preservation on save failure and restart locking. An earlier GUI script clicked Save before Angular updated dirty state; the script now waits for rendering after input.
- Production dependency audit reports the existing low-severity Quill 2.0.3 HTML-export advisory GHSA-v3m3-f69x-jf25; no new Passkey dependency advisory was reported. Quill remains at the agreed version. This is not an independent security audit.
- Physical Windows 11/iPhone/iCloud authentication, hardware power loss and real Thunderbird note transport remain unverified. Packaged checks and deployment results follow below; T08 is not accepted or committed and T09 has not started.

Final packaged checks passed: security plus restart (`output/security-packaged/1791795810437`), virtual Passkey app gate and blocked IPC (`output/passkey-packaged/1791795847632`), full existing GUI plus process restart (`output/smoke-packaged/1791795860343`, no renderer console errors). Native helper availability probe passed. Password-dialog and lock-screen screenshots were inspected. These checks do not establish physical iPhone authentication. Retained T07.6 ZIP is available for program rollback; schema 7 data requires a separate pre-T08 notebook copy to return to T07.

Deployment completed with `Prepare-TestPortable.ps1`: `C:\Softwares\NotebookAid-win32-x64`, version `0.8.0-t08.0`, `verified=true`, `backupCreated=false`. Retained ZIP: `release/NotebookAid-0.8.0-t08.0-win-x64.zip`; SHA-256 `99e22fdb0ea7c4dc9d17585e588b8c4338b3cec627913cc96c85faf7dd452577`. Program files were replaced only after process/link/user-data checks. T08 awaits user acceptance; no commit and no T09 work.

T08 验收说明已按用户要求改为简体中文，并同步测试目录、便携包目录及保留 ZIP 中的 `T08-TESTING.md`，未修改程序。更新后的 ZIP SHA-256 为 `680fd208eb98090ef1571e2d3143ee46caddbf1b22976e4aec4f6a180c58f8bb`；测试目录文档哈希与源码文档一致。T08 仍等待用户验收。

### T08.1 Passkey 锁屏重载修复（2026-10-12，待复测）

用户已在 iPhone 保存 Passkey，但手机认证后仍返回锁屏。使用有效虚拟签名后由渲染页面调用 `location.reload()`，复现旧版停留锁屏：`output/passkey-packaged/1791796810679`。根因是 `will-navigate` 无条件拦截；原专项使用主进程重载，未覆盖实际页面路径。根据 [Electron 导航事件文档](https://www.electronjs.org/docs/latest/api/web-contents/#event-will-navigate)，修复为仅在主进程已认证且目标为应用原始入口地址时允许导航。保留其他地址和未认证状态的导航限制。

版本 0.8.0-t08.1。开发版专项通过（`output/passkey-packaged/1791796983824`），覆盖有效签名、渲染页面重载后进入主界面、其他地址继续被拦截、锁定时拒绝笔记 IPC；核心 Passkey 测试 3/3、构建及 diff 检查通过。未更改凭据或笔记本数据，无需重新注册 Passkey。便携验证与部署结果后补，仍等待用户实机复测，未提交 T08，也未开始 T09。

最终便携包专项通过：`output/passkey-packaged/1791797117026`（渲染页面认证后重载、导航限制及锁定 IPC）和 `output/security-packaged/1791797120790`（密码、加密、自动锁定、保存失败保留草稿、重启）。本轮未重跑所有 103 项核心测试或既有完整 GUI 流程；本轮修改仅涉及导航条件，已执行相关专项。实际 iPhone 验证仍待用户复测。

T08.1 已部署至 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留包 `release/NotebookAid-0.8.0-t08.1-win-x64.zip`，SHA-256 `f040fad77f7779e5533b4e9f81c9d31fe14e145a0026e07ff2ab7f778f12f8bb`。仍等待用户复测，未提交或启动下一任务。

### T08.2 加密操作续接与锁状态（2026-10-12，待验收）

用户报告输入主密码后未看到加密，侧边栏锁定后仍可重新打开卡片，并要求动态锁图标。确认原流程在设置或解锁成功后直接返回，尚未执行原始加密请求；因此该笔记仍是普通笔记，锁定后依然允许访问。修复为等待设置或解锁成功后继续加密确认，取消时不续接；校验原笔记本和笔记仍被选中，避免更改其他笔记。已解锁时使用内存中的密钥，不保存明文密码或重复提示。

已加密笔记的安全按钮显示开锁／闭锁状态图标；普通笔记不显示锁图标。侧边栏显示已解锁／已锁定和对应图标，Tooltip 提示当前状态与点击操作。锁定时仍隐藏加密笔记并清空编辑区域。

开发版界面专项通过（`output/security-packaged/1791799049330`）：首次设置及解锁后继续加密、取消不加密、动态图标、锁定直接读取被拒绝，以及保存失败保留草稿、自动锁定、重启。核心安全测试 9/9、构建通过。本轮未改核心密钥及存储格式，仍待用户验收，未提交 T08，也未开始 T09。

最终便携安全专项及重启通过（`output/security-packaged/1791799613388`），加密开锁和锁定闭锁截图已检查；Passkey 回归通过（`output/passkey-packaged/1791799492602`）。既有按钮图标检查增加普通笔记安全按钮的明确例外，以符合用户未加密时不显示锁图标的要求。本轮未重跑全部 103 项核心测试及完整旧 GUI 流程，已执行受影响专项。

T08.2 已部署至 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留包 `release/NotebookAid-0.8.0-t08.2-win-x64.zip`，SHA-256 `d1a04078cf1cd5bea95a6807ad56154c99f53760eaac7ae0d7574f12127c1a24`。测试目录更新只替换程序文件，未修改用户笔记本及凭据。T08 等待用户验收，未提交及未启动 T09。

### T08.3 密码可见性与空选中状态（2026-10-12，待验收）

用户要求密码输入框右侧眼睛切换按钮，并要求未选中笔记时不显示保存和编辑栏。已添加各输入框独立的默认隐藏切换、Eye／EyeOff 图标、键盘原生按钮、aria-pressed 及八语言文字提示，重开对话框恢复隐藏。编辑区域在无会话时隐藏并显示空状态，保留 Quill 静态宿主以避免销毁后无法重新初始化；核心在锁定时仍清空敏感内容。

构建与 diff 检查通过；开发版安全及重启专项通过（`output/security-packaged/1791800669756`），覆盖切换保留输入值、重开隐藏、空状态隐藏控件、选中后恢复、加密及锁定续接。待便携验证与部署，未改加密存储或凭据，T08 仍未提交或验收。

用户本轮追加设置页手动升级架构。最新版本统一使用共享常量 7；旧架构右侧显示升级按钮，最新架构显示信息而不显示按钮。使用共享 CDK 确认，在笔记本旁 `.schema-backups/{uuid}` 完整备份后原子更新清单；检查架构并发变化、活动会话、损坏和恢复状态，非当前笔记本通过独立写锁升级而不切换活动笔记本。升级不自动加密或设置密码。

新增架构核心专项 9/9 通过（旧架构 1–6、备份可读、写入及备份失败保护、非活动笔记本隔离），组合界面专项及重启通过（`output/security-packaged/1791801627551`），包含取消升级、升级后版本刷新和按钮隐藏。完整回归首次 111/112（`output/t08.3-core.txt`），一项旧附件重命名发生 WRITE_FAILED；附件专项复测 6/6 通过，正在单独重跑完整核心回归。旧笔记本界面测试的图标断言已同步普通笔记安全按钮例外，原失败不是迁移数据失败。

单独重跑完整核心回归仍为 111/112（`output/t08.3-core-final.txt`），此次为旧近期笔记批量创建测试 WRITE_FAILED；文件系统诊断下该组织专项复测 6/6 通过（`output/t08.3-org-diagnostics.txt`），未复现底层错误。此前 T08 已记录类似偶发写入异常，本轮未确定底层原因，也未修改笔记提交逻辑，不声称全量回归全部通过。新增升级专项及受影响界面流程均通过。

最终便携组合界面及重启通过（`output/security-packaged/1791802342035`），完整既有 GUI 及进程重启通过（`output/smoke-packaged/1791802435438`，无渲染进程控制台错误）。密码按钮和空状态截图已检查。T08 仍待用户验收，未提交及未启动 T09。

Passkey 便携回归通过（`output/passkey-packaged/1791802817345`）。T08.3 已通过 `Prepare-TestPortable.ps1` 更新至 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留 ZIP 为 `release/NotebookAid-0.8.0-t08.3-win-x64.zip`，SHA-256 `4c25d56521410fc0625e35b74061afd123e0dd444c6fa9372226051d40e4c3e8`。未操作用户真实笔记本架构或凭据；升级由用户在设置页确认后执行。T08 等待验收，未提交，未开始下一任务。


### T08.4 笔记卡片加密状态（2026-10-12，待验收）

用户要求加密笔记卡片顶部右侧显示锁定／解锁小图标，普通笔记不显示。按现有安全状态及图标实现，复用八种语言状态提示；锁定时仍隐藏加密卡片。T08 尚未验收，不提交或开始下一任务。

本轮构建及 diff 检查通过；便携版安全专项和重启通过（`output/security-packaged/1791804176510`），新增断言覆盖加密卡片图标及普通卡片无图标，截图已检查。首次专项在保存步骤超时（`output/security-packaged/1791804135720`），复测通过，未确定首次超时原因。本轮未改核心存储，不重复全量核心测试；此前偶发写入失败记录仍保留。

T08.4 已部署至 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留包 `release/NotebookAid-0.8.0-t08.4-win-x64.zip`，SHA-256 `0af6240286da6413d2c548cc61ea0f7a7e2669b95dc4d1b8b9c22b4b9c213511`。未修改用户笔记本及凭据。T08 继续等待验收，未提交或开始下一任务。


### T08.5 侧边栏调整（2026-10-12，待验收）

用户要求笔记本锁状态文案、启动默认收起下级文件夹、对调折叠和退出入口。已实现并同步八种语言。文件夹展开仅保留当前运行状态，两种侧边栏共用树展开状态。T08 继续待验收。

构建与 diff 检查通过。开发版专项及重启通过（`output/security-packaged/1791806211791`），最终便携版专项及重启通过（`output/security-packaged/1791806357291`），覆盖侧边栏顺序、文件夹默认收起、两种界面手动展开／收起、弹出菜单选择和重启重置，以及笔记本状态文字。锁状态截图已检查；本轮仅调整界面，不重复核心全量测试，既有偶发写入失败记录仍保留。

T08.5 已更新 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留 ZIP `release/NotebookAid-0.8.0-t08.5-win-x64.zip`，SHA-256 `62473fcbe11c85fa246976a3b439f86d68010fcfd52864c44ed0dcd17d52715c`。可用保留的 T08.4 ZIP 回滚程序；未修改用户笔记本或凭据。T08 继续待验收，未提交，未开始下一任务。


### T08.6 卡片置顶图标与恢复密钥打印（2026-10-12，待验收）

按用户要求移动置顶图标、增加 Electron 打印和打印 PDF、明确来源笔记本密码标签。打印专用隔离页面限制外部资源，无自动明文副本；用户主动保存的 PDF 或打印件需独立保管。T08 仍待验收，未提交。

构建和 diff 检查通过。开发版及重启专项通过（`output/security-packaged/1791808628911`）；最终便携专项及重启通过（`output/security-packaged/1791808752293`），验证实际 PDF 生成（测试副本已删除）、模拟打印成功回调、打印无效输入和锁定权限拒绝、置顶图标右侧位置、来源密码标签及既有安全流程。卡片截图已检查；实体打印机和原生打印取消未实测。未重复全量核心测试，既有偶发写入失败记录仍保留。

T08.6 已更新 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留 ZIP `release/NotebookAid-0.8.0-t08.6-win-x64.zip`，SHA-256 `2dca9e48e66dae14e88b406a3c44515ec14033c236a29322e2023786fbe28b58`。可使用保留 T08.5 ZIP 回滚；未修改用户真实笔记本、凭据或生成其打印件。T08 继续待验收，未提交或进入下一任务。


### T08.7 应用内打印预览（2026-10-12，待验收）

用户批准增加统一 CDK 打印预览及打印、保存 PDF、取消按钮，预览只保留内存。已按此实现，沿用 Electron 输出接口及系统文件选择器；T08 继续待验收，不提交或进入下一任务。

构建和 diff 检查通过。开发版专项及重启通过（`output/security-packaged/1791809587024`），最终便携专项及重启通过（`output/security-packaged/1791809977129`），覆盖预览内容、无脚本隔离、取消重开、PDF 实际生成和删除、模拟打印回调及既有安全流程。窄窗口／深色主题按钮背景及边界检查通过，截图已检查并使用占位密钥。实体打印机及系统打印取消需用户实测；本轮未重复全量核心测试，既有偶发写入失败记录保留。

T08.7 已更新 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留 ZIP `release/NotebookAid-0.8.0-t08.7-win-x64.zip`，SHA-256 `a2f2031e349f61c8b8a673f7b6e7c1e5aca4af57e109f0f36a37ded580216cf8`。可使用保留的 T08.6 ZIP 回滚程序，未修改用户真实笔记本或凭据。T08 继续待验收，未提交或进入下一任务。


### T08 最后图标修正及条件验收（2026-10-12）

用户明确：“最后一个修改，安全按钮添加盾牌图标，界面语言选择器文字前面加图标，主题选择器文字前面加主题图标，完成后验收T08 包括T08.1到包括T08.7，开始下一个任务”。在最后修改验证并交付后记录 T08 批准、提交其全部范围并开始 T09。

T08 最后图标修正构建、diff 检查、安全／Passkey／架构专项 21/21，以及便携安全界面和重启专项（`output/security-packaged/1791810988226`）通过。根据用户上述明确条件验收，T08 包括此前子项及最后图标修正已批准。既有偶发核心写入异常与未实测的实体打印、Win10 条件继续在验收文档中保留，不宣称这些未验证项已经通过。

T08 最终交付 0.8.0-t08.8 已部署至 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留 ZIP `release/NotebookAid-0.8.0-t08.8-win-x64.zip`，SHA-256 `b9812e7c8c1be5bb19851d5e80994f2749dcb2ff7a7e6a3e61f7d84063a58b7d`。本地 main 提交 T08 全部已验收范围，包、输出、依赖及凭据不提交。


### T09 备份与存储（2026-10-12，开发中）

T08 已按用户验收授权提交本地 main：`dd8781b`。用户对备份策略选择“采用上述策略”：默认关闭，按笔记本选目录后开启每日备份，仅应用运行时执行，启动提示错过，不自动删除。

实现 `.nabackup` 文件夹快照及 SHA-256 清单，复制完整历史、回收站、附件和加密材料，跳过可重建索引和写锁；恢复及迁移只使用空目标目录，原目录保留，校验后原子切换登记路径。损坏或丢失原目录可从同一笔记本的快照恢复。加密笔记本锁定时进行原始字节快照及结构检查，认证内容验证需解锁，界面明确显示跳过数。待测试与交付，T09 不提交。

构建及 diff 检查通过；串行全量核心回归 120/120（`output/t09-full-core.txt`），后续补充复制失败及链接／损坏 JSON 后备份专项 10/10（`output/t09-backup-final2.txt`）。最终便携 T09 专项及重启、正常退出通过（`output/backup-packaged/1791813753803`）；便携 T08 安全及预览回归通过（`output/security-packaged/1791813368135`）。界面截图已检查。首轮用例因结果提示未渲染、创建未完成而失败；一次便携重启检查虽生成通过报告，但在初始化期间请求退出导致超时（`output/backup-packaged/1791813367476`），已修正用例等待并通过最终复测，未绕过退出保护。未执行用户真实笔记本迁移或恢复，T09 等待验收、不提交。

T09 已部署 0.9.0-t09.0 至 `C:\Softwares\NotebookAid-win32-x64`，`verified=true`、`backupCreated=false`。保留 ZIP `release/NotebookAid-0.9.0-t09.0-win-x64.zip`，SHA-256 `cc1f43b3c10f7962adde8e594fc7e1b7e092716f1b516e1591c366d15d790814`。未修改用户真实笔记本或备份策略；T09 等待用户验收，未提交，T10 未启动。回退使用保留 T08.8 包及原笔记本目录，见 t09-testing.md。

### T09.1 笔记本外观追加需求（2026-10-12，已按条件验收）

用户明确批准预览并要求实现、打包及更新测试目录，随后追加十个预定义封面，允许选择内置或自有图片。本需求纳入当前 T09 的追加范围；这是实现授权，不是 T09 验收，不提交或开始 T10。顶部按用户最终决定优先封面，否则彩色笔记本图标，修正垂直居中。

实现笔记本内 appearance.json、本地核心校验与写锁、CDK 1:1 裁剪、六个颜色选项、十张原创 SVG 风景资源，以及卡片入口、占位图、顶部缩略图。内置和自选图片保存为重编码的 512×512 PNG，不依赖原文件路径。见 t09-appearance-testing.md。待最终验证、打包与交付。

T09.1 构建、编译及 diff 检查通过；外观／登记／备份核心 23/23，安全核心 9/9，八语言新增文字完整性检查通过。开发版外观和重启（output/appearance-packaged/1791817539603）、最终便携外观和重启（output/appearance-packaged/1791817656356）、便携备份与重启（output/backup-packaged/1791817421617）通过。截图已检查。首次链接夹具因沙箱权限受限，获准后复测通过；窄窗口初始测试混用原生与渲染尺寸，修正测试后通过。未更改应用窗口限制；未重跑全部旧核心测试或操作用户真实笔记本。等待用户验收，不提交 T09 或开始 T10。

T09.1 已打包并更新 C:\Softwares\NotebookAid-win32-x64，部署脚本返回 verified=true、backupCreated=false。保留 ZIP：release/NotebookAid-0.9.0-t09.1-win-x64.zip；SHA-256：1d51ed6d6a11d158e145697f3e5df95d99b8933ed4b2d05a3ae1bf4248c988fb。未修改用户真实笔记本或凭据。回滚使用保留的 T09.0 ZIP，见 t09-appearance-testing.md。T09 含此次追加外观需求等待用户验收，未提交、未启动 T10。

用户明确“预定义色块也扩展为十个，然后验收T09.1”。本轮增加四个清淡色块，总计十个；构建与最终便携外观／重启专项通过（output/appearance-packaged/1791818884776），覆盖十个色块逐一选中。按此条件验收 T09.1 外观功能，T09 备份主体仍未验收，不开始 T10。独立暂存树 Angular 与桌面 TypeScript 构建通过，外观核心 5/5 通过；准备独立提交已批准的外观源码、测试、资源和文档，保留未验收备份改动。

独立提交副本的组合核心检查首次 11/12：旧登记用例在首次 activate 的注册表原子替换处出现既有 WRITE_FAILED；外观 5/5 均通过。单独复测登记 7/7 通过。本轮未修改登记持久化算法或声称该偶发问题已修复，既有记录继续保留。

十色版 0.9.1-t09.1 已打包并部署 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false。保留 ZIP 为 release/NotebookAid-0.9.1-t09.1-win-x64.zip，SHA-256 36c5681a7132cdea471e1f5dddebcaa333edcacd155ba5c78b68fbe2f77d757f。未操作用户笔记本和凭据；可用保留的 0.9.0-t09.1 ZIP 回滚程序。用户条件验收的 T09.1 已完成，独立提交外观范围；T09 备份主体仍待验收。

### T09.2 原地恢复及明确错误提示（2026-10-12，待验收）

用户批准“先在临时目录恢复并校验，保留当前目录作为回滚副本，失败时自动回滚”，并要求明确来源／目标窗口和错误原因、打包更新测试目录。新增同级暂存与回滚更名事务、独立锁和原子恢复记录，默认禁止替换其他非空目录。完整记录的中断阶段可在重新打开时恢复；自动回滚失败保留数据并显示路径。只在隔离夹具中测试，不执行用户真实恢复。T09.1 已验收提交保持不变，本轮及 T09 备份主体仍等待用户验收，不提交或开始下一任务。

恢复／备份／外观专项 30/30，串行完整核心回归 142/142（output/t09-restore-full-core.txt），开发版恢复界面及重启（output/backup-packaged/1791821259810）通过，覆盖原地恢复、取消、故障回滚、保留旧内容、明确窗口用途、具体错误及旧备份回归。等待最终便携验证与交付。真实断电、磁盘满及杀毒软件锁定仍需人工测试，故障注入不等于真实硬件故障验证。

最终便携恢复界面及重启专项通过（output/backup-packaged/1791822386351），包含原地取消／成功、替换失败回滚、旧内容副本、具体错误、选择窗口标签以及新目录恢复／迁移／每日备份回归。错误和确认截图已检查。最终构建及 diff 检查通过；最后提示字段调整后恢复事务 14/14。八语言新增文字完整性检查通过。本轮等待验收，不提交；未执行用户真实笔记本恢复。

0.9.2-t09.2 已打包并更新 `C:\Softwares\NotebookAid-win32-x64`，部署脚本返回 verified=true、backupCreated=false。保留 ZIP：release/NotebookAid-0.9.2-t09.2-win-x64.zip；SHA-256：2ec54a6aac638bb000a7c5e6f8a6d0aaad698932101ffb2c591e44a8e45f17e6。未操作用户真实笔记本；程序和数据回滚步骤见 t09-restore-testing.md。T09／T09.2 等待用户验收，未提交、未开始下一任务。

### T09.3 原生窗口关闭选择（2026-10-12，待验收）

用户要求关闭原生窗口时询问最小化到系统托盘或退出应用。本轮复用 CDK 确认和现有托盘，增加受主进程校验的托盘选择；保留取消、未保存内容及既有保存／放弃退出逻辑。八语言新增文案同步，版本 0.9.3-t09.3。构建及确认代理 4/4 通过；开发版三种退出模式及重启通过（output/exit-packaged/1791824205977），验证保存／未保存托盘隐藏、草稿保留、不提前保存、取消、重复关闭及保存失败保留编辑。首轮沙箱 Electron 启动返回 2147483651，获工具批准后完成真实运行。等待最终便携验证交付，不提交或开始下一任务。

最终便携三种退出模式及重启通过（output/exit-packaged/1791824354040），确认代理 4/4、构建和 diff 检查通过。未重跑全部核心回归；本轮未修改备份或加密核心。托盘双击／菜单恢复沿用既有实现，用户可人工核对系统托盘入口；自动用例通过主进程重新显示窗口验证草稿保留。打包首轮沙箱路径规范化权限失败，工具批准后成功。T09.3 等待验收。

保留 ZIP release/NotebookAid-0.9.3-t09.3-win-x64.zip，SHA-256 216b819a1562368777108c099ac314efa7215d965ec43de1048dcc8cacc3e670。部署脚本检测到 C:\Softwares\NotebookAid-win32-x64\NotebookAid.exe 仍在运行并安全停止；未替换测试程序、未强制停止进程。已请求用户完全退出应用后继续更新。当前测试目录仍为 0.9.2-t09.2，本轮等待部署及用户验收。

用户确认已完全退出并授权继续更新。0.9.3-t09.3 已部署到 C:\Softwares\NotebookAid-win32-x64，Prepare-TestPortable.ps1 返回 verified=true、backupCreated=false，ZIP SHA-256：216b819a1562368777108c099ac314efa7215d965ec43de1048dcc8cacc3e670。未操作用户笔记本数据；等待用户验收，不提交或开始下一任务。

2026-10-12 用户明确验收 T09.3 和 T09，并授权下一任务。按要求移除所有统一确认对话框标题前的 info 图标（不留占位），保留警告和安全操作专用图标。T09.1 已独立提交；本轮准备提交其余已批准 T09 范围，随后开始 T10。

## T10 开发记录（2026-10-12）

T09／T09.3 已提交本地 main：ec7ac53，未推送。T10 接入现有 addon 安全核心、协议握手、分块预览、回收站及桌面定位，追加独立配置的标签映射字段（不改笔记架构）、无正文失效游标和重连。官方 API 已核对 Spaces 和 messages.tags。按最新要求将侧栏选择笔记本及锁定／解锁移至新建笔记上方。新增 UI 沿用主题，不增加桌面永久操作行。T10 等待验证和用户验收，不提交或开始 T11。

T10 开发版实际 C# 桥接／模拟 addon UI／重启通过（output/addon-packaged/1791830523012）；此前 output/addon-packaged/1791830015868 已通过基础用例。首次测试存在 TypeScript 引号、返回函数对象不可克隆、编辑会话隐藏拒绝未检查，以及退出取消尚未结束就收尾等夹具问题；修正后通过。后续 UUID 开头为数字时 CSS 选择器缺少引号造成随机失败，已修正。预览截图已检查，修正 hidden 属性被布局 CSS 覆盖和刷新时筛选器状态丢失。全量核心 151 项（output/t10-core-full.txt）：144 通过，7 项仅因沙箱禁止创建链接失败，获权限后 3 项及另外 4 项（output/t10-link-retest.txt）全部复测通过。最终 addon／后台／栅格图片权限专项 9/9。未重跑全部核心；后续限定修改不涉及其他核心路径。避免轮询扫描所有笔记本封面及加密清单，改为缓存登记名称及核心变化监听。


最终便携版 T10 实际 C# Native Messaging／模拟 addon 页面及重启通过（output/addon-packaged/1791830729356），确认无标题 info 图标、侧栏入口位置、搜索过滤、富文本预览、隐藏失效、编辑中删除拒绝、桌面定位、标签映射及回收站。最终图片类型白名单专项通过，仅允许 PNG／JPEG／GIF／WebP；SVG 不在 addon 渲染。全部检查和截图仍不能替代用户 Thunderbird Spaces、权限、真实安装、标签事件及大图片性能测试。T10 待用户验收，T11 未启动。

T10 ZIP／XPI 已交付，C:\Softwares\NotebookAid-win32-x64 已更新为 0.10.0-t10.0，部署 verified=true、backupCreated=false。ZIP SHA-256：e80f735659773a7da6e0ceccb1eac3da43e6b3e7fc1e5a4a40c5205027ec4360；XPI SHA-256：220b619c1a6b259d33c2fa9280eecbfc2cac4a5f036f8de8a959325a6835aa72。XPI 压缩目录路径已改为规范正斜杠，所有必要脚本／样式／图标／许可证条目和内部版本 0.10.0 校验通过；旧 Compress-Archive 生成反斜杠条目，已替换其 addon 打包部分（未改变便携程序打包流程）。首次 Windows PowerShell 加载 ZipArchiveMode 类型失败，补充加载 System.IO.Compression 后生成及校验通过。未安装到用户 Thunderbird 配置或修改注册表；用户按 t10-testing.md 实机验收。T10 不提交，T11 未开始。

2026-10-12 T10 验收修订：用户要求将同步标签按钮改为“从 Thunderbird 导入标签”。八语言对应文字同步改为明确的 Thunderbird → 笔记本方向；功能和协议不变，桌面包 0.10.0-t10.1、XPI 0.10.1。等待打包部署与用户验收，不提交或开始 T11。

用户随后明确更正：生成的 XPI 改名为 NotebookAid.xpi，以后使用此名称。已更新打包脚本、当前验收指南及本轮交付文件；既有 addon ID、Native Messaging 主机名和协议保持兼容，历史保留版本 ZIP 不重写。

0.10.0-t10.1 已打包并更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false。addon 后台／清单已有检查 2/2，通过 XPI 内部版本及中文新文案核对；未重跑 Electron 或全部核心回归，业务行为不变。ZIP SHA-256：810df1860642b488587dbe9d73660f5abc1612f0fc953da0972a8662609a1a25；NotebookAid.xpi SHA-256：e9c3de189c13eefbf1f38f64b8ee2003d44cb1b6e41dab029e59c9581b789d1e。后续交付固定使用 NotebookAid.xpi；未安装到用户 Thunderbird 配置，需用户重新加载或安装此 XPI。T10 等待验收，不提交、不开始 T11。

T10 标识与兼容迁移追加授权：用户明确要求内部标识去掉 T02，同时更新插件、注册脚本与兼容迁移。本轮新主机 de.zub_systems.notebookaid、新插件 notebookaid@zub-systems.de、新管道 NotebookAid-、AppUserModelId de.zub-systems.notebookaid；旧名称只作为迁移来源及旧插件别名保留。应用状态原子复制至 NotebookAid/state，保留旧配置与实际笔记本路径。一次性 NotebookAid-Compatibility.xpi 转移旧插件标签映射命名空间；不修改用户真实注册表或安装插件。版本 0.10.0-t10.2／XPI 0.10.2，T10 等待验收。

标识迁移验证：迁移／注册 mock／插件交接／Passkey／SQLite 核心专项 12/12（output/t10-identity-checks.txt）；追加关键配置丢失拒绝及 RemoveLegacy 后，迁移专项 5/5。旧目录与新目录冲突、旧进程占用、原始配置保留、Passkey 门禁延续、注册失败回滚／WhatIf／外来目录拒绝均在隔离夹具中验证，未写真实 HKCU。首次 mock 作用域不正确与 Windows PowerShell 空字符串传给 File.Replace 的夹具／兼容问题已修正并通过。开发版新管道 Native Messaging／界面／重启通过（output/addon-packaged/1791834497846）。仍需用户真实 Thunderbird 插件 ID 配置交接与 iPhone 解锁验收。

最终便携版新标识 Native Messaging／界面／重启通过（output/addon-packaged/1791834897174）。未修改实际用户注册表、应用状态或 Thunderbird 配置；真实旧 ID → 新 ID 扩展存储交接及 iPhone 解锁仍待用户验收。旧主机别名可由 Register-Bridge.ps1 -RemoveLegacy 在迁移确认后清理；建议先禁用兼容插件，保留回退存储。T10 待验收，不提交。

0.10.0-t10.2 已打包并更新 C:\Softwares\NotebookAid-win32-x64，部署 verified=true、backupCreated=false。ZIP SHA-256：33fe53f25d67a0f66c9eacf18b17fc8a7c1c0a1954ac66e0b65fea5a1db07011。主 XPI 及兼容 XPI 的版本、ID 与规范 ZIP 路径校验通过，随包交付。注册脚本、旧配置复制及扩展配置交接仅在 mock／隔离测试中执行，未对实际用户状态迁移。需用户先重新注册，安装兼容包再装主包完成存储交接；T10 待验收，不提交、不开始 T11。

2026-10-12 用户明确验收 T10 并授权下一任务。T10 包括标识统一及兼容迁移修订已获验收，按已记录的检查边界提交本地 main；不推送。随后开始 T11。

## T11 AI 连接（2026-10-12）

T10 已按用户明确验收提交本地 main：a5c3b59，未推送。用户授权开始下一任务 T11。实现独立注册的官方 ChatGPT 订阅登录、Gemini／Claude Key、账户与模型选择、取消／断开／刷新，八语言及全局设置入口。凭据经 Electron safeStorage 保存到应用状态，笔记及备份不包含凭据。不发送笔记内容，不实现 T12 写作，不自动切换渠道。新增 jose 6.2.2（MIT）进行 JWT 身份校验，保留许可证，不升级现有框架。

生产构建及 AI 隔离专项 17/17 通过；开发版 Electron DPAPI／设置界面／模拟列表／断网／取消／重启通过（output/ai-packaged/1791836639095），截图已检查。首轮沙箱拒绝临时更名、一次自测入口位置错误、主题测试未更新 renderer 等失败已修正并记录于 t11-testing.md。未进行真实账户登录、收费推理或用户笔记操作。等待最终打包验证与用户验收，不提交 T11 或开始 T12。

最终便携 AI 专项及重启通过（output/ai-packaged/1791837117744），实际 Windows DPAPI、模拟模型列表、断网、取消、模型选择、秘密不回传及重启保留均通过。最终便携 Passkey 门禁专项通过（output/passkey-packaged/1791837121706），验证锁定时 AI IPC 拒绝、虚拟签名解锁和导航限制；不等于真实 iPhone 测试。八语言文字完整性及 diff 检查通过。未重跑全部旧核心测试或执行真实 AI 账户/计费请求。T11 等待用户验收，不提交或开始 T12。

0.11.0-t11.0 已打包并更新 C:\Softwares\NotebookAid-win32-x64，Prepare-TestPortable.ps1 返回 verified=true、backupCreated=false。保留 ZIP：release/NotebookAid-0.11.0-t11.0-win-x64.zip；SHA-256：190e11c4a314bcf255e7957b1e552921f3670bbcc3a546a45e594e0b964f0b87。额外 ASAR 核对最初使用正斜杠查找，Windows archive API 因路径分隔符返回未找到；改用 path.join 后三个 AI runtime 文件与构建逐字节一致，jose 6.2.2 已包含。最终 GUI 检查已先通过，部署未修改用户凭据或真实笔记本；回滚使用保留 T10 ZIP。T11 等待用户验收，T12 未开始。

### T11.1 模型列表与提供商分组、自动续期（2026-10-12，待验收）

用户报告 ChatGPT 登录后模型列表为空，并要求带图标的提供商选择、仅显示对应设置；随后明确启用订阅登录自动续期。代码确认原登录流程仅保存凭据，未请求模型。已增加登录／账户切换后获取模型、打开已连接提供商设置时加载模型，失败保留登录并明确提示；不猜测或回退静态模型。提供商单选只选择显示面板，不自动改变已选连接或计费。续期仅对活动 ChatGPT 注册，30 秒检查，到期前 60 秒刷新，临时失败 5 分钟退避，授权失效等待重登录，锁屏暂停、退出停止。

构建、AI 核心及 IPC 调度专项 21/21 通过；开发版提供商隔离／模型加载／取消／重启及深色主题通过（output/ai-packaged/1791838116539）。首次截图未等待界面稳定绘制，调整测试等待后复核，不修改无关主题样式。真实账户模型返回及持续续期需用户复测，未读取用户真实凭据或进行收费请求。本轮待最终便携验证及用户验收，不提交 T11 或开始 T12。

T11.1 最终便携 AI／提供商隔离／重启／深色主题专项通过（output/ai-packaged/1791838278880），便携 Passkey 门禁回归通过（output/passkey-packaged/1791838285641）。21 项隔离核心／登录编排／续期调度通过，八语言新增标签检查、生产构建与 diff 检查通过；包内 AI runtime 与构建逐字节核对一致。未使用真实 ChatGPT 令牌、未实测用户模型目录或长期服务端续期；这些仍需用户验收。

0.11.0-t11.1 已打包并部署 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false。保留 ZIP release/NotebookAid-0.11.0-t11.1-win-x64.zip，SHA-256 79b4ee591f08c44d6ec6c98b89fc645b0f34689eb052fe94829afff3e2ca91eb。用户凭据与笔记本未被修改；程序回滚使用保留的 T11.0 ZIP。T11 仍待验收，不提交或开始 T12。

### T11.2 标题统一（2026-10-12，待验收）

用户要求原生窗口标题一律改为 NotebookAid。确认 src/index.html 残留 T04 的页面标题在载入时覆盖窗口初始标题。页面、主窗口、托盘提示及 EXE 产品说明去掉任务编号；不改变任务状态或旧交付文档。沿用 Passkey 便携专项检查普通／锁屏标题，未修改 AI 和笔记核心。等待打包验证和部署，本轮仍为 T11 验收修正，不提交或开始 T12。

T11.2 生产构建及 diff 检查通过；便携 Passkey 专项通过（output/passkey-packaged/1791838844529），新增断言确认普通及锁屏页面窗口标题均为 NotebookAid。未重跑 AI 核心，因为其逻辑未改变。0.11.0-t11.2 已部署 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false；保留 ZIP release/NotebookAid-0.11.0-t11.2-win-x64.zip，SHA-256 81640d91cd3506264b25a779208b8646ba7dcde3d49dd5e67e6f7237fcdb16b9。用户笔记和凭据未修改，可用保留 T11.1 ZIP 回滚程序。T11 仍待验收，不提交或开始 T12。

### T11.3 条件验收前的账户标签修正（2026-10-12）

用户明确“好的，修改完成后验收T11，开始T12”。按此将账户选择器改为邮箱不重复时只显示邮箱，邮箱重复时附加注册 ID 后缀区分；不改登录注册、凭据或账户 ID。构建、AI 核心／IPC 专项 21/21 通过，覆盖单一邮箱与重复邮箱标签。待交付该修正后记录用户条件验收并提交 T11，再开始 T12。

T11.3 最终便携 AI／提供商分组／重启通过（output/ai-packaged/1791839466967），已更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false。ZIP release/NotebookAid-0.11.0-t11.3-win-x64.zip，SHA-256 5d31acc2cffa14d62e9fc25fcbed6f425450085d219802b49f5916319bf4278d。按用户明确条件验收，T11 及其验收修正已批准，准备提交本地 main 后开始 T12。此前模拟和真实账户测试的边界仍保留，不将条件验收写成未执行的真实账户测试结果。

### T12 AI 写作与手动摘要（2026-10-12，开发中）

T11 已按用户明确条件验收提交本地 main：c731b10，未推送。实现主动选区／全文写作、润色／改写／扩写／缩写／翻译／续写／自定义、CDK 预览及插入／替换／撤销，支持 ChatGPT 订阅和 Gemini／Claude 原计费渠道。手动摘要独立于正文保存，记录来源正文版本、修订、时间和模型；正文修改显示可能过期，不自动生成。旧笔记本首次摘要经现有 CDK 升级确认，完整备份后升级架构 8；摘要沿用加密、历史、完整备份和跨库导入。复用 parse5 8.0.1 和 marked 18.1.0，不升级框架，许可证保留。

请求在核心绑定笔记本、编辑会话、版本及所有者；取消、锁定、删除、会话结束、切换或过期丢弃旧结果。加密文本发送前由主进程发出 CDK 确认；未完成或失败的 SSE 不返回部分成功结果，无自动重试或渠道切换。结果仅内存预览，正文只在用户应用后修改，摘要通过同一核心提交。限制及格式边界见 [T12 验收指南](t12-testing.md)。

生产构建、78 项写作／提供商／IPC／AI／架构／加密／备份／导入专项通过。开发版 Electron 模拟预览、插入、替换、撤销、富文本选区、摘要、架构升级、过期提示、取消及重启通过（output/writing-packaged/1791840903305）；截图已检查。测试读取接口、等待条件及空行预期已修正，一次 Windows EPERM 复测通过。未执行真实账户推理或用户数据操作。待最终便携验证和部署，T12 尚未验收，不提交、不开始 T13。

最终新增文本长度／空输出边界并复测 11 项写作检查通过，共 79 项相关测试。0.12.0-t12.0 便携写作及摘要重启专项通过（output/writing-packaged/1791841271460）；便携 Passkey 门禁回归通过（output/passkey-packaged/1791841277314），锁屏时写作 IPC 拒绝，虚拟签名解锁验证不等于真实 iPhone 验证。包内 runtime 与当前构建逐字节一致，parse5／marked 版本及许可证、八语言文字完整性与 diff 检查通过。

0.12.0-t12.0 已更新 C:\Softwares\NotebookAid-win32-x64，Prepare-TestPortable.ps1 返回 verified=true、backupCreated=false；未修改用户笔记或凭据。保留 ZIP：release/NotebookAid-0.12.0-t12.0-win-x64.zip；SHA-256：062f2ed4adf3e34904089e54d442e487af298e4a3b93e501e86db7872cb2cdbd。回滚程序使用 T11.3 ZIP，架构 8 笔记本需使用升级前完整架构副本；说明见 t12-testing.md。T12 待用户验收，未提交，T13 未开始。

### T12.1 翻译语言选择（2026-10-13，待验收）

用户要求翻译操作在“范围”之前增加目标语言 select，并通过全局设置选择默认语言，暂限界面的八种语言。实现独立 `global.translationLocale` 可选字段；旧设置不含该字段时沿用当前界面语言，用户保存后独立持久化。写作窗口临时改选不修改全局默认值，改选清除旧预览；其他操作隐藏此选择框。补充要求不再承担目标语言输入。核心验证语言白名单，将语言的明确名称写入翻译请求，不改变提供商和计费渠道。

生产构建及设置／写作／IPC／传输专项 26/26 通过；开发版翻译框显示条件、范围前顺序、八选项、全局默认保存／重启、临时改选及既有写作摘要流程通过（output/writing-packaged/1791842472095）。初次重启自测过早退出导致等待超时；补充等待编辑器初始化后通过，不修改退出业务逻辑。先前自测占用 DLL 导致一次打包 EPERM，等待其结束后重新打包。最终便携验证和测试目录更新完成后补充交付记录。T12 尚未验收，不提交、不开始 T13。

最终便携翻译／写作及重启专项通过（output/writing-packaged/1791842594329），截图已检查；翻译 runtime 与构建逐字节一致，八语言新增文字及 diff 检查通过。0.12.0-t12.1 已更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false；ZIP release/NotebookAid-0.12.0-t12.1-win-x64.zip，SHA-256 eea1d2c1ae22327c8bac660cf31462db59e12c9efc51967fce8fc84bd1be9adc。未操作用户笔记或真实 AI 凭据，未执行收费翻译。回退兼容说明见 t12-testing.md，T12／T12.1 均待用户验收。

### T12.2 Thunderbird 桥接修复（2026-10-13，待验收）

用户报告三个连接按钮无反馈，并询问是否每次重启需重新注册。只读检查确认两个 HKCU 注册仍指向测试目录，而更新后两个主机清单均缺失；通过原目录 Register-Bridge.ps1 恢复同路径配置和注册，保留脚本回滚快照。Prepare-TestPortable.ps1 更新后重建已归属当前目录的清单，不新增未注册端点、不修改外部注册，验证配置字段并报告恢复数量；ZIP 必须含原生桥接 EXE。修复 native Open 在未运行时不能独立启动的问题。XPI 升至 0.10.3，Native Messaging 不可用时显示八语言明确修复提示，不回传原始异常。T12 仍待验收，没有启动 T13。

插件／核心／身份迁移 14 项、部署桥接恢复专项和原生 Open 冷启动专项通过。部署专项覆盖两个端点、仅当前端点、外部注册及无注册，均使用隔离目录和模拟注册表。开发版真实 native EXE／插件页面与重启通过（output/addon-packaged/1791879341722）。首个部署自测在旧 PowerShell 缺少 Get-FileHash，补充测试哈希适配后通过；未改生产哈希逻辑。尚待最终便携验证及部署，真实 Thunderbird 需用户复测。

用户追加 Slogan 改为“本地记录，从容思考，智能回响”。已同步八语言界面文案，保留现有标点和样式，不改变品牌名或任务状态；生产构建与缺失主机错误反馈 2 项复测通过。桥接配置已先恢复，后续最终包同时包含本轮文案。

最终 0.12.0-t12.2 便携 native／插件页面及重启专项通过（output/addon-packaged/1791879746490），包内插件版本、源码和最新 renderer／Slogan 与构建一致。已更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2，确认本次部署自动恢复两个已注册主机配置。ZIP release/NotebookAid-0.12.0-t12.2-win-x64.zip，SHA-256 5b9fe0e3c4c33afaf7f1807363864fe4035240ed8c3fc7bfd3003294bc4791f0。新版 NotebookAid.xpi 内部版本 0.10.3、SHA-256 588bf6c87742f811ba9d9ecc25d8e08fe4180bbfaf8e392091650450c3bc494e；用户需更新现有同 ID 插件并在真实 Thunderbird 复测，不要求卸载旧插件或清除其存储。T12 继续待用户验收，不提交、不开始 T13。

### T12.3 AI 辅助开关与命名（2026-10-13，待验收）

用户要求设置页“AI 连接”改为“AI 设置”，模型提供商前加入默认开启的“开启 AI 辅助功能”checkbox，关闭时隐藏文档编辑栏按钮；追加按钮文字改为“AI 辅助写作”。实现可选全局布尔字段 aiEnabled，旧配置缺省开启，持久化并校验；关闭时隐藏入口，核心拒绝写作请求并允许取消，已有账户与连接设置保留。同步八语言标题、开关及写作文字。

生产构建、设置／写作 IPC 12/12 通过；开发版开关默认、隐藏／恢复、按钮名称、开关与摘要重启及既有写作流程通过（output/writing-packaged/1791881048910）。未使用真实账户推理。待最终便携验证和部署，T12 继续待用户验收，不提交或开始 T13。

最终 0.12.0-t12.3 便携开关／写作／重启专项通过（output/writing-packaged/1791881168682），主进程 runtime 与构建逐字节一致、八语言文字核对通过。核对脚本最初查找未参与桌面构建的 ai-i18n 输出失败，改为直接读取前端源码后通过；不是应用运行错误。第一次部署因桥接 EXE 短暂占用停止，检查已无相关进程后重跑完成，未强制终止应用或 Thunderbird。

已更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。ZIP release/NotebookAid-0.12.0-t12.3-win-x64.zip，SHA-256 7f9a078f33cb895550b71bd5e271d4d4334ffa5b7057896da3b01c0f4ed0a604。未修改用户笔记或 AI 凭据，开关回退兼容说明见 t12-testing.md；T12／T12.3 待用户验收，未提交，T13 未开始。

### T12.4 编辑格式与保存翻译（2026-10-13，待验收）

按用户截图在 HTML／Markdown／Delta 的斜体之后添加下划线、删除线、文字色和背景色，TXT 去掉首竖线。Delta 使用严格颜色属性，Markdown 采用受限制行内 HTML 保留非标准样式。翻译提供独立保存按钮，每篇笔记最近一次保存结果本地重读，不访问提供商；仅主动生成重新发送。架构 9 保存翻译与来源上下文，沿用加密、历史、备份、跨库导入，过期结果禁用应用；元数据总上限 512 KiB。首次生成摘要／翻译前明确确认备份升级，普通写作不升级。T12 尚未验收，未提交，未开始 T13。

T12.4 最终便携包界面与重启通过（output/writing-packaged/1791884253079），实际点击文字／背景调色板、检查 18px 图标及三格式保存往返、翻译本地重读、独立保存、过期限制和重启。截图已检查，ASAR 核心文件与构建产物一致，包含架构 9、最终样式及第三方许可证。最终包自测曾因截图变量重复声明中断，修复后通过；截图发现颜色图标受现有下拉框 padding 挤压，已局部修复并复测。不执行真实账户推理。

T12.4 已按 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP release/NotebookAid-0.12.0-t12.4-win-x64.zip，SHA-256 a03fda7bbf3e7e59e3724f6d156247084da589fb70bdb7d274d70c82f91ba3f0。未修改用户笔记／凭据；回退程序使用保留版本 ZIP，架构 9 必须恢复升级前完整架构备份至另一目录，详情见 t12-testing.md。T12／T12.4 待用户验收，未提交，T13 未开始。

### T12.5 颜色按钮垂直对齐（2026-10-13，待验收）

用户截图指出文字色和背景色图标比其他格式图标偏高。原因是颜色选择器沿用了 34px 容器高度，但标签 SVG 固定上边距；相邻格式按钮使用 24px 高容器。仅将两个颜色选择器统一为 28px，并将标签改为 flex 垂直／水平居中，不修改标题下拉框及调色板。沿用隔离界面专项，比较两种颜色图标与斜体图标中心，允许误差小于 0.5 CSS px。T12 待用户验收，未提交，未开始 T13。

T12.5 生产构建、diff 检查及最终便携界面／重启通过（output/writing-packaged/1791886528238）。HTML／Markdown／Delta 两种颜色图标与斜体图标中心差小于 0.5 CSS px，调色板实际操作和保存往返通过；既有翻译缓存、摘要及开关回归通过。未执行真实 AI 请求。

T12.5 已更新测试目录 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。首轮替换遇 Bridge.exe 临时访问拒绝，只读检查确认无相关进程后重试成功；未强制终止进程。保留 ZIP release/NotebookAid-0.12.0-t12.5-win-x64.zip，SHA-256 e7eacca529665185eebb4ef00226467727c2b7815cccf0123473bf1049685997。本轮回退用 T12.4 ZIP。T12／T12.5 待用户验收，未提交，T13 未开始。

### T12 验收记录（2026-10-13）

用户明确“验收T12，开始T13，完成后打包并更新测试目录，等我验收”。T12 及其 T12.1–T12.5 修改已获批准；准备提交对应已交付源代码、测试和文档至本地 main，不包含生成包、依赖、测试输出或凭据，不推送。

### T13 Tasks ICS 导入（2026-10-13，开发中）

T12 已验收提交至本地 main：af9fcf0，未推送。复用现有导入按钮，提供笔记文件／Tasks ICS 两个菜单项；统一 CDK 映射预览、逐项选择、异常报告。VTODO 转换为所选文件夹内的普通 TXT 笔记（默认未分类），日期-only／浮动／UTC／TZID 保留语义；重复模板与例外明确保留文字而不展开。相同 UID／例外及字段快照跳过，来源更新另建副本，不覆盖本地编辑；先完整备份再逐笔记原子提交，持久操作记录支持中断重试。新增 core/tasks.ts、shared/tasks.ts 和独立 tasks-imports.json 版本 1，不升级笔记本架构；字段映射、限制及回退见 t13-testing.md。新增锁定 ical.js 2.2.1（MPL-2.0），框架及其他依赖未升级。

核心专项 10/10 通过，包含进程在 head 发布后中断、重试不重复、完整备份恢复去重记录、未知时间区保留与字段错误报告。开发版 CDK 界面及重启通过 output/tasks-packaged/1791889465300，覆盖预览只读、取消、失效 token／来源拒绝、重复跳过、来源更新副本保留本地编辑、普通文件导入菜单、浅深主题及去重记录重启。初次测试的重复 close 清理、数字属性选择器及异步加载等待已修正，没有因测试调整放宽业务校验。最终便携验证及部署待完成；T13 未验收，不提交、不开始 T14。

T13 最终便携界面及进程重启通过 output/tasks-packaged/1791889872673，浅深主题截图已检查；应用 Passkey 门禁回归通过 output/passkey-packaged/1791889879677，Tasks 预览 IPC 在应用锁定时按预期拒绝，使用虚拟签名器，未实测实体 iPhone。本轮生产构建、34 项 Tasks／备份／核心检查通过，不使用 AI，也未测试用户自己的 Thunderbird 导出文件。

T13 最终主题适配包验证及进程重启通过 output/tasks-packaged/1791890144429，八语言菜单、提示和错误文案静态检查通过；ASAR 核心、IPC、前端与构建产物一致，ical.js 2.2.1 完整源码／发行文件及 MPL-2.0 许可证已验证。导入功能交付完成，测试目录部署待执行；T13 待用户验收，不提交，不开始 T14。

T13 0.13.0-t13.0 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。ZIP release/NotebookAid-0.13.0-t13.0-win-x64.zip，SHA-256 f5e60537da61493e8ad0b7d7a2a22187c8d5488039d3ad3d4c3a42fd2cdd8020；T12.5 ZIP 保留用于回退。未修改用户真实笔记、凭据、Thunderbird 配置或注册表。T13 待用户验收，未提交，T14 未开始。

T13 验收修正：按用户要求增加目标文件夹选择，默认未分类，包含所有已定义子文件夹；仅点击选择 ICS 文件时打开系统选择器。核心校验目标文件夹及组织版本，避免过期预览写入错误位置。版本 0.13.0-t13.1，待用户验收。

T13.1 最终便携包与重启验证通过 output/tasks-packaged/1791895928816；41 项串行测试通过。ZIP NotebookAid-0.13.0-t13.1-win-x64.zip SHA256 d520c56e86a8093c4f2a4a1bafd27572f6d29886a6ddbcf367211e38068e0ae5。Prepare-TestPortable.ps1 检测到运行进程停止部署，等待用户完全退出后更新测试目录，未强制终止。待用户验收。

用户确认已完全退出后，T13.1 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2，ZIP SHA256 d520c56e86a8093c4f2a4a1bafd27572f6d29886a6ddbcf367211e38068e0ae5。T13 待用户验收，未提交，未启动 T14。

T13.2 当前任务修正（待用户验收）：用户批准 Tasks 来源字段和进度预览，追加批量清空文件夹要求。独立来源元数据需要架构 10，先备份后升级，核对旧版导入条目后可转换；批量清空支持未分类／完整子路径、默认不含子目录、回收／永久删除、确认数量和删除勾选、统一进度和备份。95 项相关回归及开发 Electron UI／重启通过，使用隔离夹具。T13 未验收，未提交，T14 未开始。

T13.2 最终验证：97 个不同相关核心测试（95 项综合回归加新增 80 条任务及损坏范围保护，两项均通过）；受最终更改影响的 Tasks／批量操作 20 项复核通过。最终便携 UI／重启 output/tasks-packaged/1791899403735 通过，应用门禁 output/passkey-packaged/1791899403346 通过；实体设备未测试。最终 ASAR 与构建一致、八语言标签完整。等待打包交付与用户验收，不提交当前任务。

T13.2 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP release/NotebookAid-0.13.0-t13.2-win-x64.zip，SHA256 139f6525705a35171a52d6ced1996b04d7d5b02be1e7270f74888ddef0f218e4。当前任务待用户验收，未提交，T14 未开始；架构 10 回退须使用升级前完整笔记本备份并恢复到另一目录。

T13.3 验收修正：用户删除 Tasks 导入笔记后希望显式重新导入。新增默认关闭的强制重新导入 checkbox，允许选择重复条目，在所选文件夹创建独立新笔记；保留原笔记、回收站和历史记录。记录格式 2 保留旧行并增加 force 副本操作记录；未知提交按未完成操作重试。当前任务待验收，不提交、不开始 T14。

T13.3 用户纠正删除语义：永久删除时应清理对应 Tasks 导入记录，普通重导按新增处理；回收站保留记录，强制选项用于显式副本。用户另明确授权清理当前真实笔记本现有记录：核验 43 条均关联已永久删除的笔记，应用已退出，取得 SQLite 排他锁，备份记录文件后原子清空，现存笔记目录未变；备份在用户目录 NotebookAid.tasks-record-backups。未清理其他笔记本。

T13.3 最终便携 UI／重启通过 output/tasks-packaged/1791901420769，包内运行时／前端与构建一致，八语言强制选项完整；48 项相关回归通过。已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。ZIP SHA256 455a4adb7f0c33f4d2ea369050dbbe4a7f7ee07592d0b02a106c7ea970eca10b。用户真实任务文件未执行导入，真实数据仅清理已授权的 43 条无效记录。当前 T13 待验收，未提交，T14 未开始。

T13.4 验收修正：用户要求恢复密钥建议打印文件名包含对应笔记本名称。保存 PDF 从主进程当前笔记本显示名称生成安全文件名，打印文档标题同步设置。T13 仍待验收，未提交，T14 未开始。

T13.4 最终验证：文件名边界检查与 9 项加密核心回归通过；开发版 output/security-packaged/1791902804355 和便携包 output/security-packaged/1791902894946 的恢复密钥 PDF／模拟打印及重启检查通过。真实打印驱动未测试；旧安全夹具的架构预期改用最新版本常量。ASAR 恢复打印相关运行时与构建一致。用户确认退出后 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2；ZIP SHA256 5d0bbf35b8f551588922bb31690a5c5132cc7b0976ddd8707cd12838704f398f。T13 待用户验收，未提交，T14 未开始。

2026-10-13 用户明确“验收T13，开始T14，完成后打包并更新测试目录，等我验收。”据此批准 T13 及其交付修正，准备提交本地 main；T14 已授权开发，完成后仍须独立验收，未授权 T15-A。

### T14 界面与可访问性（2026-10-13，验证中）

T13 已按用户明确验收提交本地 main：44ad970，未推送。T14 增加全局 75%–200% 界面缩放及重启／锁屏保持、快捷键说明和全局入口、八语言提示与后续 ShellNew 文字资源；改进选择器和 Tooltip 的无障碍关联、选中状态、跳到主内容、浅深主题对比度及减少动画。新增界面错误处理不记录原始异常、自动刷新或丢弃编辑。设置与消息中心的已知错误显示本地化原因及代码。大缩放保留三栏，允许滚动访问，不改变图片／笔记内容。T15-A 尚未开始。

首轮开发专项缩放检查未等待主进程异步 IPC，修正测试等待后通过；综合旧测试的第一侧栏入口定位和所有按钮必须 SVG 的假设已按现有颜色／封面无障碍标签调整。未因测试放宽主进程调用者或缩放值校验。实际键盘、输入法、屏幕阅读器及 Win10 尚未验证，最终包结果另记。

T14 最终生产构建与 13 项设置／语言／缩放检查通过；开发版综合界面及重启 output/smoke-development/1791904449233 通过。跳到主内容按钮曾使用未注册图标名导致构建失败，已改用现有 ChevronRight 并成功重建；失败构建后生成的中间包未部署，最终包重新生成并核对。最终便携专项／重启 output/ui-packaged/1791904941532 和虚拟 Passkey 门禁 output/passkey-packaged/1791904949270 通过，运行时及前端与最终构建一致。未知错误代码包含原型属性的边界也已验证，不输出原始异常载荷。实体输入法／键盘、Narrator、Win10 和真实 iPhone 未验证。T14 等待最终综合回归及部署后用户验收，未提交，T15-A 未开始。

T14 最终便携综合回归与重启通过 output/smoke-packaged/1791904950804，consoleErrors=[] 且未出现未处理界面错误。涵盖原有编辑、选择器、组织、导入、附件、语言、通知、设置及保存失败保留。等待测试目录部署，不提交 T14，不启动 T15-A。

T14 ZIP 已生成，SHA256 82e21af414c0bf0430284584fe98ecf342709b546a1f59457d4589560f9eecc5。Prepare-TestPortable.ps1 检测到 NotebookAid 或原生辅助进程仍在运行，已安全停止，等待用户完全退出后继续部署；未强制终止进程，测试目录尚未更新。

用户确认已完全退出后，T14 0.14.0-t14.0 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。ZIP SHA256 82e21af414c0bf0430284584fe98ecf342709b546a1f59457d4589560f9eecc5，保留 T13.4 ZIP 作为程序回滚来源；设置回退兼容步骤见 t14-testing.md。T14 待用户验收，未提交，T15-A 未开始。

2026-10-13 用户明确“验收T14，暂时不进行下个任务”，T14 获批；随后单独批准新手引导预览并授权按预览实现，完成后打包部署并等待验收。T15-A 继续待授权。T14 准备提交本地 main，新增引导不混入已验收提交。

T14 已依用户明确验收提交本地 main：11bca74。T14-A 为单独授权的新手引导，使用 Driver.js 1.9.0（MIT），已核对 npm 元数据及安装包 license；完成状态和进度通过本地设置核心保存，不传递笔记内容，不从 CDN 载入，不自动创建／导入笔记或调用 AI。开发专项 output/onboarding-packaged/1791909658152 四次进程验证通过，16 项设置／语言／状态检查通过。初次构建的资产复制因沙箱 EPERM 失败，允许后构建通过。新任务仍待验收，T15-A 未开始。

新手引导最终便携专项 output/onboarding-packaged/1791910072584 的首次／暂停重启继续／完成抑制／关闭抑制四次进程均通过，包含折叠侧栏及 200% 缩放。T14 界面回归 output/ui-packaged/1791910085961 及重启通过，虚拟 Passkey 门禁 output/passkey-packaged/1791910094108 通过；16 项设置／状态／语言核心检查通过。最终运行时、前端与构建逐字节一致，DRIVER-JS-LICENSE.txt 与安装包原件一致。实体输入法、Narrator、Win10、真实 iPhone 未测试。等待综合回归与部署，不提交本次新手引导，不开始 T15-A。

新手引导最终便携综合界面及进程重启通过 output/smoke-packaged/1791910095598，consoleErrors=[]，未出现未处理界面异常；编辑、设置、导入、通知和保存失败保留等回归通过。普通测试隔离夹具关闭自动提示以保持测试上下文，引导专项使用启用自动提示的实际同一入口。用户真实设置／笔记／凭据未被测试操作，功能等待用户验收。

新手引导 0.14.1-onboarding.0 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP SHA256 f9bd3c756ee30e667cc00ad68fe42de8720c5e17ba0c218b89c881089eb615b1，回滚使用 0.14.0-t14.0 ZIP 并按 onboarding-testing.md 处理设置字段。T14 已提交 11bca74；新手引导 T14-A 等待用户验收，未提交，未开始 T15-A。

2026-10-13 T14-A 验收修正 0.14.1-onboarding.1：用户报告教学按钮图标与文字错位、关闭按钮紫色外框。修正 Driver.js 内联 display 覆盖及导航组选择器，统一图标和文字居中，关闭按钮使用无外框的键盘焦点背景。构建、16 项设置／状态／语言检查及开发／便携四进程引导专项通过（便携 output/onboarding-packaged/1791912264589）；新增实际 DOM 对齐与关闭外框检查，覆盖浅深主题、各步及 200% 缩放。仍待用户验收，不提交，不启动下一任务。

0.14.1-onboarding.1 已更新 C:\Softwares\NotebookAid-win32-x64，部署 verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP SHA256 07d4b93ced58d65ea7ab3defed590b07a38ab53c1c46b008332a39b72dda11cf；当前 renderer 的五个 JS／CSS／HTML 文件及引导测试／主进程 Runtime 与 ASAR 逐字节一致，Driver.js 许可证一致。本次只修正当前引导验收，尚未提交；需要回退时完全退出应用后用保留的 0.14.1-onboarding.0 ZIP 恢复程序文件，设置无需变更。

2026-10-13 T14-B 0.14.2-menu.0 已实现主题选择器后的应用菜单、许可证／隐私／关于 CDK 弹窗及设置入口，备份错过提示与按钮垂直居中。用户补充“关于页面用于显示软件版本信息和作者信息等常用内容”，已显示实际版本、作者、邮箱、Slogan 及版权。许可证与本地 LICENSE 完全一致，第三方声明文件存在；隐私内容依据现有本地核心、AI 与桥接实现。七项界面／语言／引导检查通过；最终便携界面及重启 output/ui-packaged/1791919415127 通过，含八语言菜单与信息内容、焦点恢复、许可文本及版本核对、备份提示居中与编辑内容保留；引导四进程回归 output/onboarding-packaged/1791919329640 通过。关于、隐私及许可证截图已查看，实际键盘、Narrator、多显示器未验证。

已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2；ZIP SHA256 0673543b15f4c32e967758042eb9d6faa132d5f660c52df6021a3b1890357e24。前端与相关 Runtime 同最终构建逐字节一致。T14-A、T14-B 均待用户验收，不提交、不推进 T15-A。回退时完全退出，用保留的 0.14.1-onboarding.1 ZIP 恢复程序文件，设置及笔记架构无需变更。

2026-10-13 T14-B 验收修正 0.14.2-menu.1：用户报告菜单悬停文字闪烁、无法点击。Electron 鼠标事件复现旧版失败 output/ui-packaged/1791920051916；原因是右边缘推回的 tooltip pane 拦截指针。提示层 pane 设为 pointer-events:none，并添加左侧位置备选，未改变正常菜单交互。开发版 output/ui-packaged/1791920092062 及最终便携版 output/ui-packaged/1791920216460 界面／重启通过，新增悬停稳定、指针命中及鼠标事件点击打开菜单检查，八语言信息页和既有界面回归通过。前端及 UI Runtime 同构建逐字节一致；实体鼠标和多显示器需用户验收。

0.14.2-menu.1 已更新测试目录，verified=true、backupCreated=false、bridgeManifestsRestored=2；保留 ZIP SHA256 8d6367c8d3e9712b01223af55ee7a4b28d290008c994385843850b49fcb1c182。需要回退时完全退出后恢复 0.14.2-menu.0 ZIP，无需修改设置。当前 T14-A／T14-B 仍待验收，未提交或开始下一任务。

2026-10-13 T14-B 0.14.2-menu.2：依用户要求菜单按钮直接显示图标＋“应用菜单”，移除 Tooltip；菜单文字与主题选择器同为 11px，菜单项图标缩小至 14px，关于入口及标题缩短为“关于”，八语言同步。开发 output/ui-packaged/1791921021125、最终便携 output/ui-packaged/1791921147465 的界面／重启通过，新增入口文字、无 Tooltip、计算字号一致、图标尺寸及鼠标点击检查，实际截图已查看；前端与相关 Runtime 同构建逐字节一致，git diff --check 通过。实体键盘／鼠标及 Narrator 未验证。

ZIP SHA256 81ec6fb4cf56f457945e518ad6202e58077318ce74f5a17a4e6b3e19f0038f64 已保留。Prepare-TestPortable.ps1 检测到 NotebookAid 或原生辅助进程仍在运行并安全停止；未更新测试目录、未强制终止进程。已请用户完全退出后继续部署。T14-A／T14-B 仍待验收，未提交或开始下一任务。

用户确认“已完全退出，请继续更新”后，0.14.2-menu.2 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。部署 ZIP SHA256 81ec6fb4cf56f457945e518ad6202e58077318ce74f5a17a4e6b3e19f0038f64。等待用户验收；未提交或开始下一任务。回退可完全退出后恢复保留的 0.14.2-menu.1 ZIP，设置无需修改。

2026-10-13 用户明确“验收新手引导和应用菜单”，T14-A／T14-B 已批准并提交本地 main：6136373（Add onboarding guide and application information menu），未推送。随后用户直接授权右键菜单，作为 T14-C 单独实施，不开始 T15-A。

T14-C 0.14.3-context.0 已实现：卡片重命名、独立复制、确认后移入回收站、移动至全部文件夹／子文件夹、添加现有标签；TXT／源码及 Quill 编辑区提供剪切、复制、粘贴、全选，全部带 Lucide 图标及文字。使用现有 CDK 菜单／弹窗与本地核心，复制保留正文、附件、放置、Tasks 来源及加密／隐藏状态；新加密副本直接使用现有 NotebookSecurity 编码落盘，无明文中间副本。输入法组合输入、切换、锁定和旧选区有检查；复制操作保留操作 ID，以现有重试入口重放未知提交状态。

32 项核心／附件／加密／复制检查最终通过（一次目录链接夹具沙箱 EPERM 后，允许重跑 14 项核心全部通过）；开发专项 output/context-packaged/1791925774351 与最终便携专项 output/context-packaged/1791925846559 通过，涵盖五项卡片操作、嵌套文件夹、标签、删除取消／确认及四种格式的四项原生编辑命令。剪贴板在内存快照并恢复，没有跳过测试或记录原内容。最终界面及重启 output/ui-packaged/1791925853677 通过，八语言字典完整；菜单截图已查看，前端五个文件和六个相关 Runtime 同构建逐字节一致。实体鼠标、输入法、Narrator、多显示器及复杂外部剪贴板仍需用户验收。

0.14.3-context.0 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。ZIP SHA256 7121595ed4473c4f48a122678919d90019ca04dcd6171eb9b77b3243731846d4 已保留，退出后可恢复 0.14.2-menu.2 ZIP 回退，无需改变笔记架构或设置。T14-C 待用户验收，尚未提交，未开始下一任务。

T14-C 验收修正 0.14.3-context.1：用户报告旧 Markdown 笔记只显示源码。合成示例复现内联 HTML（删除线／下划线／颜色）的边界空格被 Turndown 重复添加，触发无损往返检查。修正自定义 HTML 规则的空白处理，不绕过格式校验、不修改真实笔记、不在打开时重写源码。新增原文保存、重新打开、嵌套列表／粗体／删除线及富文本编辑回归。当前任务仍待验收，未开始下一任务。

0.14.3-context.1 构建、四项格式核心、开发及最终便携编辑器回归通过，最终编辑器 output/editor-packaged/1791926819954、右键专项 output/context-packaged/1791926820980 通过。格式核心链接夹具沙箱 EPERM 后允许重跑通过；新增插入文字断言因不换行空格表示调整，未放宽源内容／格式保护。前端五文件及三个相关 Runtime 与 ASAR 一致。验证只使用隔离合成笔记，原用户笔记仍待人工复测。

修正版 ZIP SHA256 d1a56fab934be09c08c3cd50d8931eef0ae28b8002c250693901b84dfa1a2011 已保留；Prepare-TestPortable.ps1 已更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。等待用户复测原 Markdown 笔记及 T14-C 右键菜单；未提交，未开始下一任务。

用户随后明确确认：“Markdown笔记现在可以正常编辑了，验收T14-C右键菜单，暂时不进行下个任务。”据此 T14-C（含 Markdown 验收修正）已批准，按项目规则将本任务源码、测试及文档提交本地 main；不推送，不开始 T15-A 或其他新任务。当前测试版本仍为 0.14.3-context.1。

T14-C 已提交本地 main：c83f035（Add note context menus and fix Markdown whitespace roundtrip），未推送。用户随后单独要求“把联系人邮箱 改成 it@live.cn”，仅调整公开联系邮箱、关于页面、项目作者元数据及当前基线文档；历史记录中的旧邮箱保留。版本 0.14.3-context.2，未开始下一计划任务，联系信息调整等待用户确认。

联系信息调整构建通过；最终便携包 UI 及重启回归 output/ui-packaged/1791928231871 通过，关于页面截图已检查，显示 it@live.cn。包内作者元数据为 Jin Lu <it@live.cn>；当前前端五文件及三个相关 Runtime 与 ASAR 一致。回归中的 INVALID_INPUT 为非法缩放输入夹具的预期拒绝。本次不新增测试或修改运行逻辑，未提交。

0.14.3-context.2 已通过 Prepare-TestPortable.ps1 更新测试目录，verified=true、backupCreated=false、bridgeManifestsRestored=2；保留 ZIP SHA256 7abf5b815e832a6290a7083bfdc6e809bef4380be8d7b14d9ec74f17f631a41b。用户可在“应用菜单 → 关于”确认新邮箱；完全退出后恢复保留的 0.14.3-context.1 ZIP 可回退程序文件。等待本次信息调整确认，未开始下一任务。

2026-10-14 用户明确：“联系人邮箱修改验收通过，暂时不进行下个任务。”据此联系信息调整已批准，提交本次源码、项目元数据及文档到本地 main；不推送，不开始下一任务。当前已验收测试版本为 0.14.3-context.2。

联系人调整已提交本地 main：576b6c9。2026-10-14 用户单独授权移除侧边栏底部“T10／本地工作区”，将退出应用作为底部最后入口，并删除相关多余水平分割线。本次仅修改模板和对应样式，保留退出确认、托盘及保存流程；版本 0.14.3-context.3，完成后打包部署并等待验收，不进行 T15-A。

0.14.3-context.3 构建、最终便携 UI／重启 output/ui-packaged/1791929960147 及退出专项 output/exit-packaged/1791929960573 通过；退出专项覆盖展开／折叠入口、原生关闭、托盘、取消保留、保存失败保留及保存／丢弃退出后重启。展开与折叠截图已检查，退出入口为侧边栏最后按钮，底部标记及相关分割线已移除。当前前端五文件及三个相关 Runtime 与 ASAR 一致；UI 中 INVALID_INPUT 为非法缩放夹具的预期拒绝。未修改真实笔记，未新增测试，尚待用户验收，未提交。

0.14.3-context.3 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2；保留 ZIP SHA256 116d82d6f9a1dbc4655ba62561cb20cac03c2255923cee0cf91d1561d6d1e26b。请用户检查展开／折叠时侧边栏底部布局并确认退出／取消正常；完全退出后恢复保留的 0.14.3-context.2 ZIP 可回退。本次等待用户验收，不提交，不开始 T15-A。

2026-10-14 用户直接授权在笔记卡片右键菜单增加置顶／取消置顶图标、文字及功能。版本 0.14.3-context.4，在复制后增加状态相关的 Pin／PinOff 入口，复用已有八语言置顶文字及 NoteWorkspace.place／本地核心，不新增存储字段。动作先选择目标卡片并完成当前保存，再按最新会话状态切换置顶；原有切换、锁定及权限保护保留。新增现有右键专项中的置顶状态和置顶列表刷新验证；侧边栏调整继续包含在交付中，二者尚待用户验收，不开始 T15-A。

0.14.3-context.4 构建通过；开发右键专项 output/context-packaged/1791963340353、最终便携专项 output/context-packaged/1791963435498 通过，覆盖六项卡片操作、置顶／取消状态落盘、置顶列表取消后的刷新及四种编辑格式的原生剪贴板命令。原剪贴板已恢复。首轮揭示 CDK 缓存首次菜单上下文，已将状态展示改为当前列表信号；一次诊断进程退出但没有报告，未作为通过。最终截图已检查，当前前端五文件及三个相关 Runtime 与 ASAR 一致。实体鼠标、输入法、屏幕阅读器仍需人工验收，不访问真实笔记或 AI 服务。

0.14.3-context.4 已通过 Prepare-TestPortable.ps1 更新测试目录，verified=true、backupCreated=false、bridgeManifestsRestored=2；保留 ZIP SHA256 3f54d4b01179d0be6ec71bf4b114529ee88e19425a33e19e8bb376056aa8aa41。请用户检查置顶／取消置顶文字、图标、卡片标记和置顶视图；完全退出后恢复保留的 0.14.3-context.3 ZIP 可撤销本次菜单扩展。侧边栏调整及本次扩展仍待验收，不提交，不开始 T15-A。

2026-10-14 用户单独授权关闭主密码窗口显示加密笔记列表并批量解除。0.14.3-context.5 实现解锁后列表（含回收站及文件夹）、主密码验证、二次确认、自动备份、逐篇历史／附件转换和进度，失败停止并保留主密码；全部完成后仍由用户继续关闭主密码。复用既有加密事务及备份，不更改架构、密码算法或权限。批次不是统一原子事务；成功项为明文，失败项保留原保护，可从报告中的备份恢复数据，程序回退不重新加密笔记。未操作用户数据，仍待验收，不提交，不进行 T15-A。

12 项核心及加密检查通过（新增批量三项、原有九项），覆盖回收站、版本／附件、密文原件备份、错误密码、占用、取消及损坏附件。开发界面专项 output/decrypt-packaged/1791964692148 通过，验证锁定不泄露标题、错误密码、列表、回收站标记、取消不修改、备份／进度、批量后保持主密码、显式关闭及内容。首次夹具未选当前笔记本，随后取消监听函数跨进程克隆及字符串代次引用有测试错误，修正夹具后完整通过，未放宽权限或密码检查。新增 IPC 已检查 get() 异常时的批量标志清理。实际大笔记本速度、实体鼠标及真实断电仍待用户验收。

最终便携批量专项 output/decrypt-packaged/1791965126122 通过，最终源码保护改动为解锁但仍有加密笔记时禁用“继续”，全部解除后才允许关闭。最终列表截图已检查；八语言 72 个新增文字值完整，当前前端五文件及八个相关 Runtime 同 ASAR 逐字节一致。此前同版本右键回归 output/context-packaged/1791964903776 通过，最后仅追加关闭按钮状态条件。程序及数据回退边界见 decrypt-testing.md。

0.14.3-context.5 已通过 Prepare-TestPortable.ps1 更新测试目录，verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP SHA256 03f360ffabee2cd5124535a58127d8bd1aa2566dc42c90762a7c5289676dd480；完全退出后可恢复 0.14.3-context.4 ZIP 回退程序，数据需要从自动备份恢复，程序回退不撤销解除加密。请用户在当前笔记本设置的关闭主密码窗口验收列表、确认、进度、结果和继续关闭；仍待验收，不提交，不开始 T15-A。

2026-10-14 用户明确：“批量解除加密功能验收通过，侧边栏调整和右键置顶功能也验收通过，暂时不进行 T15-A。”据此三项增补功能均已批准，验收版本为 0.14.3-context.5；按项目规则将本批次源码、测试、项目元数据及文档提交本地 main，不包含生成包、依赖、测试输出或用户数据，不推送，不开始 T15-A。


2026-10-14 用户在只读启动分析后明确“好的，按你的建议进行优化”，并补充每页记录数量可配置、只按需读取正文。本次登记为 T14-D，不启动 T15-A。版本 0.14.4-startup.0：启动／切换显示实际阶段，列表和翻页只加载已校验元数据，正文在打开或主动全文搜索时校验读取，手动完整性检查、加密转换和备份验证保持全量检查；正文损坏检测从启动全量扫描移到访问或完整性检查时，不写入空正文。最近打开使用现有 recent.json，无架构升级；分页可选 10／20／30／50／100，默认 30。

五项新增核心／设置检查通过。完整串行核心回归 249 项中 248 项一次通过；导入故障恢复用例遇 Windows EPERM，独立重跑通过，重跑中的另一次导入重命名 EPERM 也在对应单例重跑通过。先前并行回归还出现两项偶发文件写入失败，串行均通过；未修改无关文件操作策略。开发 Electron 五次进程检查通过（普通／重启／空／加密锁定／不可用重试），output/startup-packaged/1791968942645；分页缩小为 10 并跨进程保持。测试截图已检查。

同一提升权限环境、同一合成笔记本（62 篇×8 版本）、每组五次重新打开：已验收源码 HEAD 基线总中位 2323.706 ms，优化版 1112.802 ms；正文读取 187→1，元数据读取 683→559，恢复收据均 496，读取字节 6073073→593719。未清除 Windows 文件缓存，测的是核心重新打开、列表、查询和选中，不是包含 Electron／Angular／Quill 的真实冷启动；此前受限环境测量不可用于这一性能比例。各阶段只返回耗时和数量，无私密日志。历史校验仍为最大阶段，未跳过恢复事务。等待最终便携验证和部署，尚未验收、未提交。


最终便携验证全部通过：启动／分页／五进程 output/startup-packaged/1791969506328；综合界面及重启 output/ui-packaged/1791969537449；右键及四种格式编辑 output/context-packaged/1791969551417；Native Messaging／Thunderbird 编辑定位及重启 output/addon-packaged/1791969559238；虚拟 Passkey 门禁 output/passkey-packaged/1791969565969。UI 缩放及门禁输出中的 INVALID_INPUT／APP_LOCKED 是预期拒绝用例。实体输入法、Narrator、真实 Thunderbird 鼠标操作、真实 Passkey 设备及用户笔记本冷启动仍待用户验收。ASAR 中全部 Runtime／Renderer 文件同最终生产构建逐字节一致。T14-D 待用户验收，未提交，不开始 T15-A。


0.14.4-startup.0 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP SHA256 64ebd50b335406fbf59d2e7b0a83d75229cf8d46d730ab6b07ac4856a71fd9ee；Runtime／Renderer 134 个文件与生产构建逐字节一致。验收包括真实冷启动、最后打开笔记、10／30／100 条分页及锁定／重试。回退使用 0.14.3-context.5 ZIP，并在旧程序启动前按 startup-testing.md 移除新增 global.notePageSize 字段；笔记无架构迁移。T14-D 等待用户验收，未提交，不开始 T15-A。


2026-10-14 用户明确：“启动性能优化和每页笔记数量设置验收通过，暂时不进行 T15-A。”据此 T14-D 已获用户验收，验收版本为 0.14.4-startup.0。本次仅提交本任务源码、测试、项目元数据及文档到本地 main，排除生成包、依赖、测试输出和用户数据；不推送，不开始 T15-A。

## T14-E 彩蛋收集（2026-10-14）

用户明确授权按交互预览实现彩蛋，要求系统日月、浅色太阳、深色月亮（随后明确纠正重复浅色），延迟加载、跳过／关闭／减少动画，打包更新测试目录，暂不开始 T15-A；随后要求隐藏开发信息条。版本 0.14.5-easter.0，待用户验收，未提交。六枚入口、全局设置、独立进度校验及自有轻量 Canvas；无新增依赖或动画资源许可证。详见 [验收说明](easter-testing.md)。

生产构建通过，12 项彩蛋与现有设置测试通过；开发 Electron 三进程专项 output/easter-packaged/1791974230425 通过，覆盖六个自然入口、三种主题图标、焦点恢复、进度跨重启、关闭保留进度、重置取消／确认、应用和系统减少动画、自动结束、跳过及 Esc。文件请求跟踪确认启动不加载四个彩蛋延迟模块，系统减少动画不加载动画模块。此前两次测试夹具未模拟焦点及调用 SVG.click，已修正为真实焦点与冒泡鼠标事件；非产品缺陷。最终源码均已重新构建测试。

同一现有工具链下，在仓库内隔离副本重建已验收 HEAD：初始总量 1.67 MB，最终初始总量 1.63 MB（构建器拆分布局不同，应比较全部初始文件，不能只比较 main）。只用于包体积，不声称真实冷启动速度提高。收集／设置／文案／动画独立延迟，动画约 1.30 kB，无新增依赖、资源或网络；实际实体键盘、屏幕阅读器和用户冷启动待验收。正在进行最终便携验证和部署，尚未提交，不启动 T15-A。

最终便携彩蛋专项 output/easter-packaged/1791974500576 三进程通过，追加验证关闭彩蛋后的月亮图标仍打开主题菜单；八语言综合界面与重启 output/ui-packaged/1791974535410 通过。右键四格式回归 output/context-packaged/1791974361673 及五种启动场景 output/startup-packaged/1791974369617 在最终主题点击条件／销毁清理小修正前通过，未重跑无关核心流程。缩放 INVALID_INPUT 输出为预期拒绝测试。最终包内 Runtime／Renderer 共 140 个文件与生产构建逐字节一致，无残留旧 Renderer 入口；生成暂存目录在已校验的仓库路径内清理，保留版本 ZIP 回退。初始入口实际文件合计基线 1673976 字节、新版 1631405 字节，不能据此承诺所有机器启动速度。

保留 ZIP NotebookAid-0.14.5-easter.0-win-x64.zip，SHA256 ac4ea49300c92d3992d9885f8a442b4c64a690837e5622709c8db1350f05bb7f。实体输入法／鼠标、Narrator、真实系统托盘和长时间业务流仍待用户验收。不提交，不开始 T15-A。


0.14.5-easter.0 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2，保留 ZIP 哈希一致。请在全局设置查看彩蛋开关及收集，验收六个入口、主题图标、减少动画、跳过关闭和信息条隐藏；程序回退按 easter-testing.md 移除可选 global.easterEggs 后恢复保留的旧 ZIP。T14-E 待用户验收，未提交，不开始 T15-A。

2026-10-14 用户要求将初见收集入口移到侧边栏主图标，改为三次激活。本次 0.14.5-easter.1 保留既有收集进度，移除关于页旧入口，同步八语言线索和寻找跳转，支持展开／折叠侧边栏及键盘操作。T14-E 仍待验收，不提交，不开始 T15-A。

0.14.5-easter.1 构建及最终便携三进程专项 output/easter-packaged/1791975223175 通过：折叠侧边栏，两次不触发、第三次收集、原生可聚焦按钮、焦点恢复、关于页旧入口移除、六枚收集、进度重启、启停、减少动画、跳过／Esc、重置和延迟模块请求。实际系统键盘注入在前一夹具未触发，未作为键盘通过证据；最终使用第三次鼠标事件验证用户要求，实体键盘仍待人工验收。包内 Runtime／Renderer 140 个文件与生产输出一致。保留 ZIP SHA256 c1be2d575937976023e8da32f359fb7cd3bb2633ff30ab25edcebe0ddf8c8077；回退此修正可使用 0.14.5-easter.0 ZIP，无需调整进度字段。T14-E 未提交，待用户验收，不进行 T15-A。

0.14.5-easter.1 已更新 C:\Softwares\NotebookAid-win32-x64，部署 verified=true、bridgeManifestsRestored=2、backupCreated=false，ZIP 哈希一致。等待用户验收，不提交，不开始 T15-A。

2026-10-14 用户在图标预览后明确保留初见原书本、采用开源之心爱心。本次 0.14.5-easter.2 统一收集卡片、发现窗口、静态庆祝和许可证入口的爱心，同步八语言线索，保留原收集 ID 和进度；仍待整体彩蛋验收，不提交，不开始 T15-A。

0.14.5-easter.2 构建和最终便携三进程彩蛋专项 output/easter-packaged/1791976089970 通过，追加确认首枚书本／末枚爱心不同。截图已检查，包内 Runtime／Renderer 140 个文件同生产输出一致；已通过 Prepare-TestPortable.ps1 更新测试目录，verified=true、bridgeManifestsRestored=2、backupCreated=false。保留 ZIP SHA256 8b870b3cac5162c2123c7804fcc1a95bceaaae8b390f6dadb360b6ab302663f6。仅图标和线索小修正，未重复无关核心测试；实体操作及屏幕阅读器待用户验收。T14-E 未提交，不开始 T15-A。

2026-10-14 用户进一步要求初见、智能回响、探索者与原彩蛋交互预览一致。已核对预览定义（first=sparkles、echo=radio、explorer=compass），0.14.5-easter.3 统一发现、收集、静态庆祝的对应图标；开源之心保持用户批准的 Heart，其他入口与进度不变。此决定覆盖此前初见书本的选择；T14-E 仍待验收，不提交，不进行 T15-A。

0.14.5-easter.3 构建与最终便携三进程专项 output/easter-packaged/1791976311726 通过；新增图标结构检查确认 Sparkles／Radio／Compass／Heart，截图已人工检查。包内 Runtime／Renderer 140 个文件同生产输出一致；已部署测试目录，verified=true、bridgeManifestsRestored=2、backupCreated=false。保留 ZIP SHA256 43b99c988c808873ef0d8763bd0871c7bc913a53e7a950d2c0c8ce0f54dfd1d4。本次仅图标修正，不重复无关核心检查；实体操作及屏幕阅读器仍待用户验收，可完全退出后恢复 0.14.5-easter.2 ZIP 回退本次图标，进度无需更改。T14-E 未提交，不开始 T15-A。

2026-10-14 用户明确：“彩蛋收集功能验收通过，暂时不进行 T15-A。”据此 T14-E 及其入口／图标修正已获用户验收，版本 0.14.5-easter.3。按项目规则仅提交本任务源码、测试、文档及元数据到本地 main，排除生成包、依赖、测试输出和用户数据；不推送，不启动 T15-A。此前等待验收记录为交付时状态，保留实际自动检查范围及未测边界，不将用户验收描述为自动完成实体键盘或屏幕阅读器检查。

2026-10-14 用户授权 T15-A 先实机验证 Windows 11 现代菜单与 Windows 10 传统菜单，尚未授权完整应用入口。当前 CIM 只读确认 Microsoft Windows 11 Pro、10.0.26300；注册表 ProductName 仍写 Windows 10 Pro，不以该字段误认 Win10。用户确认没有 Win10 环境，要求先验证 Win11、提供 Win10 测试包。独立 ShellNew Command 原型使用当前用户专用 .notebookaid-shellprobe／NotebookAid.ShellProbe，命令只记录调用，不写笔记；路径含空格，使用拥有者标记和撤销脚本，不更改 .md／.txt 关联。已编译并注册，但资源管理器目标被用户操作／最小化，尚未完成菜单点击验证，未声称现代／传统菜单通过。随后用户要求菜单图标采用折角文件加主图标同风格金属 N，先预览；已撤销两个临时键并确认不存在，未实施应用业务集成或替换图标。待图标预览确认后继续菜单实机验证与 Win10 测试包。

用户确认最终图标预览（折角文件、N 上方两条粗白线、N 略向右移）后要求继续验证。已保存 assets/notebookaid-note.svg 和含九种尺寸的 ICO；只用于独立原型，未修改应用业务。Windows 11 文件夹背景的现代与传统 New 子菜单已实际打开：原长扩展名、根 ShellNew、补充官方文档的嵌套 ProgID/ShellNew，以及短扩展名 .naprobe 嵌套注册，均未在当前 Explorer 会话显示入口。HKCR 合并视图可读取注册内容，路径引用正确；ASSOCCHANGED 加 FLUSH 通知未使入口出现。当前菜单缓存未列出测试扩展名，缓存为待验证假设，不将此现象归因为已确定的 Windows 11 限制。未修改系统缓存或全局菜单模式，未重启或强制结束 Explorer，未测试实体桌面菜单和实际 ShellNew 点击调用。用户恢复了最小化的测试窗口后，短扩展名的现代、传统子菜单结果仍相同。

独立 Windows 10/11 原型包 release/NotebookAid-T15A-ShellNew-Probe.zip 已编译、逐文件 ZIP 哈希校验，附批准的图标、BSD-3-Clause 许可证、注册/撤销脚本和人工测试步骤。最终包 SHA256 B053054990CE2A00CB8E7722B1A0C0FF505404D7458A27386BEB701990AC831B。PowerShell 注册脚本语法检查和 git diff --check 已执行；独立程序的 Computer Use 启动审批超时，未作为 GUI 通过证据。当前测试仍待新 Explorer 会话复测及真实 Win10 测试；没有真实笔记操作，不打包或部署应用、不提交、不启动 T15-B。短扩展名测试注册暂保留以等待用户手动重启 Explorer 后复测，原长扩展名注册已撤销。

用户随后明确已重启 Explorer 并授权继续。新 Explorer 窗口（462948）中重新打开空测试目录的现代 New 和传统 New 子菜单，均仍未显示 NotebookAid 入口；未因重启即声称缓存原因已排除。真实桌面进程环境中 AssocQueryString 的 Command、Executable、FriendlyDocName 三项返回 S_OK，解析得到预期的带空格路径和 NotebookAid 笔记名称。继续在拥有者标记匹配的 .naprobe 下补充根 ShellNew Command；原型注册仍保持可撤销。真实 HKCU ShellNew Classes 缓存含 13 个既有条目、不含 .naprobe，已只读保存 Classes 的值和类型到 output/t15a-shell-probe/shellnew-classes-before.clixml。拟备份后移除可重建的 Classes 值，但自动审批认为共享缓存修改超出专用测试键授权而拒绝，删除未执行；已明确向用户解释并请求授权。当前尚无菜单调用、图标实际展示和无残留验证，不开始完整集成，Win10 仍待实机测试。

2026-10-14 用户明确选择：不修改共享缓存，先保留目前验证结果。据此停止本轮缓存排查，不删除或恢复共享缓存。已通过拥有者检查撤销 .naprobe 与 NotebookAid.ShellProbe 两项专用临时注册，并验证两项键不存在；原型 ZIP、批准的图标及验证记录保留。T15-A 仍尚未验证通过，Windows 11 文件夹背景现代/传统菜单均未显示入口，实体桌面、菜单点击调用和真实 Win10 未验证；不将本轮结束视为用户验收或完整实现授权，不提交、不部署应用、不开始下一任务。


2026-10-14 T15 补充要求：全局设置区域按新手引导、基础设置、界面缩放、自动保存、AI 设置、安全设置（应用锁与主密码）、消息中心、彩蛋收集排列；应用更新置于末尾。笔记本设置按名称／路径／架构信息、外观设置（颜色与封面）、主密码、自动保存、备份与存储、笔记本维护排列。仅调整布局和八语言标题，保留设置存储及安全权限边界。


T15 implementation record (2026-10-14): 用户授权搁置 T15-A、开始 T15，并要求当前用户／本机所有用户安装、自动更新机制；发布地址稍后配置。交付版本 0.15.0-t15.0。NSIS 安装器提供两种范围及八语言；所有用户安装限制 Program Files，保留受保护的回滚副本，注册归属明确的 Native Messaging，拒绝运行进程和未知用户文件，不强制结束进程、不清除用户数据。自动更新仅在安装版具备 HTTPS 发布源和签名发布者时加载；当前未配置源、不联网更新。当前测试安装器未签名，正式更新发布必须补齐代码签名。T15-A 仍搁置，原型资源不随应用交付。

验证记录：安装／更新专项 5/5 通过；设置／应用数据专项 12/12 通过。全套首次 252/256，旧插件版本断言已修正，失败四组串行重跑 27/27；未将全套并发运行描述为全通过。Windows 11 当前用户实际安装、同版本重装、卸载通过（output/installer-live/660b0b8ad45348c88809efc95b09b1ce），原桥接注册恢复；非跨版本升级验证。所有用户管理员安装、不同账户、Windows 10、真实 Thunderbird GUI、在线更新／签名服务仍需人工验证。最终设置界面重排待打包专项验证及测试目录部署；T15 待用户验收，不提交、不开始下一任务。

最终设置专项 output/ui-packaged/1791990802747 两进程通过：八语言基础／安全／外观标题、全局与笔记本区域 DOM 顺序（含彩蛋延迟区域）、更新设置关闭重启保持、已有笔记正文不变；首次错误码 INVALID_INPUT 为缩放输入负例。所有新标题24项和更新文案104项非空检查通过。

最终交付校验：包内 Runtime／Renderer 145 个文件与生产构建一致。最终安装实测再次被进程保护停止，未强制结束应用；当前用户安装证据仍采用此前成功夹具，最新设置重排由最终便携界面专项验证。测试目录部署等待应用完全退出。

2026-10-14 T15 补充：用户已完全退出并授权继续更新测试目录，要求应用菜单加入带图标文字的“检查更新”。复用八语言更新文案及同一核心检查入口；点击进入全局设置的应用更新区域，显示状态／下载进度。无配置与便携版仅显示说明，不访问网络；重复点击由现有检查并发保护处理。仍待用户验收，不提交、不进入下一任务。

最终菜单检查更新验证 output/ui-packaged/1791991912943 两进程通过：从笔记本设置触发应用菜单检查更新，切换全局设置、定位和聚焦更新区域，八语言菜单文字及图标正确；两页设置顺序、正文不变和重启设置保持通过。测试初次失败来自选择器字符串缺失引号，已修正；打包／测试采用串行，避免 Chrome 资源文件占用。没有真实更新发布源，未将界面检查等同于在线下载／签名验证通过。

0.15.0-t15.0 最终交付：已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64，verified=true、backupCreated=false、bridgeManifestsRestored=2。保留便携 ZIP SHA256 3452c4212e1a822cbd83bc13a585743ec365e7ee0ff7464debe133d206299d9a，安装器 SHA256 a7ceb497f0685a04886409be2dcc456c4476550004da7b22aa99e66a7585d3b9。包内125项安装清单与145项界面／运行输出校验通过。安装器当前 NotSigned，发布地址未配置；所有用户安装／真实在线更新仍待人工验收。T15 等待用户验收，不提交，不恢复 T15-A、不开始下一任务。

2026-10-14 T15 验收修正：用户报告安装字体模糊并授权修改，随后明确简体中文使用微软雅黑。0.15.1-t15.1 在共同 customHeader 设置 ManifestDPIAware true，覆盖安装器和卸载器；简体中文 SetFont Microsoft YaHei 9，繁体中文 Microsoft JhengHei 9；其余语言沿用现有字体。不改变安装范围、注册、回滚或用户数据逻辑。仍待用户验收，不提交、不进行下一任务。

0.15.1-t15.1 验证：构建及 NSIS 编译通过；已读取最终安装器与包内嵌入的卸载器 PE 清单，两者 dpiAware=true；微软雅黑字体在本机已安装。最终125项安装文件清单哈希通过。没有修改系统 DPI 设置、没有在用户已有安装上运行静默安装测试；125%／150%／200% 界面裁切与字体效果仍待人工验收。

0.15.1-t15.1 已通过 Prepare-TestPortable.ps1 更新测试目录，verified=true、backupCreated=false、bridgeManifestsRestored=2；便携 ZIP SHA256 2e90f39ab3b7ec2a895f1ff370d45ca0e68ca0a0a08c7e12feb5e9733a84eabd，安装器 SHA256 8ed934233ef00589e72491884e05c54e9302e5d053225b9626d66311eba43e94。0.15.0-t15.0 安装器／ZIP 保留供程序回退；设置及数据架构不变。T15 仍等待用户复测验收，未提交、不启动下一任务。

2026-10-14 T15 补充：用户优先要求后台备份和前台进度，替换 NSIS 默认完成页图片，并提供桌面／Windows 开始菜单快捷方式选项。0.15.2-t15.2 将手动和定期备份改为分阶段异步文件 I/O、流式校验及可让出事件循环的完整性检查；只读查询与界面绘制继续响应，备份期间核心写入被保护，成功验证后才发布 backup.json 并记录完成。进度显示当前阶段真实比例，无总耗时估算。新图片使用项目自有标志和程序绘图，无新增素材许可依赖、不加入应用资源包。快捷方式默认桌面关闭、开始菜单开启，用户可分别选择，静默更新保存既有选择；仅删除或替换指向本安装的快捷方式，保留其他程序的同名链接。T15 仍待用户验收，不提交、不开始下一任务。

0.15.2-t15.2 验证：14项备份／安装核心检查通过，追加5项异步加密恢复、链接路径与快捷方式保护检查通过；最终便携备份两进程 output/backup-packaged/1791997269904 通过，后台证据7次进度、7次查询响应、19帧绘制、写入拒绝、进度可见。最终便携界面两进程 output/ui-packaged/1791997282525 通过八语言、设置顺序、菜单更新入口及重启保持。最终 NSIS 编译通过，安装器及内嵌卸载器 DPI 清单、内嵌图片与源 BMP 已核对；没有在用户既有安装上进行静默安装覆盖，真实安装页面／多用户／高 DPI 布局仍待人工验收。

0.15.2-t15.2 已通过 Prepare-TestPortable.ps1 更新 C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2。保留 ZIP SHA256 27ed37111a3965edef3c3a896c6a20440b1913afec2d18f3410096470ed79082，安装器 SHA256 8c22470ef7d9159c60c0523007aa8b0ee7742024d3207a8a424dbdaab612962c；125项安装文件及146项界面／运行输出一致。安装器初次编译发现西班牙语 ID 不匹配，已改为实际使用的3082并重新编译；最终清单只包含成品，不包括中间卸载器／压缩文件。旧0.15.1-t15.1安装器和ZIP保留供程序回退，数据架构不变。安装页面和多用户实际效果待用户验收，T15未提交，不开始下一任务。


2026-10-14 用户验收记录：用户明确“后台备份和安装向导修改验收通过，暂时不进行下个任务。”验收版本为0.15.2-t15.2，确认本轮后台备份、进度显示和安装向导修正通过；记录并提交本轮T15开发交付及其配套安装／更新机制、设置布局、测试、资源和文档。不将此验收扩展为真实Windows10、所有用户管理员安装或签名在线更新已实测，不作正式发布声明；T15-A继续搁置，不启动下一任务。

2026-10-14 T15 补充界面修正：用户要求隐藏侧边栏技术验证入口，并将基础设置的每页笔记数量移到主题设置之后。0.15.3-t15.3 仅隐藏入口、调整顺序及递增交付版本，保留既有设置值与内部验证逻辑。此次小修正仍待用户验收，不提交、不开始下一任务。此前0.15.2-t15.2已验收并提交fe891b8。

0.15.3-t15.3 最终便携界面两进程 output/ui-packaged/1792000578044 通过：技术验证按钮无可见矩形，分页设置紧接主题行，既有八语言／菜单／缩放及重启设置保存、正文保持通过；146项界面及运行输出与包内ASAR一致。仅布局小修，未重复无关核心测试。仍待此小修用户验收，未提交。

0.15.3-t15.3 已更新便携测试目录，verified=true、backupCreated=false、bridgeManifestsRestored=2；保留ZIP SHA256 6702e917fd2a0c8c8686d37e0e80e547f72c71e843e8b0d88bd43dec7604f09d，安装器 SHA256 232e5896780469dbea2d72c9729c3410602e423bfce375dc735ba67750dcbf13。旧0.15.2-t15.2包保留可回退，设置与数据架构不变；本次小修待用户验收，不提交，不开始下一任务。


2026-10-14 用户验收记录：用户明确“侧边栏技术验证入口隐藏和基础设置顺序调整验收通过，暂时不进行下个任务。”0.15.3-t15.3 的侧边栏技术验证入口隐藏和基础设置顺序调整已获验收，提交本次小修源码、界面验证及配套版本／文档更新。此前打包界面两进程及文件校验已通过，本次仅补充验收文档，不重复无关测试。T15-A继续搁置，不开始下一个任务；尚未实测的正式发布项目保持原记录。

2026-10-14 公开源码隐私检查与邮箱清理验收：用户明确“邮箱历史清理验收通过”。此前按用户授权先备份完整 Git 元数据、提交历史和383个工作文件，隔离验证后将21个现有提交的作者／提交者邮箱、历史文件和3个 Codex 源码快照中的旧联系邮箱统一为 it@live.cn，保留插件 ID。重新扫描全部1221个主仓库 Git 对象，旧邮箱匹配0次，逐提交对象验证确认除邮箱替换及对应哈希变化外没有其他历史内容改动，Git完整性检查通过；工作文件与备份逐字节验证通过。旧 reflog 历史仅留于被忽略的本地备份中，备份不发布。此前文档中的历史保留策略已被本次授权覆盖；历史改写后的 main HEAD 为184e9cb，既有旧提交哈希不可再作为当前历史的引用。提交已验收的私人数据／凭据／签名材料忽略规则及此验收记录，保持 T15-A 原型未提交；未配置远程或推送，macOS适配与正式发布尚未执行。本次未修改运行逻辑，不重新打包或部署测试目录。

2026-10-14 T15 macOS 测试构建追加授权：用户明确要求完成 macOS 适配和 GitHub Actions 配置，保留 Windows 功能，生成 arm64／x64 DMG和ZIP测试包，上传 lvbeck/NotebookAid，暂不正式发布。版本0.15.4-mac.0；按平台选择构建、桥接和更新器，macOS使用当前用户私有Unix socket和独立启动桥接，Passkey暂不支持且保持已有门禁失败关闭，八语言不支持提示同步。沿用锁文件已有的BSD-2-Clause构建工具@electron/osx-sign 2.7.1，显式声明开发依赖，没有升级依赖；测试包使用ad-hoc签名，没有Developer ID公证。工作流双架构，SHA固定官方Actions，只读源码权限，不创建Release。用户明确授权本轮源码提交和上传以执行云端构建；这不代表macOS功能已验收，完成后仍等待实机验收，T15-A继续搁置。

2026-10-14 T15 macOS 测试交付结果：源码26d39f8的GitHub Actions运行38622102289成功，arm64和x64均通过255项跨平台核心检查、签名结构／架构、八语言界面、编辑及重启检查。四个0.15.4-mac.0 DMG／ZIP上传至该运行的Artifacts，保留30天；已下载最终产物并逐项核对SHA256，ZIP内应用、桥接和许可证资源齐全。实际结果、首次锁文件／测试断言修正及Windows验证边界详见macos-testing.md。用户明确授权上传源码用于测试，提交并推送本轮代码及结果文档；不是功能验收或正式发布，仓库Release数量0。当前等待macOS实机验收，T15-A仍搁置，不开始下一任务。

2026-10-14 T15 Windows CI 追加授权：用户要求 Windows 安装包和便携 ZIP 加入 GitHub Actions，并上传测试产物，不正式发布。增加独立 windows-2022 x64 工作流，沿用现有构建／安装／便携脚本，检查核心测试、成品哈希与 ZIP 资源、打包界面和编辑器、当前用户安装重装卸载。仅上传成品及合成测试报告，源码权限只读，测试包30天、报告14天；更新源暂未配置，GitHub Releases 地址与签名要求仅记录说明。本轮源码提交和上传用于执行用户授权的云端测试，不代表用户功能验收；T15-A仍搁置。

2026-10-14 T15 Windows CI 交付：源码7015309的运行38626804424成功，264项核心测试中263通过、0失败、1项macOS专用检查跳过；安装器／ZIP及校验、打包界面八语言与重启、编辑器、当前用户安装重装卸载均通过。最终Artifacts已下载并逐项核对SHA256，Prepare-TestPortable.ps1更新测试目录verified=true、backupCreated=false、bridgeManifestsRestored=2。按用户授权保存GitHub Releases更新目录为仓库变量NOTEBOOKAID_UPDATE_URL；用户提出免费GitHub签名，经官方说明核对，GitHub产物证明不能替代Windows Authenticode签名，SignPath Foundation尚需申请审核，未声称签名或自动更新已启用。安装器未签名、Release数量0；详情见windows-ci-testing.md，当前仍等待用户验收，T15-A继续搁置。

2026-10-14 SignPath申请准备补充授权：用户要求补齐三个原生辅助EXE产品名与版本，并将审核后的签名政策和隐私声明上传GitHub，不正式发布。新增构建期统一AssemblyInfo，Bridge／Passkey／SetupSupport全部生产编译路径使用package.json版本；产品名NotebookAid，产品版本保留完整语义版本，程序集／文件版本使用主次补丁加0的四段数字；实际编译三个EXE并读取版本资源通过。发布code-signing-policy.md和privacy.md，首页链接注明未提交／未获批／未签名，申请文本同步已解决项。不接入签名、不创建Release、不修改业务逻辑，源码上传用于用户授权的申请与CI验证，不视为产品验收；T15-A继续搁置。

2026-10-14 SignPath准备验证结果：提交461468c已推送，公开签名政策和隐私声明路径由GitHub API确认存在。Windows运行38630850263成功：265通过、0失败、1跳过，最终三个原生EXE元数据及安装器／ZIP／界面／编辑器／安装重装卸载均通过；macOS运行38630850387双架构成功。最终Windows文件下载SHA256一致，旧CI版本产物保留可回退；签名申请文本更新到新构建证据。未提交申请、未签名、未启用更新、Release数量0，当前等待用户验收。
最终Prepare-TestPortable.ps1更新测试目录verified=true、backupCreated=false、bridgeManifestsRestored=2；已再次读取部署后三个EXE的版本资源，产品名NotebookAid、产品版本0.15.4-mac.0、文件版本0.15.4.0全部一致。

2026-10-15 双语README整理授权：用户明确要求保留README.zh-CN.md，提供英文README.md，两份顶部互链，同步过时信息和下载入口、整理历史记录，并上传GitHub，不正式发布。两版首页统一功能／平台／构建／许可／隐私和签名状态；使用当前成功Actions下载及工作流入口，标注登录、30天有效期和未签名／未公证限制。原中文内容在中文首页按当前状态整理，历史测试指南集中至testing-history.md并保留原文档，旧首页仍可从Git历史恢复。按用户已手动提交申请的事实更新签名政策、申请说明和支持文档，不声称获批。仅文档变更，不重打包、不更新便携程序、不启动下一任务。用户本轮明确授权文档提交上传；验收仍待用户检查。

2026-10-15 双语README用户验收记录：用户明确“双语 README 修改验收通过，暂时不进行下个任务，也不要正式发布。”确认提交27840e0所含英文默认README、简体中文README、双向语言链接、当前下载与签名／平台状态、历史指南索引及配套文档整理已获验收。仅补充本次验收记录，不扩大为其他功能验收；不启动下一任务、不正式发布、不重打包或部署。

2026-10-15 统一版本及macOS插件交付授权：用户要求Windows/macOS统一纯数字版本，当前改为0.15.5，同时更新插件和锁文件版本，构建时验证一致性；macOS每份Actions测试产物加入XPI及八语言安装、桥接、迁移位置和排障说明，校验清单覆盖新增文件。沿用锁定electron-builder的归档工具，无新增运行依赖。关于MSI，用户明确选择“需要原生 MSI，先给详细方案”，因此本轮仅作只读设计，不实施原生或包装MSI，不升级安装工具链。源码上传用于CI测试交付，尚非用户验收或正式发布；不开始下一任务。

0.15.5交付期间用户指出Windows应用列表名称仍包含版本。已核对NSIS默认uninstallDisplayName为productName加version，当前固定GUID不会仅因版本号产生新卸载键；改为NotebookAid并保留DisplayVersion。CI安装重装检查增加名称、版本和当前用户仅一条卸载记录断言，并模拟旧后缀显示名称后确认重装修正；不冒称真实旧安装器跨版本升级已实测，不修改用户机器既有安装记录。MSI仍仅方案，不实现。

2026-10-15 0.15.5最终测试交付：源码7b36773的Windows运行38678321343和macOS运行38678321224全部成功；Windows核心266通过／0失败／1跳过，Mac每架构257通过／0失败／1跳过，打包界面及相应安装／签名结构检查通过。最终下载成品Windows5项、Mac每架构12项SHA256一致，XPI版本与八语言说明齐全。便携测试目录已按脚本更新，verified=true、backupCreated=false、bridgeManifestsRestored=2；旧版本ZIP保留。README双语下载入口同步最终运行，源码及结果文档按本轮明确上传授权提交推送，不代表用户验收。用户补充MSI产品名固定NotebookAid已登记，MSI仅提供方案、不实施。未签名／未公证限制保持，不创建Release，不开始下一任务；等待用户验收。

2026-10-15 T15原生MSI补充授权：用户明确同意实施原生MSI、支持当前用户和所有用户、软件名NotebookAid，并要求GitHub Actions测试产物及各语言README下载入口，随后指定新增德国德语README.de-DE.md。当前版本0.15.6；独立WiX工程和自有C++事务操作，仅由Windows Installer管理程序文件；不复用NSIS清理逻辑，不覆盖其他安装器／范围／桥接归属。MSI更新独立GitHub清单，校验长度、SHA256、签名发布者和产品身份，保存并确认后启动msiexec，未签名测试不配置更新源。已有本地构建和9项更新／平台检查通过；首次沙箱临时目录写入失败，正常权限下重跑通过；首次WiX ICE因沙箱无法访问Installer服务失败，正在正常权限与CI验证。新代码仅按用户明确上传授权提交用于CI，不视为功能验收；T15-A仍搁置，不发布Release，不启动下一任务。

0.15.6本地构建结果：应用与EXE打包成功，9项MSI／更新／平台测试通过。完整270项检查267通过、2失败、1跳过；两个失败为既有批量解密及最近列表持久化夹具，顺序单独重跑两个文件全通过，未修改核心存储。原生MSI构建通过ICE错误校验，先后修正目录操作时序、快捷方式范围和标准错误／占用／取消对话框，未关闭ICE检查；仍有4条ICE105静态警告，来自按ALLUSERS条件隔离的机器权限操作／HKLM项，需CI分别实装确认。首次CI上传a3ee475用于测试，后续修正另行提交；未获用户验收，不正式发布。

MSI更新实现进一步修正：本机默认PowerShell脚本策略阻止了脚本执行，最初退出码检查不能证明签名拒绝。已删除该脚本入口，将校验／安装工作交给现有SetupSupport原生EXE中的MsiUpdate.cs，不要求更改或绕过PowerShell策略；使用WinVerifyTrust验证信任链和发布者，再通过MSI只读API检查身份。分离辅助程序的同哈希副本在缓存运行，持有更新包只读锁直到msiexec结束，避免锁住安装目录内待升级的EXE。新增原生校验测试通过，实际生成的未签名MSI也被Authenticode校验拒绝，原9项渠道测试重跑通过。在线成功更新仍需未来签名和发布源验收。

首次完整CI 38682313390的应用、核心、EXE与MSI构建检查成功，但原生MSI首个实装在系统版本检测处拒绝Windows Server2022，未进入文件写入事务。改为读取64位系统受保护注册信息，避免依赖宿主的版本API视图；保留Windows10最低版本限制。补充所有用户回滚和当前用户旧桥接遮蔽的实装测试，并隐藏MSI回滚数据属性，避免其出现在详细安装日志。macOS 38682313351双架构成功，arm64下载13项校验一致；最终Windows结果仍待重跑，不将构建通过视为安装验收。

2026-10-15 CI运行时警告修正：用户报告upload-artifact旧版声明Node20而被runner强制以Node24运行。Windows和macOS工作流统一固定至官方v7.0.2提交cf430e030ddbb5b0abf93d22962f4752f3646cd9，已通过GitHub API核对action.yml声明node24，archive默认true，因此保留现有ZIP归档／多文件产物格式、名称和保留期；应用构建Node24.21.0及项目依赖不变。新工作流实际执行结果另行登记，不通过旧运行证明警告已消失。

MSI一致性补充：沿用已验收安装默认值，桌面快捷方式默认关闭、开始菜单开启；原生更新工作进程读取本安装范围的MSI快捷方式组件标记并显式传给msiexec，保留既有选择。原生校验夹具重新编译并通过；实装脚本追加开始菜单目标／用户范围和桌面关闭检查。57e481e之前的38683396076因WiX不允许直接声明MsiHiddenProperties而构建失败，已修正为Property Hidden属性，本地MSI编译链接与只读身份／隐藏属性检查通过，仍有此前记录的4条ICE105静态警告。后续CI检查不等于用户验收。

38684466369首次MSI安装事务返回0，日志产品名NotebookAid、版本0.15.5；原测试依赖Uninstall注册分支而未通过，不把此断言当作已证实的产品命名缺陷。改用Windows Installer官方RelatedProducts／ProductInfo只读接口检查同UpgradeCode仅一项和已注册名称／版本，本地空产品集枚举已验证。CI日志同时证实Windows PowerShell5.1将脚本中文字读成乱码，测试路径改为显式Unicode字符，JSON读取指定UTF8。将MSI验证前移至EXE／界面检查之前以加快失败反馈，其余检查保留。macOS38684466407双架构成功，arm64产物13项哈希一致，检查注释已无Node20警告；尚不视为MSI或实机验收。

38685441584已通过原生MSI产品族唯一性、注册名／版本检查，停在WScript.Shell快捷方式路径比对。MSI日志的ShortcutCreate指向正确中文目录；在仅限output的独立原生夹具中，用IShellLinkW创建中文目标快捷方式后，原生读取／长路径标准化比对通过，而WScript读取比对为false，确认旧测试读取方式不可靠。测试改用IShellLinkW.GetPath和GetLongPathName，不更改安装器快捷方式功能，也不放宽到仅比对文件哈希。完整双范围实装继续等待CI，不宣称此时已通过。

38686242747已通过当前用户安装、合成升级、重装及Unicode快捷方式验证，随后发现独立MSI构建缺少SetupSupport辅助EXE：原先由后续NSIS构建准备。MSI构建现自行编译该辅助程序并核对必要载荷，不依赖EXE安装器构建顺序；本地编译后已读取NotebookAid／0.15.6／0.15.6.0元数据。实装断言扩展到三个原生EXE。回滚夹具原Type19即时错误只能覆盖部分升级回退时序，改为仅测试MSI内的独立延迟失败DLL，确保在新元数据写入后失败；生产包不嵌入故障接口。追加两范围首次安装失败回滚，并断言日志确实到达故障动作，避免把前置拒绝误当回滚成功。脚本语法已通过，实际新夹具结果仍待CI。

38687262346已实际通过当前用户首次延迟故障回滚、安装、合成升级、重装、未签名MSI拒绝、文件修复、升级延迟故障回滚和降级拒绝。第8步跨范围同版本请求被Windows Installer自动按原用户范围处理并返回0，测试因此失败，未发生所有用户迁移。增加目录请求快照，在恢复原目录后明确拒绝不一致的目录／范围请求；UI默认范围也按已安装或命令行指定的所有用户范围选中。C++编译通过，最终所有用户及完整CI仍待重跑，不视为功能验收。

38688318167原生MSI全部16项报告字段（除版本外15项布尔验证）为true：两范围安装、修复、首次安装／升级延迟故障回滚、范围及降级保护、外部状态保留和未签名更新拒绝。后续打包界面／编辑检查也通过，但EXE实装超时：MSI移除默认值后留下空桥接键，NSIS助手将其视为冲突，静默错误框等待确认。现MSI用SHDeleteEmptyKey仅清理无值且无子键的空键，保留外部数据；NSIS允许确实无数据的空键，仍拒绝含外部值／子键的键。隔离注册夹具首次错误创建了空字符串默认值，改为真实无默认值后两项安装器测试通过，原生MSI签名拒绝测试也通过。所有NSIS错误框增加/SD IDOK，静默失败返回非零、不再等待交互；普通界面提示不变。最终完整CI仍需重跑，不将上次整体标为成功。

2026-10-15 0.15.6最终交付：[Windows运行38690187888](https://github.com/lvbeck/NotebookAid/actions/runs/38690187888)及[macOS运行38690187771](https://github.com/lvbeck/NotebookAid/actions/runs/38690187771)均成功，构建源码1e41f74。Windows核心271项中270通过／0失败／1跳过；Mac每架构262项中260通过／0失败／2跳过。Windows打包后八语言界面、编辑、重启、NSIS当前用户安装重装卸载、原生MSI两范围实装及15项报告标志全通过；包含真正的中文安装目录、首装与升级延迟故障回滚、修复、范围与降级拒绝、桥接遮蔽保护、外部文件／注册保留、空键清理和实际未签名MSI拒绝。两范围在Windows Server2022管理员CI环境验证，不代替真实Windows10/11向导、标准用户/UAC、真实Thunderbird及签名在线更新验收。MSI向导当前英文，应用八语言保留，仍有已记录的4条双范围ICE105静态警告。
最终下载Windows5项、MSI1项、Mac每架构13项SHA256一致；四份XPI版本0.15.6和LICENSE、八语言指南齐全。只读MSI产品名NotebookAid、版本0.15.6、UpgradeCode稳定，Binary表只有MsiActions和Sidebar，无故障DLL；EXE/MSI均NotSigned，Mac仍ad-hoc／未公证。Windows测试Artifacts分别为NotebookAid-windows-x64-test和NotebookAid-windows-x64-msi-test，三语言首页提供独立地址。两个工作流上传Action均固定为Node24版v7.0.2，原Node20弃用问题修复，不改变项目构建Node24.21.0。
Prepare-TestPortable.ps1已更新C:\Softwares\NotebookAid-win32-x64：verified=true、backupCreated=false、bridgeManifestsRestored=2，保留0.15.5等旧版ZIP回退。未配置未签名MSI在线更新，GitHub Release数量0；本轮源码和结果文档提交上传用于用户授权的测试交付，不代表用户验收。当前等待用户验收，不开始下一任务，T15-A继续搁置。

### T15 ten-language installer follow-up (2026-10-15; awaiting acceptance)

- Direct user authorization: add Japanese and Korean to the app, support ten languages in all installers, use Microsoft YaHei for Simplified Chinese MSI, complete ten regional README versions (Traditional Chinese zh-HK), rebuild/upload GitHub Actions test artifacts only. This is authorization to modify and upload, not acceptance or a formal release. T15-A remains shelved.
- Shared numeric version: 0.15.7. Existing settings locale IDs, product name, MSI UpgradeCode, addon identity and bridge migration IDs remain stable. No new runtime library or license dependency.
- Native MSI uses a property-only localization action and an initial language choice. Original license and low-level Windows Installer/custom-action diagnostics may remain English. Font and text verification does not establish actual wizard layout or UAC accessibility.
- Local initial platform test had an absent new guide and two file-operation failures, including EPERM. After adding guides, targeted retest: 58 passed / 0 failed. Localization guards: 3 passed. Built MSI native property-action check: ten locales × 37 texts plus normal/title font properties passed, no installation executed. First probe used an intentionally restricted engine and returned 1626; a normal session restricted to LocalizeUI succeeded.
- Language audit also found addon pt/pt-PT alias mismatch caused label initialization to throw; preserved the legacy pt alias and added the canonical pt-PT alias, Japanese and Korean tables, with initialization regression coverage.
- Final CI, package hashes, security scan and portable deployment results will be recorded after completion.

- Consolidated local platform run completed: 274 tests, 273 passed, 0 failed, 1 skipped. Later wording polish changes only Japanese/Korean master-password terms; CI rebuild will verify the final source. The local Windows Defender installation entry point returned 0x80508023; the current platform engine with canonical Windows paths successfully scanned the retained 0.15.6 EXE and MSI (both exit 0, no threats reported). This is not a Google Safe Browsing verdict. CI now scans each final EXE, MSI and portable ZIP without remediation, records hashes/logs, and blocks artifact upload on scan failure.

- First final-source macOS run 38701696326 succeeded for both architectures; arm64 downloaded with 15 verified checksums. Inspection found the active UI smoke loop already exercised all ten locales but two report counters still literally said 8. Corrected the active counters to derive the dictionary size and added Japanese/Korean captures there; the earlier separate i18n smoke helper is not the active UI entry point. A new final-source CI run is required for accurate retained reports. README German setup-guide link was also corrected after the regional guide rename (257 local README links checked).

- Windows run 38701696426 reached the actual deferred upgrade failure and restored the program, but failed the new installation-language check after rollback. The cached old MSI starts without the original command-line language. Added a strictly owned metadata lookup for that fallback and preserved an existing metadata locale during maintenance/upgrade; no registry layout or user preferences change. Current-user Chinese and all-user Japanese rollback checks remain required before delivery.

- Rollback compatibility: before returning to retained 0.15.6 program files, set both interface and default translation language to an original supported language, then exit; the old settings validator cannot read ja/ko IDs. Keep backups and retained ZIPs, never remove settings/data to bypass validation. Native cached-package fallback was also verified locally by directly invoking only InitializeLanguage on synthetic owned metadata for user/machine × en/zh-CN/ja/ko (8 checks), no installation sequence.

### T15 ten-language final delivery (2026-10-15; awaiting user acceptance)

- Source b7ae50d: Windows run 38703093807 and macOS run 38703093814 both succeeded. Windows: 274 tests / 273 passed / 0 failed / 1 skipped; each macOS architecture: 265 tests / 263 passed / 0 failed / 2 skipped. Packaged settings, information pages and UI reports explicitly confirm 10 locales, editor and two-process restart checks passed. Japanese/Korean macOS screenshots were visually inspected without missing glyphs.
- MSI: native property action verified 10 locales × 37 strings plus normal/title font selection; final read-only MSI TextStyle table confirms Microsoft YaHei (Simplified Chinese), Microsoft JhengHei (Traditional Chinese), Meiryo (Japanese) and Malgun Gothic (Korean), size 9. Production Binary table contains only MsiActions and Sidebar. Current-user Chinese and all-user Japanese install, synthetic upgrade, reinstall, repair, first-install and upgrade-failure rollback, downgrade/scope rejection and ownership checks passed (all 15 MSI report flags true). NSIS current-user install/reinstall/uninstall passed; NSIS all-user UAC and real ten-language wizard layouts remain manual checks.
- Defender platform 4.18.26090.9-0 scanned final 0.15.7 EXE, MSI and portable ZIP with exit 0/no threats reported, no remediation or security-setting changes. Hashes were verified against downloaded artifacts. Windows EXE/MSI are still NotSigned. The exact Chrome Safe Browsing verdict is not established, and no promise is made that the new download will avoid a warning. macOS remains ad-hoc signed, without Developer ID or notarization.
- Downloads: EXE/ZIP artifact 11957258886, MSI 11957099080; macOS arm64 11957950172 and x64 11957103190. Each Mac artifact has 15 checked SHA256 entries, ten regional guides and NotebookAid.xpi. Root README links were updated across all ten languages; 257 repository-relative links checked.
- Portable deployment completed with scripts/Prepare-TestPortable.ps1: C:\Softwares\NotebookAid-win32-x64 now 0.15.7, ZIP SHA256 400c84ed5f42c415d2896daae3788ba62ae05ef16e4e49a94d8c92355ad947d1, verified=true, no folder backup, two bridge manifests restored. Retained 0.15.6 ZIP remains for rollback after resetting new language preferences as documented.
- No formal GitHub Release (API count 0), tags or active unsigned update feed created. T15-A remains shelved; this follow-up awaits user acceptance. Standard-user UAC, actual Windows 10, high-DPI/native wizard visual/accessibility matrices, real Mac/Thunderbird/AI accounts and signed online MSI updates are not established by these automated checks.

### T15 installer addon payload correction (2026-10-15; awaiting user acceptance)

- Direct user authorization: fix packaging order so Windows EXE/MSI and macOS DMG/ZIP contain the Thunderbird XPI; add checks and rebuild/upload GitHub Actions test artifacts only. No formal release; T15-A remains shelved.
- Confirmed defect: the 0.15.7 Windows MSI File table has no XPI. Windows installers ran before Build-TestBundle generated addons; macOS only supplied an external XPI. Earlier claims of an embedded MSI plugin were incorrect.
- Shared numeric version 0.15.8. Generate both current and compatibility XPI files in the application packaging step, before installer construction and macOS signing. Validate root manifest identity/version, project license and byte identity against the standalone plugins. Build-TestBundle no longer regenerates plugins after installer creation.
- Windows plugins install beside NotebookAid.exe; macOS plugins reside in NotebookAid.app/Contents/Resources. Disposable CI install tests verify EXE/MSI installed plugin hashes, including both MSI scopes. DMG read-only mount and ZIP extraction checks verify both plugins and bundle signatures before artifact upload. Missing, modified and wrong-version plugin regression checks added.
- Local addon tests: 2 passed / 0 failed. Initial invocation stalled using the default external tool cache and was interrupted; retry using the workspace tool cache passed. Full CI and packaged delivery validation remain pending.
- Keep retained 0.15.7 ZIPs for rollback; no user data or live bridge registry is changed by this fix.
- Additional user direction: move Japanese and Korean to the end of the shared application language list, preserving all other language order. Applies to the header, settings and translation selectors using this list. Rebuild final 0.15.8 test artifacts after this adjustment.

### T15 addon packaging final delivery (2026-10-15; awaiting user acceptance)

- Final build source 03fca84: Windows run 38710651223 and macOS run 38710651247 succeeded. Earlier Windows run 38709473748 was superseded/cancelled when the user requested the language-order adjustment; earlier macOS success is not the final delivery.
- Windows: 275 tests / 274 passed / 0 failed / 1 skipped. Each macOS architecture: 266 tests / 264 passed / 0 failed / 2 skipped. Shared language order verified as en, de, fr, it, es, pt-PT, zh-CN, zh-TW, ja, ko. Packaged UI and restart/editor checks passed.
- MSI current-user and all-user installation, synthetic upgrades, repair and rollback passed; all 16 Boolean report checks are true, including addonsVerified. NSIS current-user install/reinstall/uninstall passed with addonsVerified=true; its all-user GUI mode remains unverified. Both XPI hashes were checked against standalone files after installation. The downloaded MSI File table independently confirms both XPI entries.
- macOS arm64 and x64: both DMG mounts and ZIP extractions contained both plugins with hashes matching their standalone files; codesign verification passed for the actual archived app bundles. Signing remains ad-hoc, without Developer ID/notarization. Real Mac/Thunderbird user-profile integration remains a user acceptance check.
- Local limited-environment full suite: 275 tests / 244 passed / 30 failed / 1 skipped, including credential writes, settings writes and directory-link operations. No claim of a clean local full-suite run. A local build first failed with EPERM; elevated workspace build and four targeted addon/localization tests passed. Final CI suites passed as above.
- Downloaded package checksums verified: Windows artifact 5 entries, MSI 1 entry, each Mac architecture 16 entries. Defender returned exit 0 for final Windows EXE/MSI/portable ZIP, without remediation; Windows installers remain unsigned and this does not establish Chrome Safe Browsing's verdict.
- Final downloads: EXE/ZIP artifact 11961101984, MSI 11961047158 (Windows run 38710651223); macOS arm64 11960471347 and x64 11961176069 (run 38710651247). Updated all ten README download links; 257 relative links checked.
- Portable deployment via Prepare-TestPortable.ps1 completed: C:\Softwares\NotebookAid-win32-x64 is 0.15.8, ZIP SHA256 cbf864b7657b5781a5c6c7df91523eb5ca4e321bedf6113b906910ff64da6618, verified=true, no folder backup, two bridge manifests retained. No live bridge registry change was made by this fix. Retained 0.15.7 ZIP remains available for program rollback; notebook data rollback is separate.
- User acceptance: install one Windows package type and confirm NotebookAid.xpi beside NotebookAid.exe; on macOS use Show Package Contents and confirm Contents/Resources/NotebookAid.xpi. Install the current addon in Thunderbird and reconnect; confirm Japanese/Korean are last in header/settings/translation lists. No formal Release, tags, signing policy or update activation changes; T15-A remains shelved.

### T15 addon packaging acceptance and new-notebook schema correction (2026-10-15)

- Actual user acceptance: "XPI 打包修复和语言列表顺序调整验收通过。" Accepted build source 03fca84 and delivery documentation 535b5a5 were already committed/uploaded under explicit test-build authorization.
- New authorized fix: freshly created default library and explicitly created notebooks must start at latestNotebookSchemaVersion (currently 10). Existing notebooks retain their schema and manual upgrade/backup workflow. No migration or mutation of live notebook data is authorized or performed.
- Root cause: NoteLibrary wrote schema 1 for explicit create mode as well as legacy bootstrap fixtures. Creation now uses the shared latest schema constant only for explicit create mode; existing/legacy loading behavior is preserved. Old-schema upgrade tests now explicitly seed old notebooks rather than relying on a new notebook starting old.
- Validation and delivery pending; T15-A remains shelved. This correction awaits separate user acceptance.

- Regression investigation: initial full suite had 276 tests / 273 passed / 2 failed / 1 skipped. Diagnostic rerun captured native renameSync EPERM moving a recovery stage into note revisions; a different history test then failed at the same operation, confirming an intermittent Windows rename failure rather than a deterministic new-schema assertion. The process holding the directory is not identified. A repeated close in test cleanup also masked an earlier failure with ERR_INVALID_STATE.
- Scoped correction: retry only Windows EPERM/EBUSY for authoritative atomic-file publication, revision staging and native import publication, with five bounded pauses totaling at most 250 ms before a final attempt. Normal renames do not wait; other errors are not retried. No destination deletion, copy/unlink fallback, permission changes or antivirus changes. Notebook close checks the SQLite writer's isOpen state so cleanup cannot mask an earlier exception.
- Added injected temporary-lock, persistent-lock, permanent-error and repeated-close tests. Targeted registry/schema/history/organization/rename run: 43 passed / 0 failed. Persistent lock verifies the previous head/body remain unchanged and the recovery journal survives reopen. Full regression, packaged GUI and local 0.15.9 delivery are pending.

- Full Windows regression after the rename/close fix: 280 tests / 279 passed / 0 failed / 1 platform skip. No diagnostic preload was used for this final suite.
- Packaged fresh-profile UI/restart check passed; its default library.json independently reports schemaVersion 10. An additional old-security UI probe found two outdated harness expectations after startup/locked-placeholder changes: it asserted before notebook initialization and expected the generic empty placeholder while locked. Only the smoke harness was updated to await initialization and assert the existing locked placeholder plus hidden editing controls. Production UI/IPC permissions were not relaxed.
- Development-runtime old-schema UI test then passed upgrade cancellation/confirmation, encryption and automatic locking, and a second process passed locked-on-restart/password-unlock. Final packages are being rebuilt to include the corrected harness; no additional business-code change followed the full regression run.

### T15 new-notebook schema and Windows rename delivery (2026-10-15; awaiting user acceptance)

- Local numeric version 0.15.9; no remote push, GitHub Actions run, Release or next-task work was performed for this correction. The accepted 0.15.8 GitHub test links remain unchanged. Current correction source remains uncommitted pending acceptance.
- Full final business-code regression: 280 tests / 279 passed / 0 failed / 1 skipped. Initial 276-test failures and diagnostic results are retained in output/latest-schema-tests.log and output/schema-regression-trace.log. The final suite output/latest-schema-tests-fixed.log ran without a diagnostic preload. Four new rename/close tests verify bounded temporary retries, durable single publication, persistent-lock preservation and non-retryable errors.
- Final packaged UI test output/ui-packaged/1792059541402 passed ten-language UI and restart checks. Fresh profile library/library.json was directly inspected and reports schemaVersion 10. Final packaged security test output/security-packaged/1792059560093 passed old-schema upgrade cancellation/confirmation, recovery preview/PDF, encryption, idle locking and password unlock after a separate-process restart. Physical Passkey, keyboard/screen-reader and recovery printing hardware were not tested; print callback is simulated.
- Runtime byte checks confirmed four final ASAR files match dist/runtime: core/library.js, core/library-import.js, core/file-rename.js and desktop/security-smoke.js. Both embedded XPI files match their standalone files, and the final MSI File table contains both XPI entries. MSI native localization verified 10 languages x 37 strings and Simplified Chinese Microsoft YaHei; this check does not execute an installation.
- Final Windows outputs: release/installer/NotebookAid-0.15.9-Setup-x64.exe (SHA256 aea8ffc07ce89caae5bd04efd367096f7e733ae49bb5c9470cb956105cd5e0eb), release/msi/NotebookAid-0.15.9-Setup-x64.msi (fcf6709c0c39f2cb41e32b42d13beaedb598d95e5e973ddfcac4294ede369b6b), release/NotebookAid-0.15.9-win-x64.zip (0f0a1e1c7dbe20b3d22ac979b838d68dbd5a0e74bc19da6ba610289e646f99a5). SHA256SUMS has 5 verified entries; SHA256-MSI has 1. Defender exit 0 for all three files with remediation disabled. Windows packages remain unsigned; no Chrome verdict is inferred.
- Prepare-TestPortable.ps1 successfully updated C:\Softwares\NotebookAid-win32-x64 to 0.15.9 from the verified retained ZIP: verified=true, backupCreated=false, bridgeManifestsRestored=2. No live bridge registry or notebook data migration was performed. Retained 0.15.8 portable ZIP supports program rollback through the same guarded deployment script after exiting the app; notebook data rollback is separate.
- User acceptance steps: create a new notebook in an empty folder and confirm latest schema with no upgrade prompt; verify a clean first-launch profile starts at latest schema; open a pre-existing old notebook and confirm the original explicit upgrade path remains available. Existing user library directories are not automatically migrated by this correction.
- Limitations: 0.15.9 EXE/MSI were built, scanned and statically checked but not installed over the user's real installation or tested with standard-user UAC; macOS was not rebuilt this round. Persistent Windows locks can still fail after bounded retry and retain the existing recovery/error behavior. No lock-holder attribution has been established. T15-A remains shelved.

### T15 new-notebook schema and Windows rename acceptance (2026-10-15; approved)

- Actual user acceptance: "新建笔记本架构和回归测试修复验收通过，暂时不进行下个任务。push到github仓库吧".
- Approved scope is the delivered local 0.15.9 schema initialization, bounded Windows rename retries, repeated-close handling, related regression/UI harness tests, numeric version manifests and documentation. User explicitly authorized committing and pushing this accepted correction to the existing GitHub repository.
- Preserve the recorded validation limits. Retain existing verified 0.15.8 README artifact links until newer CI artifacts are verified. Automatic workflow runs caused by the push are test builds, not a formal release. T15-A and all next-task work remain paused by user direction.
