# 数据格式草案

T05-A 实施：原生跨库导入将目标 `library.json.schemaVersion` 升为 3；来源保持不变。新核心可读 1／2／3，未导入的库仍保留现有版本。3 沿用正文／head／metadata 格式，只增加导入事务与收据约定，旧核心必须拒绝。`imports.json` 保存 source libraryId、source noteId、完整可达历史快照指纹及目标 noteId；不存正文。`import-transaction.json` 保存新增 ID、事务 ID 和将被替换文件的原内容；在发布新增笔记前持久化。每个新增笔记含 `import-owner` 标识，以限定回滚删除范围。中断恢复在目标写锁取得后、索引加载前执行。写前完整备份位于库外同级 `.import-backups` 目录；详情见 [T05-A 验收](t05a-testing.md)。

状态：T01 提案；字段与布局在 T03 前审阅，尚无数据库或格式实现。所有格式均包含版本号，禁止通过字段猜测格式版本。

T03 实施补充：已实现 schemaVersion/formatVersion=1 的 library.json、head.json、metadata.json、content.md、recovery 暂存／操作记录和 index/catalog.sqlite。`.writer.sqlite` 是进程持有的 SQLite 排他写入锁，不属于可删除索引。folders.json、tags.json、附件、安全记录等按后续任务实现，当前 metadata 预留默认空关联。以下未覆盖部分仍为设计约定。

## 权威数据与索引

建议以文件保存可恢复的笔记正文及元数据，SQLite 仅保存可重建的目录／搜索索引。未加密笔记保留各自主格式；加密笔记以密文容器保存。客户端不直接写文件。

建议笔记本布局（为设计示意，不代表已创建）：

```text
library/
  library.json
  folders.json
  tags.json
  notes/<note-id>/
    head.json
    revisions/<revision-id>/
      metadata.json
      content.md | content.html | content.txt
      attachments/
  security/
    keyring.json
  index/
    catalog.sqlite
  recovery/
```

加密笔记的修订内容替换为加密记录和加密附件，不能同时保留对应明文 `metadata.json`、正文或历史。备份默认选择库外目录，避免将备份递归备份。未引用修订、临时文件及事务恢复记录由核心处理，不能因看起来多余就直接清理。

首次建库生成随机 `libraryId`；笔记、文件夹、标签、附件使用稳定 ID。物理存储使用 ID，标题和目录重命名不改变身份。逻辑文件夹树与物理路径解耦，导出时可以还原目录结构。

## 主要记录

| 记录 | 关键字段与约束 |
|---|---|
| Library | `schemaVersion`, `libraryId`, `createdAt`, 安全元数据引用；不包含明文主密码或恢复密钥 |
| Folder | `id`, `parentId`, `name`, `sortOrder`；禁止循环；建议同层名称去空白后不允许大小写不敏感重名 |
| Note head | `id`, `revisionId`, `version`, `formatVersion`；作为当前提交的指针，安全状态按提交版本解析 |
| Note metadata | `title`, `folderId`, `primaryFormat`, `tagIds`, `pinned`, `visibleInThunderbird`, `createdAt`, `updatedAt`, `deletedAt` |
| Content | `primaryFormat` 为 `markdown`、`html` 或 `text`；正文 UTF-8；原文与编辑器状态转换独立处理 |
| Revision | 不可变 `revisionId`、递增 `version`、独立 `contentVersion`、父版本、内容摘要、附件清单；历史恢复生成新版本 |
| Summary | `text`, `sourceContentVersion`, `generatedAt`, `provider`, `model`；正文变化后可判断过期 |
| Attachment | `id`, `displayName`, `mediaType`, `size`, 完整性摘要、库内引用；加密笔记的名称及载荷均受保护 |
| Local tag | `id`, `name`, `color`；共享标签定义默认可见，加密笔记与标签的关联放在受保护元数据中 |
| Thunderbird tag mapping | `profileId`, `thunderbirdTagKey`, `localTagId`；按 profile 区分同名／同 key 标签 |
| Task origin | `importSourceId`, `uid`, 可选 `recurrenceId`、`sequence`、原始时间及来源摘要，用于去重和更新提示 |
| Recent entry | `noteId`, `lastOpenedAt`；返回 addon 时重新检查可见性；不存储标题副本 |

笔记允许同名，界面显示所属文件夹以区分；T05 用户确认同一父文件夹下名称唯一（去首尾空格、忽略大小写；实现补充 NFKC 归一化），不同层级允许同名。时间统一记录可比较的 UTC 时间，显示使用用户区域设置；ICS 同时保留日期-only、原时区和浮动时间语义，不能全部强制转换成 UTC 时间点。

