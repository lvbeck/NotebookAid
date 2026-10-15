# macOS 测试包

0.15.5起，Windows与macOS共享纯数字版本号。每份macOS Actions测试产物内附NotebookAid.xpi、INSTALL.md及Guides/中的八语言插件安装／桥接说明，附SHA256-addon.txt校验清单。先解压Actions外层归档，再按INSTALL.md选择语言，无需另外下载Windows包。当前插件要求Thunderbird 157.0及以上，项目测试基线157.0.1；首次安装不需要兼容迁移助手。应用签名状态仍为ad-hoc，未获Apple公证。

本轮提供 Apple Silicon arm64 与 Intel x64 独立 DMG、ZIP，通过 GitHub Actions 构建；不是正式 Release。当前使用 ad-hoc 签名，没有 Developer ID 证书和 Apple 公证。Gatekeeper 可能拒绝直接打开下载包；请保留具体提示，不通过全局关闭系统安全机制解决。

DMG 内将 NotebookAid.app 拖到 Applications。ZIP 解压后也可将 app 移入 Applications。首次使用优先建立测试笔记本，不直接覆盖现有数据。笔记、配置、凭据保存在当前用户目录，应用更新不应删除这些目录。

## 功能范围

- 编辑、组织、笔记本主密码／恢复密钥、备份和 AI 凭据保护沿用共享核心。
- Windows Passkey 辅助程序不运行在 macOS。此测试版明确不支持 Passkey 应用锁；不会自动解除已有应用锁。不要将 Windows 应用锁配置复制到 macOS。笔记本主密码和加密笔记仍可使用。
- macOS 自动更新器按平台加载，但测试包没有发布源，不会请求更新。正式签名、公证和真实更新链路尚未验收。
- Thunderbird 使用当前用户的 Unix socket 桥接，不使用 Windows EXE 或注册表。

## Thunderbird 注册

安装 NotebookAid 到固定位置后，在 macOS Terminal 执行（无需另装 Node）：

```sh
ELECTRON_RUN_AS_NODE=1 /Applications/NotebookAid.app/Contents/MacOS/NotebookAid /Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs /Applications/NotebookAid.app
```

然后安装仓库对应的 NotebookAid.xpi 并测试重新连接、启动后台、打开应用、预览笔记。清单位于 `~/Library/Application Support/Mozilla/NativeMessagingHosts/`，保留现有插件 ID 与旧版别名。注册脚本拒绝覆盖其他路径的注册。移动应用前先用原路径运行上述命令并加 `--remove`，移动后重新注册；本轮不做全机器注册。

如果尚无 XPI，可在克隆的源码目录生成同版插件（macOS Terminal）：

```sh
mkdir -p release
(cd thunderbird && zip -r ../release/NotebookAid.xpi .)
```

## 验证与限制

Actions 运行跨平台核心测试、应用架构核对、签名结构核对、隔离笔记本编辑和重启检查。Windows 专用安装器、注册表、进程／原生 EXE 测试不会冒充 macOS 测试。真实 Thunderbird、Keychain 授权、AI 登录、打印、高 DPI 和 Gatekeeper 安装交互仍需实机人工验收。

两个构建产物名称分别为 `NotebookAid-macos-arm64-test` 和 `NotebookAid-macos-x64-test`，包含 DMG、ZIP、SHA256；测试证据单独上传。工作流权限仅 `contents: read`，不创建 Release。回滚时恢复上一版 app，保留用户数据；数据维护或迁移前另外备份笔记本。

## 本轮实际验证

2026-10-14，源码提交 `26d39f8` 的 [GitHub Actions 运行](https://github.com/lvbeck/NotebookAid/actions/runs/38622102289) 成功：macos-15 arm64 和 macos-15-intel x64 均通过255项跨平台核心测试、打包后应用的签名结构／架构核对、八语言界面、编辑及两进程重启检查。Mac Native Messaging 代码通过当前用户权限、分帧／认证及篡改端点拒绝测试；这不代表真实 Thunderbird 已验收。四个DMG／ZIP已上传到该运行的Artifacts，保留30天；下载后的四个SHA256与构建清单一致。

Windows本地构建、安装器／注册迁移核心检查及打包版八语言界面、编辑、重启检查通过。首次Windows全量264项检查有260通过、3个写入／进程中断夹具失败、1个macOS专项跳过；三个失败用例独立重跑均通过，未为此改动共享核心。旧默认全量界面检查发现开发信息条缺失的测试假设，已修正；最终采用当前界面和编辑专项验证，没有将首次全量运行描述为全通过。

首次云端干净安装揭示锁文件遗漏peer构建依赖，已在隔离目录补齐21个锁定条目并确认已有依赖版本未变，项目显式关闭legacy-peer-deps，不修改其他项目或全局npm配置。后续两个测试假设分别按macOS未配置更新源状态和lipo的x86_64架构名称修正，最终双架构运行成功。真实用户安装、Gatekeeper、Thunderbird、Keychain和真实AI连接尚待人工验收，不创建正式Release，不标记产品发布或本轮功能验收完成。
