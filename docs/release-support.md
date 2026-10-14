# 发布构建与支持矩阵

0.15.0-t15.0 为待验收测试版本。Windows 10 x64 是支持目标，尚无真实环境验证；Windows 11 Pro build 26300 是当前测试环境。Thunderbird 最低 Release 157.0.1 及较新 Release 的真实安装联调仍待用户测试。T15-A 桌面 New 集成搁置，不包含在发布范围。

## 可复现构建

Windows x64，Node 24.21.0，PowerShell，系统 .NET Framework C# 编译器；Electron 44.7.0、Angular 22.2.2、TypeScript 6.0.3、Quill 2.0.3 均沿用锁文件。新增 electron-builder 26.15.3、electron-updater 6.8.9 均 MIT。安装工具只用于构建，更新库只在有效安装配置下延迟初始化。运行依赖许可清单、前端声明和 Electron Chromium 声明随包分发。

```powershell
npm ci
npm run build
npm test
npm run package
.\scripts\Build-TestBundle.ps1
npm run installer
.\scripts\Build-TestBundle.ps1
```

首次构建需要联网下载锁定依赖、Electron 和 NSIS 工具包；不配置远程 Git、不发布文件、不加入笔记或凭据。安装器输出在 release/installer；便携包／XPI／SHA256SUMS 在 release。源码以本地仓库和附带构建说明为准，不将未发布的仓库称为已公开可访问项目。

## 后续配置自动更新源

用户尚未提供发布地址。正式构建时配置 `NOTEBOOKAID_UPDATE_URL` 为 HTTPS 目录，`NOTEBOOKAID_UPDATE_PUBLISHER` 为签名证书的实际发布者；代码签名通过 electron-builder 支持的证书环境变量提供，不将私钥写入源码或日志。配置更新源后构建强制代码签名，没有证书应失败。保留并上传安装器、blockmap 和 latest.yml（稳定发布）到指定目录；上传属于后续显式发布授权，构建本身不会上传。当前测试包不提供真实在线更新承诺。

参考：[electron-builder NSIS](https://www.electron.build/nsis/)、[自动更新文档](https://www.electron.build/v26/docs/features/auto-update/)。详细验收和回滚见 [T15 验收](t15-testing.md)。
