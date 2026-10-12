# 核心接口草案

T05-A 桌面 IPC 新增 `previewLibraryImport()`（受控目录选择，返回预览或取消）与 `confirmLibraryImport(token)`。预览 token 绑定当前渲染进程、来源快照及目标库；确认时重验两个快照，变化返回 VERSION_CONFLICT。确认只允许当前目标，核心统一执行备份、原生导入和升级。成功返回 imported、skipped、backupPath、targetVersion。来源只读；失效 token 需重新预览；中断后依据目标事务日志恢复。发生未完成回滚时关闭当前核心，后续打开必须先完成恢复。此接口不开放给 Thunderbird。

状态：T01 操作与语义草案，不是已经实现或冻结的 API。最终 TypeScript 类型、schema 验证器和协议版本在 T02／T03 确定。

T03 实施补充：当前桌面 IPC 类型见 shared/library.ts，通过 `{ok,value}` 或 `{ok:false,code}` 返回。已开放 status、choose、list、create、begin、end、save、rebuild；会话绑定主进程确认的 webContents，崩溃或页面重载后回收。save 使用 operationId 幂等记录、expectedVersion、token 和 generation；返回 saved 与 indexed。核心提供不携带标题／正文的 onChange，以及仅用于核心校验的 trash；二者尚未接入插件。Native Messaging 仍只开放 T02 的启动／查询／打开，完整协议握手、事件重连与笔记权限过滤在 T10 实现，不能把下表理解为全部已开放。

## 通用约定

T05 实施补充：桌面受限 IPC 新增 organization、editOrganization、place、query，类型见 shared/organization.ts 和 shared/library.ts。editOrganization 按 expectedVersion 原子修改单个文件夹／标签定义；place 复用笔记会话、expectedVersion 和 operationId，正文保持原样。query 支持 text、folderId（省略为全库，null 为未分类，指定 ID 含后代）、tagIds（AND）、view（all/pinned/recent）、offset、limit（1–100），返回 notes 摘要与 total。Native Messaging 未扩大权限，T10 再接入共享核心搜索。未知提交的 place 在 renderer 保留原请求并复用 operationId 重试，后续正文写入或切库必须先确认其结果。

- 握手交换 `protocolVersion`、应用版本、支持能力与 `libraryId`；不兼容时返回明确提示，不尝试危险的写入降级。
- 请求包含 `requestId`、操作名和参数；写入带 `expectedVersion`，编辑保存还需有效会话与代次。
- 重试可能产生副作用的操作携带 `operationId`；断连结果未知时先查询结果，不能盲目重做。
- 调用者类型和权限由可信连接确定，不能通过传入 `clientType: desktop` 获得权限。
- 返回成功值或稳定错误码；错误消息本地化在界面层完成，日志不记录正文、密码、token 或 API Key。
- `saved` 与 `indexed` 独立表达；内容提交成功后索引失败不能伪装成“文件未保存”。

## 操作范围

| 操作族 | 代表操作 | 允许的客户端／语义 |
|---|---|---|
| 连接 | `handshake`, `getStatus`, `getOperationStatus` | 两端；能力与连接状态 |
| 浏览搜索 | `listFolders`, `listNotes`, `searchNotes`, `getNotePreview` | 两端共用；核心施加不同可见范围，支持分页及稳定排序 |
| 编辑定位 | `openInDesktop` | addon 可调用；核心再次校验笔记可访问性，按 ID 定位 |
| 编辑会话 | `beginEdit`, `renewEdit`, `endEdit` | 桌面端；返回会话、代次和当前版本 |
| 笔记写入 | `createNote`, `saveNote`, `moveNote`, `updateNoteProperties` | 桌面端；核心统一版本与权限检查 |
| 删除恢复 | `trashNote`, `trashFolder`, `restoreNote`, `purgeNote` | addon 仅允许移入回收站；永久删除及恢复在桌面端操作 |
| 历史附件 | `listRevisions`, `restoreRevision`, `addAttachment`, `exportAttachment` | 桌面端；addon 仅按后续 UI 明确允许的预览权限读取附件 |
| 标签 | `listTags`, `updateLocalTag`, `mapThunderbirdTags` | 两端按职责授权；映射包括 profile 标识 |
| 安全 | `setVisibility`, `encryptNote`, `unlockLibrary`, `lockLibrary`, `recoverAccess` | 桌面端；addon 不能通过此接口自行解锁 |
| AI | `listProviders`, `listModels`, `connectProvider`, `startWriting`, `generateSummary`, `cancelRequest` | 桌面端；凭据只进入受保护核心接口，不经过 addon |
| 备份导入 | `createBackup`, `restoreBackup`, `importTasks`, `exportNote` | 桌面端；预览、校验和用户选择由对应流程完成 |
| 刷新 | `subscribeChanges`, `getChangesSince` | 两端；事件按调用者可见范围过滤 |

上述方法为语义名称，不要求直接暴露同名 IPC 通道。恢复密钥、导出与敏感操作宜使用专用最小接口。

