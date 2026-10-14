# Windows GitHub Actions 测试包

[Windows test packages](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) 在相关源码推送到 main 或手动 Run workflow 时构建 Windows x64 NSIS 安装器、便携 ZIP 和两个 Thunderbird XPI。使用固定版本 Node.js、锁定依赖和官方 Actions SHA；沿用现有打包脚本及许可证，不创建 GitHub Release、不配置正式更新源。

工作流检查核心测试、成品 SHA256、ZIP 路径和关键资源、实际打包界面／编辑器，以及独立运行器上的当前用户安装、重装、卸载。成功运行的 `NotebookAid-windows-x64-test` Artifacts 保存30天；界面及安装验证报告保存14天。下载后解压 Actions 的外层归档，安装器位于 installer 子目录，便携 ZIP 和校验清单位于归档根目录。

安装器目前未签名，仅供测试。云端 Windows Server 2022 检查不能替代 Windows 10／11 高 DPI、管理员所有用户安装、真实 Thunderbird、Passkey 与在线签名更新实测。便携版解压后运行 NotebookAid.exe；回退使用此前保留的版本包，程序回退不还原个人数据，测试前保留笔记本备份。

## 后续使用 GitHub 作为 Windows 更新源

当前实现采用 HTTPS generic feed，可在签名构建环境中设置：

已按用户要求将上述 GitHub Releases 更新目录保存为仓库变量 `NOTEBOOKAID_UPDATE_URL`。当前测试工作流不读取该变量，也不将未签名产物设为有效更新源；签名服务获批并配置后再传入签名构建。仓库变量本身不会修改已安装应用的更新配置。

```powershell
$env:NOTEBOOKAID_UPDATE_URL = 'https://github.com/lvbeck/NotebookAid/releases/latest/download/'
$env:NOTEBOOKAID_UPDATE_PUBLISHER = 'Exact certificate publisher name'
# Configure the actual signing certificate using protected CI secrets first.
npm run installer
```

发布者名称必须与实际 Windows 代码签名证书一致；证书和密码只放受保护的 GitHub Secrets，不提交源码。设置更新地址后构建要求代码签名；仅填写发布者字符串不能代替签名证书。

正式稳定版 Release 需要上传同一次签名构建的安装 EXE、对应 .blockmap 和 latest.yml。地址指向更新目录而不是仓库主页、单个 EXE 或 Actions Artifacts。首次需要手动安装包含更新源配置的新版，后续安装版才能检查更新；便携版继续手动更新。现有测试版本带预发布版本号，不能当作稳定发布渠道；此处只记录配置方案，尚未执行正式发布或签名在线更新测试。

更新文件与签名要求依据 [electron-builder 26 自动更新说明](https://www.electron.build/v26/docs/features/auto-update/)。

GitHub 的 [Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) 提供构建来源证明，不能代替 Windows Authenticode 签名。免费开源签名可申请 [SignPath Foundation](https://signpath.org/)；需审核，条件包括已有可下载软件、开源许可、维护者多因素认证及每次签名的人工批准，详见 [官方条件](https://signpath.org/terms.html)。NotebookAid 尚未申请获批、未接入该服务，不承诺新项目符合审核条件。此轮不创建正式 Release 或提交签名申请。

## 实际交付结果

源码7015309的 [运行38626804424](https://github.com/lvbeck/NotebookAid/actions/runs/38626804424) 全部成功：264项核心测试中263通过、0失败、1项macOS专用测试跳过；打包界面八语言与重启、编辑器格式检查，以及当前用户安装、重装和卸载通过。管理员所有用户模式、高DPI与在线签名更新未实测。

版本0.15.4-mac.0的测试安装器、便携ZIP、两个XPI和校验清单已上传Artifacts并下载到本地 `release/windows-tests/0.15.4-mac.0/38626804424`，五个成品SHA256均一致。Windows安装器未签名，GitHub Release数量仍为0。安装器SHA256为 `d0062158b3af4d8a5515ca9ce4e313046158950603ee0c9e4e28ba5bac66dbfc`，便携ZIP为 `ccc1f42831aa9674c3e9464a75df00d1a067e6b9a3b066639487f8af94d43e11`。

通过既有Prepare-TestPortable.ps1授权更新便携测试目录：verified=true、backupCreated=false、bridgeManifestsRestored=2，不强制停止进程、不保留解压暂存副本。此前0.15.3-t15.3 ZIP保留供回退；个人数据不作回退。当前等待用户验收，免费签名服务获批和正式更新发布另行完成。