`version` 随每次已提交变更递增，用于并发检查；`contentVersion` 只随正文改变递增，用于摘要和 AI 来源追踪。仅移动、置顶或修改标签不使摘要过期，保存摘要本身也不应立即使它过期。历史正文恢复建立新的内容版本，不回退计数。

## 保存与恢复

- 新修订先完整写入暂存区域，通过完整性检查后提交；只有当前版本指针更新完成才成为权威版本。
- 提交前验证 `expectedVersion` 和编辑会话，拒绝陈旧写入。
- SQLite 更新与文件提交不是同一事务。通过持久化恢复记录追踪中途失败，启动时恢复或重建索引。
- 禁止把损坏索引视为笔记丢失；重建必须使用权威文件、目录、标签及加密元数据。
- 内容损坏时保留原始文件并报告，不用空正文覆盖。
- 目录／标签和笔记的跨记录变更使用可恢复事务；批量删除、移动不得留下部分更新。

## 编辑锁

`libraryId + noteId` 对应核心管理的编辑会话。核心返回不可猜测的会话标识及代次标记，绑定可信客户端连接。会话未关闭时，即使自动保存成功，删除仍被拒绝。

断连、休眠和崩溃后的锁回收需结合会话、连接、心跳及代次判断，不能只凭时间到期就允许旧客户端继续保存。重获锁后必须重新读取版本。文件夹删除在核心一次检查所有后代笔记的占用情况。

## 加密设计方向

建议创建随机笔记本密钥，并分别通过主密码派生密钥和恢复密钥保护它。恢复路径解开同一个库密钥后重新设置密码保护，不通过“修改密码字段”绕过解密。具体是否进一步使用逐笔记密钥由 T08 设计确定。

- 密钥包装、内容加密和密码派生均使用成熟库，保存算法标识、参数和格式版本。
- 采用带完整性验证的加密；密文损坏、错误密码和不支持格式分别处理，不能覆盖原密文。
- 恢复密钥本地随机生成，仅交由用户单独保存；应用持久化包装后的密钥及验证所需元数据，不保存恢复密钥明文。
- 重设密码不会让已经复制走的旧密钥、旧密文备份失效；恢复密钥更换与撤销旧备份访问的边界需在 T08 说明。
- 加密状态转换需要覆盖当前正文、附件、历史、摘要和索引。转换中断时保留可恢复状态，不能提前显示“加密完成”。
- 旧明文备份和用户导出副本不会因转换而自动变成密文；提供清晰提示及由用户选择的处理，不承诺磁盘安全擦除。

## 备份与迁移

备份包含格式版本、笔记本 ID、目录和标签、笔记修订、附件、加密元数据及完整性清单；索引可以省略或恢复后重建。平台 AI 凭据和恢复密钥明文不包含在备份中。

备份获得一致性快照，完成校验后才标记成功。恢复先检查格式、路径和完整性，在新位置验证成功后切换，不能直接覆盖唯一可用笔记本。路径切换也采用复制／校验／切换流程，失败时保持原库可用；是否删除旧库由用户决定。

历史和备份保留数量在 T07／T09 确定。达到限制时必须执行已批准策略或提示用户，不能临时决定永久删除。

## T03-A 应用消息历史

应用配置目录新增独立 `notifications.sqlite`，user_version=1。notifications 表保存随机消息 ID、固定消息代码、操作、库 UUID、固定错误码、创建／更新时间、次数与已读状态；preferences 表保存四角位置。最多保留最近更新的 100 条，聚合更新也参与排序。正文与标题不进入数据库。每次新增／更新／删除在 SQLite 事务中完成，失败回滚；异常或未知 schema 保留原文件并报告不可用。该文件不是笔记索引，不参与笔记重建、不增加笔记修订。本版没有修改已有笔记数据格式，旧程序可忽略该新增文件。

成功消息新增或合并时写入 is_read=1，Info／警告／错误写入 0；旧版成功记录在读取时统一按已读返回，不修改旧记录或升级 schema。

## T03-B 本机库注册表

libraries.json（schemaVersion=1）保存 entries[{id,libraryId,name,path,lastOpenedAt}] 和 activeId；entry ID 与权威库 ID 分离，仅不可用旧路径导入允许 libraryId=null。规范化路径及已知库 ID 去重；配置损坏保留原件。旧 library-location.json 在导入前复制为 .t03b-backup，源文件保留；后续选择仅更新新表，不影响旧版本回退路径。配置以临时文件写入、fsync、原子替换发布。移除不删除库，重新定位核对原 ID 且不移动文件。上次库不可用时打开列表，无隐式回退。本版不改笔记文件格式、自动保存配置或主题／语言存储。

## T03-C 本机分层设置

