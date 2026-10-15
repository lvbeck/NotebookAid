# NotebookAid macOS — Thunderbird 安装与桥接

[English](README.en-US.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

## 安装应用与插件

1. Apple M 系列选择arm64，Intel选择x64。打开DMG，将NotebookAid.app拖入/Applications，然后启动一次。测试应用只有ad-hoc签名，没有Developer ID签名或Apple公证；如被系统阻止，请保留具体提示，不要全局关闭安全保护。
2. 在Thunderbird中打开“附加组件和主题”→齿轮菜单→“从文件安装附加组件”，选择同一测试产物内的NotebookAid.xpi，无需另外下载Windows包。不要解压XPI。首次安装不需要兼容迁移助手。
3. 插件要求Thunderbird 157.0及以上；项目测试基线为157.0.1，不覆盖更旧的ESR版本。

## 注册本地桥接

应用安装到上述路径后，在macOS“终端”执行。无需额外安装Node.js，也不需要sudo：

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

预期输出：

    NotebookAid bridge registered for the current user.

脚本在~/Library/Application Support/Mozilla/NativeMessagingHosts/写入当前用户的注册文件，不配置网络端口或系统服务。

## 连接与排查

完全退出并重开Thunderbird，启动NotebookAid并打开测试笔记本，再点击插件中的Reconnect／重新连接。Open app／打开应用和Start background／启动后台可按需启动本地应用。

注册在重启电脑后仍保留；同路径更新通常无需重新注册。移动应用前，应在旧应用仍存在时执行相同命令并在末尾加上--remove，再从新位置注册。如安装路径不同，请对应修改命令中的三个应用路径。已有注册属于其他位置时脚本会拒绝覆盖，请保留错误，不要盲目删除注册文件。

若仍未连接，请核对Thunderbird版本、安装路径，重启两个应用并保留终端和插件错误文字。此macOS测试版不支持Passkey应用锁，不要复制Windows应用锁设置；笔记本加密仍可使用。真实Thunderbird联调仍待用户测试。

归档内含SHA256校验清单、DMG／ZIP和插件。这些是测试产物，不是正式发布，自动更新尚未启用。

## Windows 测试下载

[EXE 安装器](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml)：`NotebookAid-windows-x64-test`。[原生 MSI](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml)：`NotebookAid-windows-x64-msi-test`。登录后选择成功的运行下载。MSI 支持当前用户和所有用户安装，名称固定为 NotebookAid，使用独立的 GitHub 签名更新渠道；当前未签名测试包未启用更新源。见 [MSI 说明](../msi-testing.md)。
