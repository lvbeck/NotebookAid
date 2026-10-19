# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**本機筆記與 AI 寫作助手**

*本地記錄，從容思考，智能迴響。*

NotebookAid 是開源桌面筆記應用程式，提供可選的 Thunderbird 附加元件。筆記本保存在你選擇的本機資料夾。只有你主動產生內容時，AI 寫作、摘要及翻譯才會向所選供應商傳送筆記文字。

## 功能

- **支援 MCP，可透過 AI Agent 新增筆記**：Codex 等 AI Agent 可透過本機 MCP（Model Context Protocol）連接在背景執行的 NotebookAid，在使用者明確授權的筆記本資料夾中新增 TXT／Markdown 筆記。[設定與授權範圍](docs/mcp-final-testing.md)。
- 支援 Markdown、HTML 安全子集的豐富文字編輯、TXT 及原生 Quill Delta；未支援的內容以原始碼模式保護。
- 多筆記本、子資料夾、搜尋、標籤、置頂、最近使用、附件、自動儲存、版本歷程及回收站。
- 可選的筆記加密、獨立主密碼及復原金鑰、備份還原，以及 Windows Passkey 應用程式鎖。
- 筆記本顏色與封面、淺色／深色／跟隨系統主題，以及十種介面語言：英語、簡體中文、繁體中文（香港）、德語、法語、意大利語、西班牙語、葡萄牙語（葡萄牙）、日語和韓語。另提供新手引導及可關閉的彩蛋收集。
- Thunderbird 透過本機 Native Messaging 橋接整合；可從 ICS 匯入 Tasks。
- AI 為可選功能：ChatGPT 訂閱登入、Gemini 或 Claude API Key。使用資格受供應商條款限制，不會自動切換供應商或收費渠道。

## 近期本機更新


- 檢視支援連續版面、A4 風格分頁、就地摺疊及目錄與內文。Markdown 的 # 標題與 TXT 的縮排 - 清單可建立大綱，不會重寫筆記內文。就地摺疊為唯讀檢視，可選擇「編輯內文」；目錄與內文保留原編輯區。
- 修正深色模式下編輯區置頂列左右兩側的遮蓋邊界。十種筆記本外觀隨目前筆記本及深淺主題自動切換，紫色預設重新命名為「極光紫」。
- 新筆記預設為 TXT；統一匯出選單、PDF 匯出與 Windows 原生列印集中相關操作。進階搜尋支援關鍵字 AND/OR、資料夾與子資料夾範圍、標籤及置頂篩選。
- 筆記本獨立設定隨筆記本儲存；整本 .nabook 匯入匯出保留內文、歷史及安全設定。
- 目前使用者登入時自動啟動可選視窗或背景模式，預設關閉；實際登出／登入與實體 macOS 行為仍需手動驗證。
- 本機 Codex MCP 外掛可在一個明確授權的資料夾建立 TXT／Markdown 筆記，提供擁有者確認、範圍授權及本機用戶端憑證加密。應用程式鎖可能要求互動式 Passkey 驗證，不會自動向 AI 提交內文。

[大綱測試與回復](docs/outline-testing.md).

本機後續版本 0.15.23 新增 Markdown 分隔線及 H4/H5/H6 富文字編輯、工具列操作和原始碼往返檢查。已通過使用者驗收，請參閱[測試與回復](docs/markdown-blocks-testing.md)。

本機 0.15.23 為 Markdown 新增離線 KaTeX 公式：行內 `$…$`／`\(…\)` 與區塊 `$$…$$`／`\[…\]`。按一下公式可編輯 LaTeX 原始碼並預覽，也可從現有工具列插入；Markdown 保留原始碼，支援復原、重做及 PDF 公式輸出。授權清單包含 KaTeX、隨附字型及依賴聲明。已通過使用者驗收，請參閱[公式測試與回復](docs/math-testing.md)。

## 下載

