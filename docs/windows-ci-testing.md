# Windows GitHub Actions 测试包

[Windows test packages](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) 在相关源码推送到 main 或手动 Run workflow 时构建 Windows x64 NSIS 安装器、便携 ZIP 和两个 Thunderbird XPI。使用固定版本 Node.js、锁定依赖和官方 Actions SHA；沿用现有打包脚本及许可证，不创建 GitHub Release、不配置正式更新源。

工作流检查核心测试、成品 SHA256、ZIP 路径和关键资源、实际打包界面／编辑器，以及独立运行器上的当前用户安装、重装、卸载。成功运行的 `NotebookAid-windows-x64-test` Artifacts 保存30天；界面及安装验证报告保存14天。下载后解压 Actions 的外层归档，安装器位于 installer 子目录，便携 ZIP 和校验清单位于归档根目录。

安装器目前未签名，仅供测试。云端 Windows Server 2022 检查不能替代 Windows 10／11 高 DPI、管理员所有用户安装、真实 Thunderbird、Passkey 与在线签名更新实测。便携版解压后运行 NotebookAid.exe；回退使用此前保留的版本包，程序回退不还原个人数据，测试前保留笔记本备份。

## 后续使用 GitHub 作为 Windows 更新源

当前实现采用 HTTPS generic feed，可在签名构建环境中设置：

```powershell
$env:NOTEBOOKAID_UPDATE_URL = 'https://github.com/lvbeck/NotebookAid/releases/latest/download/'
$env:NOTEBOOKAID_UPDATE_PUBLISHER = 'Exact certificate publisher name'
# Configure the actual signing certificate using protected CI secrets first.
npm run installer
```

发布者名称必须与实际 Windows 代码签名证书一致；证书和密码只放受保护的 GitHub Secrets，不提交源码。设置更新地址后构建要求代码签名；仅填写发布者字符串不能代替签名证书。

正式稳定版 Release 需要上传同一次签名构建的安装 EXE、对应 .blockmap 和 latest.yml。地址指向更新目录而不是仓库主页、单个 EXE 或 Actions Artifacts。首次需要手动安装包含更新源配置的新版，后续安装版才能检查更新；便携版继续手动更新。现有测试版本带预发布版本号，不能当作稳定发布渠道；此处只记录配置方案，尚未执行正式发布或签名在线更新测试。

更新文件与签名要求依据 [electron-builder 26 自动更新说明](https://www.electron.build/v26/docs/features/auto-update/)。