settings.json（schemaVersion=1）保存 global(locale/theme/autosave) 与 libraries(entryId → {enabled,minutes})。未覆盖即继承全局；覆盖值绑定本机注册表条目，不随库复制，重新添加的新条目默认继承。配置以临时文件、fsync 和原子替换发布；旧 localStorage 三个已知键先保存到 settings-legacy.t03c-backup.json，原值保留。主题、语言、自动保存停止直接写 localStorage。通知位置继续由 notifications.sqlite 保存。损坏／未知版本保留原文件，读取失败时暂停定时自动保存但不禁用手动保存。笔记及库注册表格式不变。

## T04 三种主格式

`primaryFormat` 支持 markdown/html/text，对应不可变修订中的 content.md/content.html/content.txt。库、head 和 metadata 版本继续为 1；原有 Markdown 修订不改写。标题仍在 metadata.json，与正文分开保存。格式在创建时确定，save 保留既有格式；导出转换为独立文件，不改主格式。SQLite 索引仍仅为可重建摘要；列表返回 primaryFormat。

导入生成新笔记 ID，保留 UTF-8 正文（去除 BOM），限制 2 MiB，拒绝 NUL／无效编码。HTML 原文与安全展示分离：不把清洗后的预览写回受保护源码。HTML 导出附 UTF-8 BOM 编码标记，正文不加包装。导出只写新文件并 fsync，拒绝程序、配置与登记库目录（含父目录联接）的目标；已有目标不覆盖。正文编辑撤销栈只在内存中，最多 100 状态并按约 8 MiB 裁剪，不代替磁盘修订。

旧版只支持 Markdown，会报告新增 HTML/TXT 为不可读取。含新格式的库应继续用 T04；回退用升级前副本，保留新版库。详见 [T04 支持表与回退](t04-testing.md)。

## T05 实施数据补充

启用组织写操作后 library.json.schemaVersion=2；新核心同时读取 1/2，旧核心拒绝 2，避免旧保存逻辑重置 folderId/tagIds/pinned。首次升级保留 library-v1.json 清单，非完整回滚备份。head 和修订 schema 仍为 1，不批量重写正文。只有升级标记先成功，才能发布组织修改；中断最多留下已升级但无新增组织内容的库，新核心可继续操作。

目录和标签定义统一保存在 organization.json（schemaVersion=1，version，folders[{id,name,parentId}]，tags[{id,name,color}]）。使用一个原子发布文件，避免分文件树变更的部分提交；跨笔记批量变更本任务不实现。最多各 500 项，文件上限 128 KiB，文件夹深度 16，名称 80 字符。操作检查组织版本、ID、同名、父引用、循环、层级、颜色白名单。损坏文件拒绝加载并保留，不默认为空后覆盖。

folderId/tagIds/pinned 保存在各笔记修订元数据中；place 与正文 save 共用编辑令牌、乐观版本、操作去重及原子 head 发布。修改组织字段不增加 contentVersion。标签定义改名／改色只修改组织文件，关联仍按 ID 引用。逻辑目录移动不需要重写其后代笔记。

recent.json 为最多 100 条 noteId → UTC 时间，不进入笔记历史；打开时原子发布，重建不会清除。query 在核心执行，使用重建／提交时更新的内存正文投影，返回摘要及 total；对关键词、标签、目录后代及 pinned/recent 组合筛选，分页 limit 1–100。UI 每页 30，关键词匹配标题和正文源码，普通列表置顶优先、再按更新时间和 ID 排序。

Folder.order 为可选非负安全整数；缺省文件夹保留名称排序。保存排序写入全库文件夹 ID 排列对应的 order，层级关系不改变，展示时每个父级内部按 order、名称排序。导入校验此字段。


## T06 附件格式 4

附件载荷位于 `notes/<note-id>/attachments/<attachment-id>`，不按显示名称寻址。修订 metadata 可选 `attachments` 数组保存 `id/name/size/sha256/mediaType`；旧修订缺省为空，其他正文与 head 契约不变。文件先落盘，清单与修订一起原子发布；重命名创建元数据修订，历史名称与载荷保留。读取校验字节数和摘要；缺失附件不阻止正文读取。核心仅接受 1/2/3/4，旧客户端拒绝 4。跨库导入复制可达历史所有附件并验证摘要，ID 冲突的新笔记保持笔记内相对引用。

## T06-A native Delta

Notebook schema 5 opts into primaryFormat=delta. Revision content.nadelta stores a NotebookAidDelta version 1 full insert-only document. Existing metadata, revision hashes, sessions, operation replay, attachments and atomic head commits remain authoritative. No derived HTML is stored as a second authority. NotebookAidNative version 1 .nadelta exchange files contain title/document checksum and current attachment payloads; they are not full history backups.
Native exchange capacity uses the same 50 / 20 MiB / 200 MiB attachment limits as note storage. Container version 1 and notebook schema 5 remain unchanged. Export writes attachment records sequentially and escapes non-ASCII JSON characters, preserving decoded content and hashes. Import still parses the complete JSON container in the main process; it is not a streaming parser.

