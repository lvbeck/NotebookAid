# 界面线框

状态：T01 信息布局提案；不是渲染结果或已实现界面。风格采用浅灰背景、简洁正文区域、细边框、紫色强调色与 Lucide 图标，深色主题使用对应语义颜色。

## 独立应用

```text
+--------------------------------------------------------------------------+
| NotebookAid       New note     Save status                    Search / ...|
+------------------+---------------------+---------------------------------+
| Library          | Search notes        | Note title                      |
| > Folder         | Tags / Sort         | Tags   Lock   Thunderbird eye   |
|   > Subfolder    |---------------------|---------------------------------|
| Pinned           | * Pinned note       | Format toolbar                  |
| Recent           |   Note / folder     |                                 |
| Tags             |   Note / updated    | Main editor                     |
| Trash            |                     |                                 |
|                  |                     |                                 |
| Settings         |                     | Summary [Generate]              |
+------------------+---------------------+---------------------------------+
| Connection / background state                   AI assistant / Properties|
+--------------------------------------------------------------------------+
```

- 左侧文件夹树，中间笔记列表，右侧编辑区域。建议支持调整宽度、折叠和专注模式。
- 标题附近显示主格式、加密状态、Thunderbird 可见性；状态有文字提示，不只靠颜色。
- 保存状态明确区分已保存、保存中、未保存、失败和索引待修复。
- 工具栏按主格式限制可用操作，格式转换有损时不直接覆盖原文。
- 置顶、最近和标签是视图，不复制笔记。
- 摘要区域可折叠；没有摘要时显示手动生成入口，正文变动后显示“摘要可能已过时”。
- 所有线框中的英文仅为布局占位，实际界面遵循八语言资源。

## AI 面板

```text
+----------------------------------+
| AI assistant                 [x] |
| Provider [selected provider]     |
| Model    [available model]       |
| Scope    [selection / full note] |
| Action   [rewrite / translate...]|
| Additional instructions          |
| [Generate]  [Cancel]             |
|----------------------------------|
| Result preview                   |
|                                  |
| [Insert] [Replace] [Discard]      |
+----------------------------------+
```

请求前显示处理范围与连接状态；使用 ChatGPT 订阅时标识使用套餐额度。加密内容发送云端前明确提示。生成中、取消、授权失效和版本冲突均有独立状态，不把失败显示成空白成功结果。

## Thunderbird addon

```text
+----------------------------------------------------------------+
| NotebookAid          Connection status           Open desktop  |
+----------------+-------------------+---------------------------+
| Folders / Tags | Search / Filters  | Read-only preview         |
|                | Note list         | Title / content / summary |
|                |                   |                           |
|                |                   | [Edit in app] [Delete]    |
+----------------+-------------------+---------------------------+
```

- Thunderbird Spaces 侧边入口打开 NotebookAid 标签页。
- 编辑按钮打开独立应用并定位笔记，不在 addon 中实现完整正文编辑器。
- 删除默认移入回收站；编辑中提示“该笔记正在编辑中，无法删除。请结束编辑后重试。”
- 隐藏后已打开的预览必须清空；锁定后同样不显示敏感内容。
- 未安装、后台已退出、连接失败和版本不兼容分别显示可操作的提示。

## 设置分组

2026-10-09 新需求覆盖原平铺设置分组，以下仍为待实施方案。

```text
Settings
  Global
    Appearance and language
    Notifications: position / history
    Default autosave: enabled / minutes
  Libraries
    [Select registered library]
    Display name / path / availability
    Autosave: inherit global / override
    Effective value and source
    Index status / rebuild (active library only)
```

界面中文入口为“设置”，内部分“全局设置”“笔记本设置”。各库默认继承全局自动保存，可恢复继承。后续库设置由 T07 历史、T08 安全、T09 备份／路径迁移继续扩展；全局连接由 T10／T11 扩展。关于、许可和完整语言覆盖在后续对应任务完成，不用可操作的占位按钮制造已实现印象。

## 通知与消息中心（T03-A 提案）

```text
Top bar:                                          [Bell 3]

Bottom right:
+------------------------------------------+
| [Success icon] Saved successfully    [x] |
| Your changes have been saved locally.    |
| [History icon] View history              |
+------------------------------------------+

Right drawer:
+------------------------------------------+
| Notifications                        [x] |
| [Mark all read] [Clear history]          |
| [Type] [Unread / All] [Library]          |
|------------------------------------------|
| [Icon] Type / Time / Library / Unread    |
| Message                                  |
| [Mark as read] [Delete]                  |
+------------------------------------------+
```

右下角为建议默认位置，可在全局设置中选择其他角。卡片建议约 360px 宽，随窗口缩小收窄；细边框、轻阴影、小面积状态色，保持现有紫色强调。消息抽屉约 420px 宽，沿用背景／面板颜色，窄窗口限制为可用宽度。抽屉打开后键盘焦点可导航，Esc 关闭并回到触发按钮；弹窗不抢焦点。容量、时长与不刷屏规则见 [需求规格](requirements.md#r36-通知卡片与消息中心)。

## 笔记本列表（T03-B 提案）

```text
Libraries                    [Add existing] [Create new]
Name            Path                    Last opened  State
Personal        C:\Notes\Personal       ...          Current
Work            D:\Notes\Work           ...          Available
Archive         E:\Archive              ...          Unavailable
Row actions: [Open] [Rename] [Locate] [Remove from list]
```

从左侧“选择笔记本”进入。添加已有库验证清单，新建库要求空目录；路径失效保留记录。显示名称可变更但不移动文件；重新定位核对库 ID。列表移除文案明确说明仅移除路径记录，保留磁盘数据。打开成功后回到笔记列表，顶部显示当前库名。

## 恢复与危险操作

- 首次加密：设置密码 → 生成并单独保存恢复密钥 → 用户确认已保存 → 启用加密。
- 密码遗失：输入恢复密钥 → 验证成功 → 设置新密码 → 恢复访问；不自动修改原密文以“尝试修复”。
- 历史恢复：显示目标版本及日期，先保留当前版本，再建立新的当前版本。
- 备份恢复：检查备份 → 选择恢复目标 → 校验 → 确认切换；旧数据保留到用户明确处理。
- 永久删除明确显示范围；回收站、历史和备份是否仍含副本必须说明，不宣称安全擦除。
