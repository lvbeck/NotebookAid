# T07 测试指南

版本：0.7.0-t07.1。状态：等待用户验收；未提交 T07。

## 功能与规则

- 笔记操作区新增“历史版本”及移至回收站图标；侧边栏回收站入口启用。
- 回收站支持源码预览、恢复及单篇永久删除。移入和永久删除均弹出确认，取消不会更改数据。
- 历史每页 20 条，显示版本、时间、格式和附件数量。预览为只读源码，不执行 HTML。恢复创建新版本，恢复标题、正文、格式及附件关联，保留当前文件夹、标签和置顶状态。
- 默认保留全部历史，不自动清空回收站或裁剪历史。历史页提供批量手动清理：输入要保留的最近版本数量，预览删除数量，再确认；至少保留当前版本。输入框的 50 是本次操作的可修改初始值，不是自动保留上限。历史清理不删除附件实体、外部备份或导出副本。
- 文件夹与标签管理的编辑区域新增删除操作。仅可删除没有子文件夹、没有笔记引用的文件夹，以及没有笔记引用的标签；回收站笔记同样计入引用。请先移动笔记／移除标签关联。
- 首次手动清理历史或删除文件夹／标签会升级至架构版本 6，并先在笔记本旁边的 `.lifecycle-backups/<backup-id>` 创建完整备份。旧版程序不能打开架构版本 6。历史仍可查看，恢复时不会重新创建已删除的组织项；从此笔记本导入时，历史中失效的组织引用会归入未分类／移除失效标签，原始来源不变。
- 永久删除移除当前笔记本中的笔记文件、全部历史、附件及相关恢复记录。它不是磁盘安全擦除，也不清除外部备份／导出副本。
- 永久删除先写入确认操作凭据，再将笔记原子移动至待清理目录；中断后重启继续已确认的删除，不重新显示为正常笔记。

## 验收步骤

1. 分别新建 Markdown、HTML、TXT 和 Delta 笔记，保存至少两版，查看历史与只读源码；恢复较早版本，确认生成新版本且正文正确。
2. 为笔记添加图片／附件，移除关联后恢复对应历史，确认关联和图片回来；当前文件夹、标签及置顶不因历史恢复改变。
3. 点击移至回收站，先取消，再确认。正常列表应移除；回收站可恢复，重启仍正确。
4. 在专用测试笔记上试永久删除，先取消再确认；重启后不能再找到该笔记和历史。真实重要笔记不要用于此项测试。
5. 删除空文件夹和未使用标签；有子文件夹、正常笔记或回收站笔记引用时应拒绝。检查首次升级提示、完整备份和设置页架构版本 6。
6. 从升级后的笔记本导入另一本，确认笔记与历史可浏览，来源保持不变。
7. 新建多版历史，进入“批量清理历史”，先取消，再指定保留最近 2 个版本并确认；检查剩余版本仍可恢复，重启及跨笔记本导入后仍正确。普通保存不应触发自动清理。
8. 切换语言和深浅主题，检查回收站、历史页和确认框。繁体中文采用香港用语。

## 编辑界面补充验收（0.7.0-t07.2）

- 标签选择器、置顶、历史版本、移至回收站始终在同一行；窄窗口横向滚动查看，按钮文字不换行。文件夹标签前显示图标。
- 模式切换、撤销重做、格式工具、附件和导出合并在一行。空间不足时使用“更多编辑工具”和导出图标展开，Esc 或点击区域外关闭。源码模式隐藏富文本格式工具。
- 检查导出格式选择框按最长选项收窄，Delta (.nadelta) 完整单行显示；验证富文本格式、表格菜单、附件和导出仍正常。
- 从普通窗口进入全屏编辑，应用窗口应最大化，标题移入顶部保存栏且可编辑；滚动长笔记时标题和保存按钮保持可见。
- 用按钮或 Ctrl+Shift+F / Esc 退出，窗口恢复普通尺寸及位置，标题回到原处且修改保留。进入历史版本或回收站时也退出全屏。若进入前已最大化，退出后按需求返回普通窗口尺寸。

## 程序与数据回退

保留的旧版 ZIP 可用于程序回退；不要用旧程序打开已升级至架构版本 6 的笔记本。需要回退数据时，退出程序，将 `.lifecycle-backups` 内升级前完整备份复制到新的空目录，再由旧版打开；升级后的原笔记本保留。永久删除后的数据仅能从已有备份／导出副本恢复。

## 验证边界

实际自动检查和交付结果在 [开发计划](implementation-plan.md) 的 T07 记录中。自动检查不等于用户验收，不证明硬件断电、真实杀毒软件干扰、Windows 10 实机或磁盘安全擦除。