## T12 摘要架构 8

`library.json.schemaVersion=8` 增加可选修订元数据 `generatedSummary`，包含 `text/sourceContentVersion/sourceRevisionId/createdAt/provider/model`。正文、head 和修订哈希格式保持不变，摘要通过原有原子提交、操作去重与版本检查发布；只增加笔记 `version`，不增加正文 `contentVersion`。正文保存保留原摘要，来源正文版本不同即提示过期。历史恢复使用所选修订的摘要，历史列表不包含摘要文字。

首次保存摘要前使用现有架构升级流程，在库外创建完整 `.schema-backups` 副本。核心读取架构 1–8；旧程序拒绝 8，避免编辑时丢弃摘要。安全设置不将 8 降为 7。摘要随元数据加密、完整备份及原生跨库导入保留，不增加独立明文文件或磁盘摘要索引；单篇格式交换包仍不包含独立摘要。

写作请求与预览令牌仅在内存保存，绑定所属笔记本、会话所有者、会话令牌／generation、笔记版本及来源正文版本。核心验证选区属于保存快照，最多 100,000 个字符；结果最多 64,000 个字符，摘要最多 16,384 个字符。锁定、修改、删除、取消、会话失效或十分钟过期时不得应用旧结果。提供商凭据继续留在主进程保护存储，与笔记数据分离。

## T12.4 翻译架构 9 与行内样式

`library.json.schemaVersion=9` 增加可选 `generatedTranslation`，沿用摘要的 text/sourceContentVersion/sourceRevisionId/createdAt/provider/model，并保存 targetLanguage/scope/sourceMode/sourceHash/instruction。sourceHash 是实际源文本、范围、源码模式及补充要求的 SHA-256；用于本地缓存有效性，不替代修订完整性校验。每篇笔记保存最近一次翻译，增加 version，不增加 contentVersion。缓存读取不访问提供商，正文或范围不匹配时只读展示过期结果。翻译随元数据历史、加密、备份及跨库导入保留，列表／索引不回传翻译文字，单篇导出不包含翻译。元数据读取与提交上限统一为 512 KiB，其他清单保持原上限。核心支持架构 1–9，安全设置不会降级架构，旧程序拒绝不支持的架构。

Delta version 1 支持 underline/strike=true、color/background=#RRGGBB，禁止其他颜色输入。HTML 允许行内文字标签的 color/background-color，保存时规范为 span，颜色使用六位十六进制或 0–255 RGB；Markdown 保留受限制行内 HTML 的下划线、删除线和颜色，其他 CSS 不进入富文本编辑。

## T13 Tasks ICS 导入记录

任务映射为原有 TXT 修订，目录默认未分类，不升级笔记本架构。根目录 tasks-imports.json 版本 1，绑定 libraryId，rows 保存 identity/fingerprint/operationId/noteId；标识和字段快照为 SHA-256，操作和笔记标识为 UUID。写前先持久化 noteId=null 的计划操作，再通过 NoteLibrary.create 发布原有修订，最后原子保存完成笔记 ID。中断后同快照按原操作 ID 重试，不重复创建，也不覆盖后来本地编辑。完成记录即使笔记删除也跳过同一来源。记录只保存哈希和 ID，不保存任务文字／源路径；单库最多 10,000 条，上限 4 MiB，损坏保留并拒绝继续。完整备份保留记录；原生跨库导入仅导入笔记，不合并去重表。批次先完整备份，不覆盖既有笔记；报告明确部分成功，取消预览不写入。

T13.2：library.json 架构 10 新增修订 metadata.taskSource={version:1,uid,fields}。只读来源字段由受信 Tasks 核心写入，正文保存 DESCRIPTION，普通 renderer 创建和保存请求不能覆盖此字段；修订、还原、加密、完整备份和原生跨笔记本导入保持它。list/query/history 摘要不包含 taskSource。新写入需先完整备份再升级清单；旧 schema 1–9 均可读取。原 Tasks 导入记录和快照哈希不变。

T13.3 tasks-imports.json 格式 2 与格式 1 兼容读，原行保持 identity/fingerprint/operationId/noteId；新强制行增加 force=true。普通行的来源快照唯一，强制行以来源快照加 operationId 区分多次显式副本。首次强制前完整备份，旧应用回退须恢复备份中的旧记录。笔记本清单仍为架构 10。

永久删除收尾在 purge journal 标记完成前清理 noteId 匹配的 Tasks 记录，未完成清理可随 purge recovery 重试；回收站不清理。预览兼容忽略旧版指向不存在笔记目录的记录，确认导入前备份后持久清理。