[下載 NotebookAid 0.15.23（Windows 及 macOS）](https://github.com/lvbeck/NotebookAid/releases/tag/v0.15.23)。安裝套件及 SHA256 核對清單附於發佈頁面。Windows 安裝程式未簽署；macOS 使用 ad-hoc 簽署，未經公證。自動更新仍未啟用。下方 CI 連結指向最新驗證通過的 0.15.23 建置。

- [EXE 安裝程式／可攜式 ZIP 0.15.23](https://github.com/lvbeck/NotebookAid/actions/runs/39331265549/artifacts/12225042339): `NotebookAid-windows-x64-test`.
- [原生 MSI 安裝程式 0.15.23](https://github.com/lvbeck/NotebookAid/actions/runs/39331265549/artifacts/12223624925): `NotebookAid-windows-x64-msi-test`.
- [macOS 安裝檔 0.15.23](https://github.com/lvbeck/NotebookAid/actions/runs/39331265250) ([arm64](https://github.com/lvbeck/NotebookAid/actions/runs/39331265250/artifacts/12224442881) / [x64](https://github.com/lvbeck/NotebookAid/actions/runs/39331265250/artifacts/12224908114)): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## 安裝及限制

先解壓外層測試產物 ZIP。EXE 和 MSI 是獨立產物，支援目前使用者或所有使用者安裝；切換類型前先解除安裝另一類型。應用程式名稱保持 NotebookAid。MSI 提供十語言選擇，簡體中文預設使用微軟雅黑。

macOS 分別提供 Apple Silicon arm64 和 Intel x64 的 DMG、ZIP，另附 NotebookAid.xpi 及十語言安裝橋接指南。DMG／ZIP 沒有 Windows 式安裝精靈。

套件產物保留 30 日，驗證報告保留 14 日；到期後請選較新的成功執行記錄。測試前備份筆記本；替換程式檔案不能代替資料還原。

## 簽署、更新與私隱

Windows 測試套件尚未簽署，SignPath Foundation 申請未獲通過，Windows 簽署暫時擱置，自動更新仍未啟用。Chrome 可能攔截下載；不能僅憑未簽署就斷定是誤報。請保留警告並核對來源和 SHA256，不要停用整體防護。

macOS 使用臨時簽署，沒有 Developer ID 簽署或 Apple 公證。真正的 Mac、Thunderbird、Keychain 及 AI 帳戶仍需實機驗證；此 macOS 測試版不支援 Passkey 應用程式鎖。Windows 10 也仍需實機驗證。

目前測試套件沒有啟用自動更新源。MSI 使用獨立的 GitHub latest-msi.json 簽署更新渠道，經確認後執行 Windows Installer；不會安裝 NSIS 更新。Actions 產物不是更新源。AI 登入、模型查詢及授權續期可連線，筆記內容僅於主動產生時傳送。

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## 從原始碼執行與打包

使用 Node.js 24.x（至少 24.15；CI 使用 24.21.0）。Windows 另需 PowerShell 和 .NET Framework C# 編譯器；原生 MSI 另需 Visual C++ x64 建置工具及 Windows SDK。macOS 套件須在 macOS 建置。

```sh
npm ci
npm run build
npm run test:platform
npm start
```

Windows PowerShell:

```powershell
npm run package
npm run installer
npm run installer:msi
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

`release/installer` · `release/msi` · `release/`

macOS Terminal (Apple Silicon: arm64; Intel: x64):

```sh
node scripts/create-macos-icon.cjs
npm run package:mac -- arm64
npm run installer:mac -- arm64
node scripts/build-macos-addon.cjs
```

`release/macos`

## 文件與開發

主要技術與驗收文件仍為中文。使用 Electron、TypeScript、Angular/CDK、Quill 2.x、SQLite、Native Messaging 和 Lucide。實際版本以鎖定檔為準。技術文件內的歷史狀態不代表已驗收；Windows 檔案總管新建選單仍擱置，Gemini Notebook 同步仍屬後續範圍。

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## 授權與聯絡

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