## 必需错误语义

| 错误码 | 含义与界面处理 |
|---|---|
| `NOT_FOUND_OR_UNAVAILABLE` | 对 addon 隐藏“真实不存在”与“不可访问”的区别 |
| `NOTE_IN_USE` | 编辑会话仍有效，提示结束编辑后再删除 |
| `VERSION_CONFLICT` | 读取当前版本并让用户选择处理，不覆盖 |
| `SESSION_EXPIRED` | 编辑会话失效，重新建立会话并核对版本 |
| `LIBRARY_LOCKED` | 需要在桌面端解锁；不返回敏感内容 |
| `INVALID_INPUT` | 参数、格式或路径无效 |
| `WRITE_FAILED` | 权威数据未提交；保留草稿并提示重试 |
| `INDEX_REBUILD_REQUIRED` | 权威内容可用，索引需要修复 |
| `INTEGRITY_CHECK_FAILED` | 文件／密文损坏，保留原文件并报告 |
| `PROTOCOL_MISMATCH` | 两端版本不兼容，提示升级匹配版本 |
| `PROVIDER_AUTH_REQUIRED` | AI 连接过期或无授权，要求重新连接 |
| `PROVIDER_REQUEST_FAILED` | AI 请求失败，正文不变，不自动换通道 |

实际错误码冻结前可调整；前端不得只靠匹配英文错误文本判断流程。

## 事件与重连

事件建议包含 `eventId`、`libraryId`、对象 ID、对象版本与事件类型，不携带整篇正文。核心在文件和索引提交后通知可见客户端。索引修复期间提供单独状态，修复后再发出可重查信号。

可见笔记变为隐藏／锁定时，对曾显示内容的 addon 发送不含敏感内容的失效事件，立即清除预览、列表和缓存。不得让新订阅者通过重放事件获得隐藏记录。

addon 保存上次游标；断线期间事件不可用或游标过期时，收到 `resyncRequired` 后重新获取可访问列表和当前预览。所有按 ID 读取均重新授权，事件订阅不替代权限检查。

## AI 并发

请求记录来源笔记 ID、正文版本、选区及请求 ID。取消、锁定、删除或会话结束后，结果不进入正文。应用预览结果时再次检查版本；冲突允许用户查看差异或重新生成，不能自动定位到已经变化的选区并替换。

## T03-A 已实现的通知 IPC

仅可信桌面主 frame 可调用 `notifications:state/publish/read/remove/clear/position`，preload 暴露固定方法。publish 只接受白名单 code、operation、可选 UUID libraryId 和白名单 errorCode；不接受自定义正文、标题或 HTML。返回当前最多 100 条记录及位置设置，失败区分 INVALID_INPUT／NOTIFICATION_STORAGE_UNAVAILABLE。read 的 null 表示全部已读；clear 由 UI 确认后调用。通知接口不对现有 Native Messaging 桥接开放，不改变笔记 save 的返回契约。

## T03-B 库列表 IPC

桌面 library API 新增 registry、register(existing/create)、activate(entryId)、rename(entryId,name)、relocate(entryId)、remove(entryId)，替换原 choose 目录即切换流程。目录选择仅在主进程进行；renderer 不能通过这些方法传入任意路径。清单与参数由核心校验，固定 preload 方法及主 frame 授权沿用。所有写入限本地核心；已有 save／begin／end 契约不变。切换后旧会话失效，迟到保存不能写入新库。新增错误类别：DUPLICATE_LIBRARY、LIBRARY_ID_MISMATCH、REGISTRY_INVALID、UNSUPPORTED_LIBRARY、CURRENT_LIBRARY；具体说明显示在库列表，通知沿用旧错误分类以保持回退兼容。

## T03-C 设置 IPC

library:settings(legacy)、updateSettings(patch)、librarySettings(entryId,autosave|null) 仅通过固定 preload 和可信主 frame 调用。legacy 仅接受 locale/theme/autosave 三个原始字符串或 null；已存在新配置时不重新导入。主进程校验语言枚举、主题枚举、布尔值及 1–60 整数间隔；按库写入要求存在的注册表 entry ID，null 删除覆盖以恢复继承。全局 patch 在主进程基于最新值合并，renderer 串行提交，失败保留运行中和磁盘旧值。设置窗口选择对象不改变活动库。退出前等待设置提交及笔记保存。

## T04 格式与文件 IPC

`create(operationId,input?)` 的可选 input 为 `{primaryFormat:'markdown'|'html'|'text',title,body}`，原单参数调用继续创建空 Markdown；幂等请求指纹包含新建格式／标题／正文。列表增加 primaryFormat，save 请求不提供格式修改，核心保持原格式。

`importFile()` 在主进程打开单文件选择器，由 core/note-files 校验并返回 NoteInput 或取消 null。renderer 保存当前草稿后新建导入笔记；不接受 renderer 任意路径。`exportFile(input)` 在主进程选择保存路径，由核心校验格式、2 MiB 限制及路径，再以排他创建写入副本；返回 true 成功、false 取消。转换在无网络 renderer 中进行，用户必须先检查快照预览。同格式 HTML 副本是原始源码，界面明确提示在其他应用中的活动内容风险。

