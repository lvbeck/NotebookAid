# 来源与依赖许可

状态：保留 T01 设计来源，追加 T02 实际依赖记录。资料核对日期：2026-10-09。链接用于解释设计依据，不代表完成全部许可证审计。

## 用户决定的来源

- 前序聊天：`01a1204e-6566-7dd0-afd3-0c34d98bb474`，标题“评估 Thunderbird 记事本方案”。
- 本聊天最新决定优先：Vue 替换为 Angular；常用功能纳入第一版；采用主密码和恢复密钥；Gemini Notebook 同步移至第二版；首版开源／本地个人使用；逐任务用户验收；BSD-3-Clause，Jin Lu，it@live.cn。
- 本仓库规格是上述决定的项目记录，不包含用户的邮件、密码、API Key 或笔记数据。

## 官方技术依据

| 主题 | 官方来源 | T01 结论／验证边界 |
|---|---|---|
| Windows 平台 | [Electron 平台支持](https://github.com/electron/electron#platform-support) | 官方列 Windows 10 及以上；实际锁定版本和 OS build 仍需 T02 验证 |
| Thunderbird 版本 | [官方版本数据](https://product-details.mozilla.org/1.0/thunderbird_versions.json)、[发布列表](https://www.thunderbird.net/en-US/thunderbird/releases/) | 核对时 Release 为 157.0.1；此下限固定，来源页面会继续变化 |
| Angular | [官方概览](https://angular.dev/overview) | 采用 Angular；具体版本与 TypeScript 兼容组合待锁定 |
| Quill | [Quickstart](https://quilljs.com/docs/quickstart)、[Formats](https://quilljs.com/docs/formats) | 选 Quill 2.x；Markdown 转换和扩展不等于已验证 |
| Native Messaging | [进程生命周期](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging#closing_the_native_app) | 桥接与后台独立生命周期需 Windows 实测 |
| Thunderbird Spaces | [Spaces API](https://webextension-api.thunderbird.net/en/mv2/spaces.html) | 用于入口与标签页；manifest 和具体 API 在目标版本验证 |
| ChatGPT 订阅接入 | [官方概览](https://developers.openai.com/siwc/token-sharing-open-source)、[官方接入示例](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt) | 按开源／本地个人应用路线；NotebookAid 自身身份、授权、模型与额度需真实验收 |

AI 连接方案沿用 Mail AI Assist 的产品体验，但本项目尚未重新审计或复制其实现，也不共享其应用标识或凭据。

## 项目许可证

项目自身代码采用 [BSD 3-Clause](https://opensource.org/license/BSD-3-Clause)，SPDX 标识 `BSD-3-Clause`。版权人 Jin Lu，2026。标准文本位于根目录 [LICENSE](../LICENSE)。邮箱放在项目联系信息，不修改标准授权条款。

该许可证允许使用、修改、再分发和商业使用，包括闭源衍生；要求保留相关声明，不允许未经许可使用版权人或贡献者名称背书。外部 AI 服务授权条件与项目代码许可证分开处理。

## 已选技术的顶层许可证

| 技术 | 许可证 | 来源 |
|---|---|---|
| Electron | MIT；发行包还含第三方组件 | [LICENSE](https://github.com/electron/electron/blob/main/LICENSE) |
| Angular | MIT | [LICENSE](https://github.com/angular/angular/blob/main/LICENSE) |
| TypeScript | Apache-2.0 | [LICENSE](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) |
| Quill | BSD-3-Clause | [LICENSE](https://github.com/slab/quill/blob/main/LICENSE) |
| SQLite 核心 | Public Domain | [Copyright](https://www.sqlite.org/copyright.html) |
| Lucide | ISC；部分 Feather 衍生图标涉及 MIT | [License](https://lucide.dev/license) |
| Native Messaging | 通信机制，不是单个依赖包 | 桥接实现及引入库单独记录 |

这不是完整分发清单。SQLite Node.js 驱动、Markdown 转换器、Quill 扩展、密码库、安装工具、AI SDK 及传递依赖尚未选定；不能以顶层许可推断全部依赖许可。T02 起按锁定版本保留许可证证据，T15 检查实际分发文件与第三方声明。

## 仍需实证的风险

1. Quill 富文本与 Markdown／HTML 往返的可支持范围。
2. Native Messaging 断开或 Thunderbird 退出时独立应用是否存活。
3. SQLite 在 Electron 打包后的 ABI／模块加载与可重建索引。
4. 中英文搜索、大笔记／附件、输入法和高 DPI 的实际行为。
5. ChatGPT 新应用订阅接入及另外两家提供商账户的真实可用性。
6. 加密转换中断、密钥恢复、历史与备份的保密性和完整性。

T01 只定义验证任务，不宣称上述能力已经通过。

## T02 实际依赖与分发声明

已安装版本及验证边界见 [T02 验证记录](t02-verification.md)。SQLite 采用 Electron 内置 node:sqlite；转换使用 marked（MIT）、turndown（MIT）；清理使用 DOMPurify（Apache-2.0 OR MPL-2.0）。准确文本以本地锁定依赖 LICENSE 和构建生成声明为准。

便携包保留 Electron 的 LICENSE／LICENSES.chromium.html、项目的 NotebookAid-LICENSE.txt，以及 Angular 构建汇总的 renderer-THIRD-PARTY-LICENSES.txt。该汇总包含 Angular、RxJS、tslib、Quill／Delta／Parchment、Lucide、DOMPurify、marked、turndown 及实际打包的工具依赖，共 18 项。T15 仍需按正式发布内容核对完整清单。

## T03-A 通知方案选型（2026-10-09，仅方案）

- 推荐 Angular CDK Overlay／A11y 作为浮层与可访问性基础，通知外观、队列和历史由项目组件实现。官方 Overlay 文档描述屏幕浮层与应用通知定位，可单独使用 CDK 的结构样式，不要求引入整套 Material 视觉主题：[官方文档源码](https://github.com/angular/components/blob/main/src/cdk/overlay/overlay.md)。这是适配当前 Angular 和主题的工程建议，尚未实测或安装。
- CDK 所属 angular/components 仓库采用 [MIT 许可证](https://github.com/angular/components/blob/main/LICENSE)，保留版权与许可声明。实施时核对与 Angular 22.2.2 的兼容版本和实际分发依赖，本轮不升级现有框架、不修改锁文件。
- 候选 AlertifyJS 的 [位置配置](https://alertifyjs.com/notifier/position.html) 支持 bottom-right；但核对时官方主分支 [LICENSE](https://github.com/MohammadYounes/AlertifyJS/blob/master/LICENSE) 为 GPLv3，官网同时提供商业授权选项。因此本项目不优先采用其当前版本，避免为已有 BSD-3-Clause 及未来发布路线增加许可选型工作。不据此推断所有旧版本或同名 alertify 库的许可证。
- 视觉交互依据用户本次提供的 ZUB Esther 截图：通知卡片、关闭、查看历史、铃铛计数、消息抽屉。未读取或复制 Esther 源码；截图不证明其内部库或数据实现。

## T03-A 实际依赖

新增并锁定 `@angular/cdk@22.2.2`，其 peerDependencies 接受 Angular 22 和当前 RxJS 7.8.2；官方 npm 元数据和本地 LICENSE 均为 MIT。未升级既有 Angular／Electron 等依赖。构建声明包含 CDK 的 Google 版权及 MIT 文本；打包时另保留 CDK-LICENSE.txt。消息历史由 NotebookAid 的独立 SQLite 存储实现，不使用外部消息服务。
