# 发布构建与支持矩阵

截至2026-10-15，提供Windows x64安装器／便携ZIP以及macOS arm64／x64 DMG／ZIP测试包，尚无正式Release。Windows 10 x64是支持目标，尚无真实环境验证；已有Windows 11本地测试及Windows Server CI检查。macOS已有双架构CI检查，实机验收范围见[macOS指南](macos-testing.md)。Thunderbird项目基线为Release 157.0.1，较新Release及ESR需单独验证。T15-A桌面New集成搁置。

## 可复现构建

Windows x64，Node 24.21.0，PowerShell，系统 .NET Framework C# 编译器；Electron 44.7.0、Angular 22.2.2、TypeScript 6.0.3、Quill 2.0.3 均沿用锁文件。新增 electron-builder 26.15.3、electron-updater 6.8.9 均 MIT。安装工具只用于构建，更新库只在有效安装配置下延迟初始化。运行依赖许可清单、前端声明和 Electron Chromium 声明随包分发。

```powershell
npm ci
npm run build
npm run test:platform
npm run package
npm run installer
.\scripts\Build-TestBundle.ps1
```

首次构建需要联网下载锁定依赖、Electron 和 NSIS 工具包；不配置远程 Git、不发布文件、不加入笔记或凭据。安装器输出在 release/installer；便携包／XPI／SHA256SUMS 在 release。源码已公开；测试下载和当前验证边界以[英文首页](../README.md)、[中文首页](../README.zh-CN.md)及[Windows CI指南](windows-ci-testing.md)为准。macOS构建命令见首页，输出在release/macos。

## 后续配置自动更新源

2026-10-16：SignPath 申请未获通过，Windows 签名暂时搁置，macOS 继续手动更新。更新构建策略集中在 `config/github-updates.json`：Windows 为 `prepare-only`、发布者为空、强制保留签名检查；macOS 为 `manual`。新增手动触发的 Windows 更新候选工作流，仅上传 Actions 测试产物，不创建 Release、不发布正式更新清单，也不启用客户端更新。操作、预留地址、候选校验和未来签名接入步骤见[GitHub 更新构建指南](github-updates.md)。此前保存的仓库变量不会自动激活更新；正式签名、在线更新和公开发布仍需后续授权与实测。

参考：[electron-builder NSIS](https://www.electron.build/nsis/)、[自动更新文档](https://www.electron.build/v26/docs/features/auto-update/)。详细验收和回滚见 [T15 验收](t15-testing.md)。