文件对话框期间拒绝另一个选择操作及库激活。IPC 仍限定可信主 frame；测试文件路径夹具只在 self-test 模式生效，限制到当前测试目录／专用临时导出目录。没有扩展 Thunderbird Native Messaging 权限或协议。

editOrganization 新增 kind=folder-order，参数 ids 为全库文件夹 ID 的无重复完整排列，expectedVersion 防止覆盖过期组织版本。通过原子组织写入保存，拒绝缺失/额外/重复 ID；不改变父子关系。

Global settings may include optional boolean `sidebarCollapsed`. Missing means expanded. Renderer updates use the existing validated settings IPC; write errors retain the previous value. Fullscreen editor state is transient.


T06 新增：`attachments(noteId)` 返回带可用状态的附件清单；`addAttachment(request)` 由主进程文件选择器提供来源；`renameAttachment(request,id,name)` 使用编辑会话、版本、operationId；`previewAttachment(noteId,id)` 仅返回受控图片数据 URL、转义显示用 UTF-8 文本或媒体类型；`exportAttachment(noteId,id)` 由原生保存对话框选目标并以独占创建防覆盖。渲染进程不能指定磁盘源路径。

T06 follow-up: `unlinkAttachment(request,id)` uses the same session/version/operationId validation as renaming. It commits a new attachment list without deleting payloads, historical metadata or body references. Registry entries expose `schemaVersion: number | null` read from the validated notebook manifest.

### T06.3 SVG policy

SVG attachments use the existing schema 4 octet-stream metadata for backward compatibility. Runtime classification recognizes SVG content; clean display data is generated in a network-denied sandbox. New SVG attachments store sanitized bytes, while existing revisions remain unchanged. `SaveResult` and `AttachmentPreview` may include `removedUnsafeSvg` to report sanitization. Image width/height are note content attributes, not attachment metadata; the same attachment can appear at different sizes.

T06-A: NoteFormat adds delta. NoteInput may include validated nativeAttachments for native import, and attachmentNoteId for native export; no renderer file paths are accepted. The core validates full versioned Delta snapshots on create/read/save and native attachment hashes before creation. INVALID_DELTA / UNSUPPORTED_DELTA reject unsupported input; CANCELLED is a user-cancelled schema upgrade and does not create a note. Existing native notebook import accepts schema 5 and validates Delta revisions.
T06-A capacity correction: native file import retains attachment payloads in the main process and returns nativeImportToken plus document metadata. The token is bound to renderer owner and notebook, expires after ten minutes, and is cleared on owner release, cancellation, replacement, or shutdown. After successful creation only a compact receipt remains for identical-operation replay. Native export resolves stored attachments in the core and writes one attachment at a time. Limits are shared: 50 attachments, 20 MiB each, 200 MiB total; the native v1 container includes Base64 expansion and document/metadata headroom.

## T10 实际桥接协议

协议版本 1，经固定方法白名单、Native Messaging 和认证管道处理。handshake／changes 返回当前 libraryId、版本／能力、语言／主题和无正文游标；query／organization 分页，preview 按版本分块，image 仅受控栅格附件。trash 只进回收站，拒绝编辑会话；openNote 重新验证可见性后请求桌面保存并定位。mapTags 接受 profileId、来源 key／name／color 完整快照与组织 expectedVersion，来源删除只标记缺失。所有其他写入、密码／恢复／备份／导出接口不开放。App gate 锁定返回 APP_LOCKED；libraryId 不符返回 LIBRARY_CHANGED；旧协议返回 PROTOCOL_MISMATCH。见 t10-testing.md。

## T11 AI 连接 IPC

ai:request 仅主 renderer 主 frame、应用解锁状态可用。白名单 action 为 state、login（可选 fresh）、cancel、key（仅 Gemini/Claude）、check、select、account、disconnect、usage。返回非敏感连接摘要、账户标签及模型清单或固定错误码；不返回 Key/token，不接受自定义网络地址或笔记内容。写操作串行；异步登录、刷新及模型获取完成前再次验证 renderer 权限。官方固定 HTTPS API，由主进程请求，拒绝重定向，20 秒网络超时／2 MiB 响应上限／10 页模型上限。OAuth 127.0.0.1 回调 3 分钟超时，state、nonce、PKCE 和签名验证，不复用其他应用 client ID 或授权。见 t11-testing.md。

T11.1：login 和 account 在已验证凭据保存后获取 ChatGPT 模型目录；目录失败返回 ok=true 的连接状态及 warning，同时在连接摘要保留固定错误码。后台续期由主进程串行调度，锁屏／退出时禁止提交令牌，暂时失败退避，撤销授权不循环重试；不扩大 renderer 或 addon 权限。界面提供商切换仅改变显示面板。
