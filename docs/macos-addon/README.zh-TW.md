# NotebookAid macOS — Thunderbird 安裝與橋接

[English](README.en.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md) | [Português (Portugal)](README.pt-PT.md)

## 安裝應用程式與附加元件

1. Apple M系列選擇arm64，Intel選擇x64。開啟DMG，將NotebookAid.app拖到/Applications並啟動一次。測試版只有ad-hoc簽章，沒有Developer ID簽章或Apple公證；如被系統阻擋，請保留提示，不要全域關閉安全保護。
2. 在Thunderbird開啟「附加元件與佈景主題」→齒輪選單→「從檔案安裝附加元件」，選擇本測試產物內的NotebookAid.xpi，毋須另下載Windows套件。不要解壓縮XPI。首次安裝不需要相容性遷移助手。
3. 需要Thunderbird 157.0或以上；專案測試基準為157.0.1，不涵蓋較舊ESR版本。

## 註冊本機橋接

安裝到上述位置後，在macOS「終端機」執行。毋須額外安裝Node.js，也不用sudo：

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

預期輸出：

    NotebookAid bridge registered for the current user.

註冊檔案位於~/Library/Application Support/Mozilla/NativeMessagingHosts/，只影響目前使用者，不設定網絡連接埠或系統服務。

## 連線與排解問題

完全結束並重新開啟Thunderbird，啟動NotebookAid並開啟測試筆記本，再按Reconnect／重新連線。Open app及Start background可按需要啟動本機應用程式。

重新啟動電腦後註冊仍然保留，同路徑更新通常毋須重新註冊。移動應用程式前，在舊應用程式仍存在時執行相同指令並在末尾加上--remove，再從新位置註冊。如路徑不同，請修改指令內全部三個應用程式路徑。其他路徑的既有註冊會被拒絕覆寫，請保留錯誤，不要盲目刪除註冊檔案。

如仍未連線，核對Thunderbird版本、安裝路徑，重新啟動兩個應用程式並保留終端機及附加元件錯誤。此macOS測試版不支援Passkey應用程式鎖，勿複製Windows應用程式鎖設定；筆記本加密仍可使用。真實Thunderbird整合仍待使用者測試。

歸檔內有SHA256校驗清單、DMG／ZIP及附加元件。這是測試產物，並非正式發佈，自動更新尚未啟用。
