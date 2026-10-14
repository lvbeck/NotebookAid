# macOS 测试包

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

## 验证与限制

Actions 运行跨平台核心测试、应用架构核对、签名结构核对、隔离笔记本编辑和重启检查。Windows 专用安装器、注册表、进程／原生 EXE 测试不会冒充 macOS 测试。真实 Thunderbird、Keychain 授权、AI 登录、打印、高 DPI 和 Gatekeeper 安装交互仍需实机人工验收。

两个构建产物名称分别为 `NotebookAid-macos-arm64-test` 和 `NotebookAid-macos-x64-test`，包含 DMG、ZIP、SHA256；测试证据单独上传。工作流权限仅 `contents: read`，不创建 Release。回滚时恢复上一版 app，保留用户数据；数据维护或迁移前另外备份笔记本。
