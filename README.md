# NotebookAid

**AI 笔记与写作助手**

NotebookAid 是面向本地个人使用的开源笔记应用，由独立桌面应用、共享本地核心和 Thunderbird addon 组成。笔记保存在用户选择的本地目录中；AI 写作和摘要仅在用户主动操作时调用所选提供商。

## 项目状态

- T01–T14、新手引导及应用菜单／信息页面已获用户批准。
- T14-C 右键菜单及 Markdown 编辑修正已获用户验收；按用户要求暂不进行下一任务。
- 侧边栏底部调整、右键置顶／取消置顶及批量解除加密已获用户验收，验收版本为 0.14.3-context.5；当前启动优化版 0.14.4-startup.0 已获用户验收，暂不进行 T15-A。
- 提供 Markdown／HTML 安全子集富文本、TXT 纯文本、原文保护、导入／导出预览、正文撤销重做，以及本地保存、多笔记本、分层设置和消息中心。
- 已提供图片附件、可选 Delta 原生格式、回收站与历史、逐笔记加密、Passkey 应用门禁、备份恢复、笔记本外观、Thunderbird 集成及 AI 连接管理。T12 增加主动辅助写作、插入／替换、独立摘要与翻译保存，工具栏支持下划线、删除线及文字／背景颜色。
- 计划与验收状态以 [实施计划](docs/implementation-plan.md) 为准。

启动性能及可配置分页（T14-D）已获用户验收；T15-A 未开始。验收与回退见 [启动验收](docs/startup-testing.md)。

## 当前测试入口

- [NotebookAid 0.14.4-startup.0 EXE](release/0.14.4-startup.0/NotebookAid-win32-x64/NotebookAid.exe)
- [Windows x64 便携 ZIP](release/NotebookAid-0.14.4-startup.0-win-x64.zip)
- [新手引导验收及回退指南](docs/onboarding-testing.md)
- [应用菜单及信息页面验收指南](docs/menu-testing.md)
- [右键菜单验收及回退指南](docs/context-testing.md)
- [批量解除加密验收及数据回退指南](docs/decrypt-testing.md)
- [T14 界面验收指南](docs/t14-testing.md)
- [T13 Tasks 导入及回退指南](docs/t13-testing.md)
- [T06 附件与升级回退指南](docs/t06-testing.md)
- [T05-A 导入、兼容与回退指南](docs/t05a-testing.md)
- [T05 组织与搜索测试](docs/t05-testing.md)

## 已确认基础

| 项目 | 决定 |
|---|---|
| 技术路线 | Electron、TypeScript、Angular、Quill 2.x、SQLite、Native Messaging、Lucide |
| 首版平台 | Windows 10 及以上，x64 安装包；具体系统 build 和依赖版本在 T02 验证后记录 |
| Thunderbird 基线 | 157.0.1，按 2026-10-09 核对的 Release 稳定渠道固定下限 |
| 内容格式 | Markdown、HTML、纯文本；默认 Markdown |
| AI 提供商 | ChatGPT 订阅登录、Gemini API Key、Claude API Key |
| 发布范围 | 第一版开源、本地个人使用；商业发布后续评估 |
| 许可证 | [BSD-3-Clause](LICENSE) |
| 版权人／联系方式 | Jin Lu · [it@live.cn](mailto:it@live.cn) |

Thunderbird 后续版本需验证后声明支持，ESR 不因版本名称相近而自动纳入。Windows 10 是产品支持目标，尚未通过实机验证。开源许可证与外部 AI 服务的接入资格分别管理。

## 文档入口

| 文档 | 用途 |
|---|---|
| [需求规格](docs/requirements.md) | 已确认功能、边界、建议默认值和待定项 |
| [架构草案](docs/architecture.md) | 进程职责、生命周期、安全边界和数据操作顺序 |
| [数据格式草案](docs/data-model.md) | 权威文件、可重建索引、版本、加密和备份 |
| [接口草案](docs/api-contract.md) | 两端共用的操作、错误、编辑锁和变更事件 |
| [界面线框](docs/wireframes.md) | 桌面端、addon、AI 与设置页布局 |
| [验收清单](docs/acceptance.md) | 按任务安排的用户验收步骤与开发检查 |
| [实施计划与进度](docs/implementation-plan.md) | T01–T15 串行执行、交付记录和批准记录 |
| [来源与依赖许可](docs/sources-and-licenses.md) | 官方资料、许可依据和待验证事项 |
| [项目工作约定](AGENTS.md) | 开发语言、范围和用户批准门槛 |

## 第一版与后续范围

第一版包括基础笔记、文件夹树、搜索、标签、自动保存、置顶、最近使用、附件、回收站、历史版本、备份、主题、八语言、Thunderbird 集成、ICS 导入、AI 写作与手动摘要，以及笔记加密和恢复密钥。

Gemini Notebook 同步移至第二版。Gemini 模型的 AI 写作与摘要仍属于第一版。macOS／Linux 首版不交付安装包，但业务核心与平台相关逻辑需隔离。

## 历史测试入口：T03-A

- 已解压程序：[NotebookAid.exe](release/0.3.0-t03a.2/NotebookAid-win32-x64/NotebookAid.exe)。
- 便携测试包：[Windows x64 ZIP](release/NotebookAid-0.3.0-t03a.2-win-x64.zip)，内含测试 XPI 0.2.4。
- [T03-A 测试与回退指南](docs/t03a-testing.md)；原笔记核心测试见 [T03 指南](docs/t03-testing.md)。
- T03-A／B／C 均已获用户批准，旧包保留。当前请使用上方 T04 入口；仍逐项等待用户测试批准。

## 从源码运行（Windows PowerShell）

需 Node.js 24.15+（24.x）、npm 和 Windows 自带 .NET Framework C# 编译器。锁定依赖见 `package-lock.json`。

```powershell
npm ci
node node_modules/electron/install.js
npm run build
npm test
npm start
```

测试与打包：

```powershell
npm run smoke
npm run package
node scripts/smoke.cjs --packaged
node scripts/test-native.cjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

打包会重建本项目 `release/<版本>/NotebookAid-win32-x64`，请勿在该构建输出目录保存个人文件。测试证据写入 `output/`；自动测试使用独立数据目录。

## T03-B 测试入口

- [新版 NotebookAid.exe](release/0.3.0-t03b.1/NotebookAid-win32-x64/NotebookAid.exe)
- [Windows x64 ZIP](release/NotebookAid-0.3.0-t03b.1-win-x64.zip)
- [T03-B 测试与回退指南](docs/t03b-testing.md)

T03-B 已获用户批准；当前等待 T03-C 用户验收。

## T03-C 测试入口

- [新版 NotebookAid.exe](release/0.3.0-t03c.1/NotebookAid-win32-x64/NotebookAid.exe)
- [Windows x64 ZIP](release/NotebookAid-0.3.0-t03c.1-win-x64.zip)
- [T03-C 测试与回退指南](docs/t03c-testing.md)

等待 T03-C 用户验收，尚未开始 T04。

T05 组织与搜索验收说明：[docs/t05-testing.md](docs/t05-testing.md)。组织功能启用后的库不支持旧版程序写入，测试前请使用完整副本。