## 源码与表格补充验收（0.7.0-t07.3）

- HTML、Delta 笔记切到源码，在模式切换右侧点击“美化源码”，再点击“最小化源码”；检查不同图标、撤销／重做、保存和重新打开。无效 Delta JSON 必须提示错误并保持原文。
- HTML 仅整理安全的块结构间空白和标签语法空白；保留行内文字、链接属性、pre/code 和原始内容。遇到 style、外部样式或自定义元素时不调整结构间空白；不会删除注释或属性。复杂 HTML 可能只做有限整理，仍可源码保存。
- 检查任务列表未选中的圆角边框、选中紫色和白色勾；点击切换、嵌套缩进及保存仍正确，浅色／深色都应清晰。
- 新表格默认首行为表头；HTML 或 Delta 中点击一行的任意单元格，再打开表格菜单，选择“设为表头行”或“设为正文行”。检查整行底色、保存与重新打开。
- HTML 使用 th 区分表头单元格、td 区分正文；连续的首部表头行导出到 thead，其余行在 tbody。正文中单独设为表头的行使用 th，保留原位置。Delta 使用 cell-header 标记。Markdown 固定首行表头，两个切换命令禁用并显示说明。

- “源码／纯文本”已统一缩短为“源码”（其他语言同步）；在表头行新增列时，新单元格应继承表头标记。

## 0.7.0-t07.4: dialogs and fullscreen alignment

1. Enter fullscreen: the folder/tag/pin/history/trash row should have equal space above and below.
2. Move a note to trash: a themed in-app dialog appears, the note stays visible behind it, and Cancel receives focus. Test Cancel, X, Escape and clicking the backdrop; each must preserve the note. Tab must remain inside the dialog. Confirm should move it to trash.
3. Check history restoration/cleanup, folder/tag deletion and permanent deletion confirmations in light/dark themes.
4. With an older test notebook, check attachment/Delta upgrade confirmation; cancellation must not upgrade it. File/folder/Save As pickers should still be native.
5. On a failed save, exiting should show the same dialog; keep editing must preserve pending text.

Automated development checks: build, two confirmation broker tests, Electron dialog smoke (cancel/close/Escape/backdrop, focus, unknown token, confirmed trash, upgrade cancel/confirm, failed-save exit cancel, light/dark screenshots) and fullscreen geometry. Packaged regression results are recorded in the implementation plan after execution. Awaiting manual acceptance.
Rollback: exit NotebookAid and replace program files using the retained 0.7.0-t07.3 ZIP. No test-directory backup is created; notebook data is not part of this replacement.

Final package verification: dialog GUI regression and lifecycle/restart regression passed; confirmation broker unit tests 2/2 passed. See output/dialog-packaged/1791757246687 and output/lifecycle-packaged/1791757255137. All native message-box call sites were removed; native file pickers remain. Manual visual acceptance is pending.

## 0.7.0-t07.5: sidebar exit and close confirmation

- Expand/collapse the sidebar: Exit app uses the existing navigation style and shows only its Power icon with a right-side tooltip when collapsed.
- With all notes saved, test sidebar Exit, native window X / Alt+F4 and tray Exit: show Confirm exit and Cancel. Cancel keeps the window open. Repeated close attempts must not stack dialogs.
- Edit title/body without saving: show Save and exit, Discard changes and exit, Cancel. Opening or cancelling this dialog must not save automatically.
- Save and exit, then restart: the latest changes must be present. Discard and exit, then restart: only the last saved version must remain.
- A failed save must keep the window and unsaved text. Retry after fixing the error. Escape, X and backdrop cancel. Keyboard focus remains in the dialog.
- Explicit Hide to tray still hides without exiting; subsequent tray Exit uses the same confirmation.

Automated development clean/save/discard exit and process-restart checks passed. Awaiting packaged checks and manual acceptance. Roll back program files with the retained T07.4 ZIP after exiting; do not overwrite notebook data.

T07.5 final packaged verification passed: output/exit-packaged/1791758383936 (all three exit choices plus restart), output/dialog-packaged/1791758393767 (existing dialogs), output/lifecycle-packaged/1791758402202 (lifecycle plus restart). Unit tests: dialog broker 3/3; locale completeness 2/2. Manual visual/Windows tray acceptance is pending.

## 0.7.0-t07.6: dialog heading icons

Check clean exit and schema upgrade dialogs: the info glyph has no circle. Check unsaved exit, trash and deletion dialogs: warning icons remain. Icons and heading text should be vertically centered, including light/dark themes. Title icon containers are 24 px; the close button must not shrink. This is a shared dialog visual correction; confirmation behavior is unchanged. Retained T07.5 ZIP supports program rollback. Awaiting manual acceptance.
