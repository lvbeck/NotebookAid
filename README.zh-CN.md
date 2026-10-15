# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md)

**AI 笔记与写作助手**

*本地记录，从容思考，智能回响。*

NotebookAid 是开源桌面笔记应用，可选配 Thunderbird 插件。笔记本保存在用户选择的本地目录中；AI 写作、摘要和翻译仅在用户主动请求生成时，将笔记文字发送给所选提供商。

## 功能

- Markdown、HTML 安全子集富文本编辑，TXT 纯文本及 Quill Delta 原生笔记；不支持的内容保留在源码模式中，避免丢失。
- 多笔记本、嵌套文件夹、搜索、标签、置顶、最近使用、附件、自动保存、历史版本和回收站。
- 可选笔记加密、笔记本主密码和恢复密钥、备份恢复，以及 Windows Passkey 应用锁。
- 笔记本颜色与封面、浅色／深色／跟随系统主题、八种界面语言、新手引导和可关闭的彩蛋收集。
- 通过本地 Native Messaging 与 Thunderbird 集成，并支持从 ICS 文件导入 Tasks。
- 可选 AI 辅助：ChatGPT 订阅登录、Gemini API Key、Claude API Key。实际访问受提供商账户资格和服务条款约束，不自动切换提供商或计费渠道。

## 测试下载

项目目前处于测试阶段，尚未发布正式 GitHub Release。

| 平台 | 产物 | 最新已验证测试构建 | 工作流 |
| --- | --- | --- | --- |
| Windows x64 | NSIS 安装器、便携 ZIP、Thunderbird XPI 和 SHA256 校验清单 | [Windows 测试构建](https://github.com/lvbeck/NotebookAid/actions/runs/38630850263) | [Windows 构建](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) |
| macOS Apple Silicon／Intel | 独立 arm64、x64 DMG／ZIP 和 SHA256 校验清单 | [macOS 测试构建](https://github.com/lvbeck/NotebookAid/actions/runs/38630850387) | [macOS 构建](https://github.com/lvbeck/NotebookAid/actions/workflows/macos-build.yml) |

登录 GitHub，打开成功的运行记录，在 **Artifacts** 区域下载：

- Windows：`NotebookAid-windows-x64-test`。
- macOS：`NotebookAid-macos-arm64-test` 或 `NotebookAid-macos-x64-test`。

程序测试产物保留 **30 天**。旧运行过期后，请在工作流页面寻找新的成功构建。验证报告为独立产物，保留14天。

先解压 Actions 下载的外层归档。Windows 归档的 `installer` 目录中是安装器，另有便携 ZIP 和两个插件 XPI；便携 ZIP 需再次解压，再运行 `NotebookAid.exe`。macOS 请选择对应处理器架构的安装包。测试前请备份笔记本；替换程序文件不等于恢复数据。

## 平台状态与限制

| 平台 | 当前状态 |
| --- | --- |
| Windows 11 x64 | 已有本地测试及 Windows CI 检查。安装器支持当前用户和所有用户安装；管理员所有用户安装及完整高 DPI 场景仍需人工验证。 |
| Windows 10 x64 | 产品支持目标，尚未在真实 Windows 10 机器上验证。 |
| macOS arm64／x64 | CI 构建和打包后界面／编辑器检查通过。真实安装、Thunderbird、Keychain 及真实 AI 账户联调仍待验收。此 macOS 测试版不支持 Passkey 应用锁，不会自动解除已有应用锁。 |
| Linux | 当前未提供打包测试版本。 |

Thunderbird 当前项目基线为 Release 157.0.1；较新 Release 和 ESR 需要单独验证兼容性。详细检查、安装及回退方式见 [Windows CI 指南](docs/windows-ci-testing.md) 和 [macOS 指南](docs/macos-testing.md)。

## 签名、更新与隐私

- **Windows 测试包未签名。** 维护者已提交 SignPath Foundation 申请，正在等待审核；尚未获批或启用签名。
- macOS 测试应用使用 ad-hoc 签名，没有 Developer ID 签名及 Apple 公证。Gatekeeper 可能阻止打开，请勿为运行测试包而全局关闭系统安全机制。
- 已实现更新机制，但当前测试包没有启用自动更新源。GitHub 更新地址留待后续签名发布使用；Actions 测试产物不是更新源。
- AI 认证、模型检查及已授权的令牌续期可能访问所选提供商。笔记文字仅在明确请求生成时发送；本地存储不代表应用始终离线。

公开说明：[Code signing policy](docs/code-signing-policy.md)、[Privacy statement](docs/privacy.md)（英文）。

## 从源码运行

使用 Node.js **24.x**，最低24.15；CI 使用 **24.21.0**。依赖版本锁定于 `package-lock.json`。Windows 构建还需 PowerShell 和 Windows .NET Framework C# 编译器；macOS 安装包需在 macOS 上构建。

在仓库根目录执行：

```sh
npm ci
npm run build
npm run test:platform
npm start
```

## 构建测试包

Windows PowerShell：

```powershell
npm run package
npm run installer
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

产物写入 `release/installer` 和 `release/`。打包脚本生成便携 ZIP、Thunderbird 插件和校验清单，详见 [Windows 构建指南](docs/windows-ci-testing.md)。

macOS Terminal，在对应架构机器上执行，Intel 将 `arm64` 改为 `x64`：

```sh
node scripts/create-macos-icon.cjs
npm run package:mac -- arm64
npm run installer:mac -- arm64
```

产物写入 `release/macos`。上述命令只生成测试包，不正式发布。构建目录可能重建，请勿在 `dist/`、`release/` 或 `output/` 中保存个人笔记本。

## 文档与开发历史

技术说明及验收文档目前以简体中文为主。英文首页不代表所有链接文档均已翻译。

技术路线为 Electron、TypeScript、Angular/CDK、Quill 2.x、SQLite、Native Messaging 和 Lucide；准确依赖版本以锁文件为准。

| 文档 | 用途 |
| --- | --- |
| [需求规格](docs/requirements.md) | 已确认功能、边界和后续范围 |
| [架构](docs/architecture.md)、[数据模型](docs/data-model.md)、[接口契约](docs/api-contract.md) | 设计及共享本地核心 |
| [界面线框](docs/wireframes.md) | 界面规划 |
| [实施计划](docs/implementation-plan.md) | 权威任务进度和验收记录 |
| [验收清单](docs/acceptance.md)、[测试历史索引](docs/testing-history.md) | 当前及历史验证指南 |
| [来源与依赖许可](docs/sources-and-licenses.md) | 第三方依赖及声明 |
| [项目工作约定](AGENTS.md) | 开发范围和协作约定 |

历史任务状态和仅在本地保留的包路径不再作为首页下载入口。Windows 资源管理器“新建”菜单集成继续搁置；Gemini Notebook 同步属于后续范围。自动检查不能代替用户验收或上述待完成的人工验证。

## 许可证与联系

[BSD-3-Clause](LICENSE)。Copyright © 2026 Jin Lu。第三方组件保留各自的许可证。

联系邮箱：[it@live.cn](mailto:it@live.cn)。
