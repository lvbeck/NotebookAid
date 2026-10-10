# T02 版本与验证记录

日期：2026-10-09。状态：开发检查完成，待用户验收。工作目录 `C:\Projects\ws\NotebookAid`。

用户实测补充（2026-10-09）：重新注册桥接后连接成功；Thunderbird 重启后后台 PID 15384 不变；明确退出 NotebookAid 后状态查询和打开窗口均失败，仅显式“启动独立后台”可重启。这些真实生命周期场景符合预期，替代此前相应场景的“待用户复测”状态；不等于 T02 整体批准。

当前交付 **0.2.0-t02.4 / XPI 0.2.3**：纯 SVG 等宽 N 统一桌面与插件图标。生产构建／编译和打包运行检查通过，报告 `output/smoke-packaged/1791560444443/smoke-report.json`。插件 manifest 所有图标路径存在，PNG 与桌面对应资源 SHA256 相同；实际 Thunderbird 图标显示待用户验收。

图标更新版为 **0.2.0-t02.3**（XPI 仍为 0.2.2）。构建、编译和打包运行检查通过，报告 `output/smoke-packaged/1791559495067/smoke-report.json`。已查看 EXE 提取图标及应用品牌图标；托盘实际视觉与不同 DPI 待用户验收。此更新不改变插件或笔记功能。

最新修复版为 **0.2.0-t02.2 / XPI 0.2.2**。下表保留首次交付检查历史；修复版报告为 `output/smoke-packaged/1791558809982/smoke-report.json`，新增编辑输入同步、删除同步、源码回载和原文保留检查全部通过，构建体积 523.36 kB。源码不再固定显示初始样本。

兼容性修正依据：本机 Thunderbird `omni.ja` 中 `XPIInstall.sys.mjs` 将 `gecko.strict_min_version` 对应 TOOLKIT_ID；`XPIDatabase.sys.mjs` 对 TOOLKIT_ID 使用 platformVersion。`platform.ini` 的 Milestone 为 157.0，因此 XPI 最低值修正为 157.0；应用 157.0.1 仍为验收基线。未在用户 Thunderbird 中安装验证，等待用户复测。

## 锁定版本

| 组件 | 版本／选择 |
|---|---|
| 测试应用 | 0.2.0-t02.1，Windows x64 便携包 |
| Electron | 44.7.0，内置 Node.js 24.21.0、Chromium 152.0.7977.130 |
| Angular／CLI／Build | 22.2.2 |
| TypeScript | 6.0.3 |
| Quill | 2.0.3 |
| SQLite | Electron 内置 `node:sqlite` 的 DatabaseSync；运行查询返回 3.53.4 |
| Lucide | 1.54.0，框架无关图标入口，用 Angular 组件封装 |
| Markdown 转换 | marked 18.1.0、turndown 7.2.4 |
| HTML 清理 | DOMPurify 3.4.16 |
| 打包工具 | @electron/packager 20.3.0 |
| Native Messaging | 自有 C# 小桥接进程，Windows .NET Framework；独立后台仍为 Electron＋TypeScript |
| Thunderbird 测试 addon | 0.2.1，manifest 最低 157.0.1 |

精确依赖树见根目录 `package-lock.json`。Angular 与 TypeScript／Node 组合按安装包 peerDependencies 和 [官方兼容矩阵](https://angular.dev/reference/versions) 核对；未采用不匹配的 TypeScript 7。SQLite 原型使用内置模块，因此本阶段没有额外原生驱动 ABI 重编译。

## 实际检查

| 检查 | 结果与证据 |
|---|---|
| Angular 生产构建及 TypeScript 严格编译 | 通过；最终 JS＋CSS 522.70 kB（原始大小） |
| 核心单元测试 | 3/3 通过：SQLite 中文与重开、分片／合并帧、异常／超限帧 |
| 最终 EXE 自动运行 | 通过；`output/smoke-packaged/1791557448929/smoke-report.json` |
| 打包后 SQLite | 写入后关闭重开，中文一致，writes=2，integrity=ok |
| 编辑器原型 | 样本含标题、加粗、列表、引用、链接、代码块；检查输出 Markdown 标题／加粗／围栏及文字 |
| UI 与隔离 | Angular 22.2.2 就绪、CSS 生效、主题／语言切换、10 个图标、无 renderer console error；window.require/process 未暴露 |
| 视觉复核 | 已查看浅色／深色截图，三栏、工具栏和正文显示正常；截图位于 output/smoke-packaged 下 |
| Windows Job 生命周期 | 通过；`output/native-lifecycle/1791557188143/report.json`：桥接随 Job 终止，桌面在 Job 外且继续存活 |
| npm audit --omit=dev | 1 项 low：Quill HTML 导出 XSS；没有 moderate/high/critical。告警仍存在，见下文 |

机器实际运行报告为 `win32 10.0.26300 x64`；不能据此证明 Windows 10 实机通过。安装的 Thunderbird 版本已读取为 157.0.1，但没有安装本测试插件、改注册表或自动操作用户 Thunderbird。

## 安全与原型边界

- Electron 保持 sandbox、contextIsolation，关闭 nodeIntegration；预加载仅暴露固定原型操作，主进程校验 IPC 来源。CSP 禁止内联脚本；不允许页面导航、弹窗、远程 HTTP 请求。
- Native Messaging 接口仅启动／查询／打开；64 KiB 帧限制，通过当前用户目录中的随机令牌连接本地管道。不声称防御已经控制同一 Windows 用户账户的程序。
- 独立启动采用 Windows Job breakaway；不支持时明确失败，不能用模拟测试替代真实 Thunderbird 的关闭／重启验收。
- [Quill 告警 GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25) 记录 2.0.3 HTML 导出问题且未列修复版本。本原型导入和导出转换前均调用 DOMPurify，禁用媒体／脚本等内容，转换结果作为文本显示；这些限制降低当前路径暴露，不等于上游漏洞修复或完整安全审计。T04 实现 HTML 导出时必须继续清理并增加恶意内容回归样本。
- 编辑器标题／正文均不落盘。SQLite 仅保存固定诊断记录。语言／主题是非敏感偏好，保存在 Electron 本地存储。
- Markdown 往返仅限已检查样本。文字比较忽略空白，代码块语言标签和部分富文本格式可能丢失；原始输入仍保留。正式保真策略在 T04 实现。
- 八语言是资源结构和切换入口，尚未完成全部翻译；中文输入法组合、真实 Windows 10、完整 Thunderbird 生命周期均待用户测试。
- 未实现笔记保存、AI、加密、备份或正式安装器；T03–T15 仍按批准门槛逐项进行。

## 运行与回退

见 [测试指南](t02-testing.md)。自动测试均使用 `output/` 独立数据路径，未修改真实笔记。便携包不注册开机启动、不修改系统注册表；仅用户主动运行 `Register-Bridge.ps1` 时注册专用 HKCU 项，对应 `-Remove` 回退。
