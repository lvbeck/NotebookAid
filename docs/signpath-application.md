# SignPath Foundation 申请资料

准备日期：2026-10-14。状态：申请文本供用户填写；配套政策与隐私声明已获用户授权公开，未提交表单、未获批、未签名、未正式发布。内容已核对官方当前表单和条款，资格由 SignPath 决定。

## 具体申请步骤

1. 打开 [官方申请表](https://signpath.org/apply)，阅读 [条件与 Code of Conduct](https://signpath.org/terms.html)。当前使用网页申请，不需要向猜测的邮箱发送邮件。
2. 确认 GitHub 与后续 SignPath 账户的多因素认证。尚未确认时不要声称已启用。
3. 按下表填写。隐私声明与签名政策随本轮源码上传；填写时确认下面的GitHub链接可打开。
4. 下载地址暂用成功的 Actions 运行，注明需 GitHub 登录、保留30天、并非正式 Release。官方要求项目已有可下载软件且信誉可核实，是否接受测试产物需要审核方确认，不保证新项目获批。本次不创建稳定版或预发布 Release。
5. 申请人核对真实姓名、维护者类型、信誉说明及条款。由用户决定必需的条款与资料处理同意；可不勾选非必要营销通讯。验证码和最终 Submit 由用户完成。
6. 留意申请邮箱通知。没有已核实的固定审核时长；如审核方要求公开下载或更多信誉证据，先评估再决定后续步骤。

## 表单字段

下表英文可直接复制。Category、Maintainer Type、Build System 已核对当前选项。姓名来自源码作者，申请人最终确认。

| 字段 | 建议内容 |
| --- | --- |
| Project Name * | NotebookAid |
| Repository URL * | https://github.com/lvbeck/NotebookAid |
| Homepage URL * | https://github.com/lvbeck/NotebookAid |
| Download URL | https://github.com/lvbeck/NotebookAid/actions/runs/38626804424 （仅临时测试产物） |
| Privacy Policy URL | https://github.com/lvbeck/NotebookAid/blob/main/docs/privacy.md |
| Wikipedia URL | 留空，没有已核实的条目 |
| Tagline * | A local-first notebook and writing assistant with optional, user-initiated AI assistance. |
| Category * | Productivity |
| Description * | 复制下面 Description |
| Reputation * | 复制下面 Reputation，不编造采用量或媒体报道 |
| Maintainer Type | Individual maintainer(s)，若确为个人维护 |
| Build System * | GitHub Actions |
| First Name * | Jin，申请人确认 |
| Last Name * | Lu，申请人确认 |
| Email * | it@live.cn，确认能收取申请和账户邮件 |
| Company Name | 个人项目可留空；不从插件ID或邮箱推断雇主 |
| Primary Discovery Channel * | 选择对应实际来源的当前选项，例如 AI assistant 或 Other |
| Exact source | ChatGPT assisted with researching the official SignPath Foundation website. |

### Description

NotebookAid is an open-source desktop notebook and writing assistant. It stores notebooks locally and provides editing, organization, optional encryption, backup and recovery, and integration with Thunderbird. AI assistance is optional: users choose a provider and explicitly request writing, summarization or translation. The project is intended for personal note-taking and does not provide vulnerability exploitation tools or security bypass features. Its source code is published under the BSD-3-Clause license.

### Reputation

NotebookAid is an early-stage project maintained by Jin Lu (GitHub: lvbeck). Its public repository was created on 14 October 2026. It does not yet have independently verified adoption statistics, media coverage or a formal public release, and we do not claim established reputation.

The source code, license, build workflows and test evidence are publicly available:

- Repository: https://github.com/lvbeck/NotebookAid
- License: https://github.com/lvbeck/NotebookAid/blob/main/LICENSE
- Windows workflow: https://github.com/lvbeck/NotebookAid/blob/main/.github/workflows/windows-build.yml
- Successful Windows build: https://github.com/lvbeck/NotebookAid/actions/runs/38626804424
- Successful macOS build: https://github.com/lvbeck/NotebookAid/actions/runs/38622102289

The Windows CI run completed 263 core tests with no failures, with one macOS-only test skipped, plus packaged UI/editor checks and current-user installation, reinstallation and uninstallation checks. These are automated checks, not independent user adoption or a security audit.

Unsigned Windows installer and portable ZIP test artifacts are available from the Windows run for 30 days and require GitHub sign-in to download. We have not created a formal GitHub Release. Please advise whether these test artifacts meet your existing-download requirement and whether this early-stage project is eligible, or which additional evidence is needed.

## 后续审核回复草稿

当前表单没有独立通用补充说明栏；以下英文用于审核方追问时回复。

We request Windows Authenticode signing for NotebookAid's installer and eligible application-owned executable files built from this repository using GitHub Actions. The application uses Electron; original third-party runtime binaries retain their upstream licenses and must not be re-signed under our project's certificate. We will agree the exact signing scope and artifact configuration with SignPath before enabling signing.

Signing is not integrated yet. We understand that the Foundation certificate identifies SignPath Foundation as publisher, and that each signing request requires manual approval. We will not enable unattended signing or publish a formal release before the required review and maintainer approval.

The three native helper executables now obtain consistent product/version metadata from the project version at build time. Signing scope and final packaged metadata still require SignPath review. Packaging integrity inventories, updater manifests and downloadable checksums must reflect the final signed bytes. We will complete and test that integration after approval.

Optional AI authentication, model checks and generation contact the provider selected by the user. After authorization, token renewal can run automatically while the app is running and unlocked. Future signed installed builds may check the configured update source automatically when update checking is enabled. Current unsigned test packages have no active update feed. We do not claim that the application never accesses the network.

## 已确认事实与待补项

| 项目 | 当前证据或状态 |
| --- | --- |
| 源码与许可 | GitHub public，BSD-3-Clause，作者 Jin Lu，联系 it@live.cn |
| 项目信誉 | 公开仓库创建于2026-10-14；当次API为0 stars、0 forks，不将此作为长期事实或信誉证明 |
| 下载要求 | 仅有临时 Actions Artifacts，无正式Release；是否满足条件待审核确认 |
| 签名政策 | 英文 [签名政策](code-signing-policy.md)，本轮授权公开；签名服务尚未启用 |
| 隐私声明 | 英文 [隐私声明](privacy.md)，本轮授权公开；应用已有隐私对话框 |
| MFA与角色 | 维护者确认MFA；拟由lvbeck担任作者、审核者、签名批准者，不声称已在SignPath配置 |
| EXE元数据 | 三个原生辅助EXE统一产品名NotebookAid，产品版本跟随package.json，当前0.15.4-mac.0；数字文件／程序集版本0.15.4.0，已实际编译读取验证 |
| 依赖合规 | 既有包保留第三方许可，本次未完成完整依赖许可或二进制来源审计，需按审核要求补充 |
| 更新源 | 地址已保存于GitHub仓库变量NOTEBOOKAID_UPDATE_URL，不在应用设置文件中；当前测试工作流未使用，自动更新未启用 |
| 证书发布者 | 获批后以实际证书名称配置，不猜填Jin Lu；Foundation证书发布者为SignPath Foundation |

## 获批后的技术顺序（尚未执行）

1. 核对获准文件范围、二进制来源、许可证和元数据，保护main及审批流程；凭据放GitHub Secrets。
2. 原生EXE元数据已补齐；接入签名时继续核对SignPath配置要求和全部获准产物的版本一致性。
3. 先签获准应用文件，再生成安装完整性清单，再构建并签安装器。签名改变字节，不能沿用签名前SHA256。
4. 从最终签名安装器生成正确SHA512、大小和blockmap，验证签名、安装／重装／卸载、发布者校验和更新。具体接入方式需核对，不能简单在现有构建末尾签EXE。
5. 配置实际签名发布者和更新目录，先交付签名测试包；正式Release需用户另行授权。

资料来源：[官方表单](https://signpath.org/apply)、[免费服务](https://signpath.org/)、[条件](https://signpath.org/terms.html)。以实际提交时官网为准。
