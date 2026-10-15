# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**ローカルノートと AI 文章作成アシスタント**

*手元に記録、穏やかに思考、知性が響く。*

NotebookAid は、任意の Thunderbird アドオンを備えたオープンソースのデスクトップノートアプリです。ノートブックは選択したローカルフォルダーに保存します。AI による文章作成、要約、翻訳は、明示的に生成を依頼した場合だけ選択したプロバイダーに文章を送信します。

## 機能

- 対応する安全な範囲内での Markdown・HTML リッチテキスト編集、TXT、ネイティブ Quill Delta。未対応の内容はソースモードで保護します。
- 複数のノートブック、階層フォルダー、検索、タグ、固定、最近のノート、添付ファイル、自動保存、バージョン履歴、ごみ箱。
- 任意のノート暗号化、ノートブックごとのマスターパスワードと復旧キー、バックアップと復元、Windows Passkey アプリロック。
- 色と表紙、ライト・ダーク・システムテーマ、10 の画面言語：英語、簡体字中国語、繁体字中国語（香港）、ドイツ語、フランス語、イタリア語、スペイン語、ポルトガル語（ポルトガル）、日本語、韓国語。初心者ガイドと無効化できるイースターエッグもあります。
- ローカル Native Messaging による Thunderbird 連携と、ICS ファイルからの Tasks インポート。
- 任意の AI アシスト：ChatGPT サブスクリプションへのログイン、Gemini または Claude の API キー。利用資格と規約は各プロバイダーに従います。プロバイダーや課金先は自動変更しません。

## テスト版のダウンロード

現在はテスト成果物のみで、正式リリースはありません。Windows と macOS は数値だけのバージョン番号を共用します。GitHub にログインし、成功した実行の Artifacts からダウンロードしてください。

- [EXE インストーラー／ポータブル ZIP](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`.
- [ネイティブ MSI インストーラー](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`.
- [macOS パッケージ](https://github.com/lvbeck/NotebookAid/actions/workflows/macos-build.yml): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## インストールと制限

まず外側の成果物 ZIP を展開してください。EXE と MSI は別成果物で、現在のユーザーまたは全ユーザーにインストールできます。種類を切り替える前に既存の別種類をアンインストールしてください。製品名は NotebookAid です。MSI は 10 言語を選べ、簡体字中国語では Microsoft YaHei を使用します。

macOS は Apple Silicon arm64 と Intel x64 の DMG・ZIP、NotebookAid.xpi、10 言語のアドオンとブリッジ設定ガイドを含みます。DMG・ZIP に Windows 型のセットアップ画面はありません。

パッケージは 30 日、検証レポートは 14 日保持します。期限切れの場合は新しい成功実行を選んでください。テスト前にノートブックをバックアップしてください。プログラムの置換はデータの復元ではありません。

## 署名・更新・プライバシー

Windows テストパッケージは未署名で、SignPath Foundation の審査待ちです。Chrome がダウンロードを遮断する場合があります。未署名だけを理由に誤検知と断定できません。警告を保持し、出所と SHA256 を確認してください。全体の保護を無効にしないでください。

macOS はアドホック署名であり、Developer ID 署名や Apple 公証はありません。実機の Mac、Thunderbird、Keychain、AI アカウントの検証は未完了です。この macOS テスト版は Passkey アプリロックに未対応です。Windows 10 も実機検証が必要です。

テスト版の自動更新元は有効にしていません。MSI は独立した GitHub latest-msi.json 署名更新経路を使い、確認後に Windows Installer を実行します。NSIS 更新は使用しません。Actions 成果物は更新元ではありません。AI 認証、モデル確認、承認済みの認証更新は通信します。文章は明示的な生成時だけ送信します。

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## ソースからの実行とビルド

Node.js 24.x（24.15 以上、CI は 24.21.0）を使用してください。Windows には PowerShell と .NET Framework C# コンパイラー、MSI には Visual C++ x64 ビルドツールと Windows SDK も必要です。macOS パッケージは macOS 上でビルドします。

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

## ドキュメントと開発

技術・受け入れ文書の多くは中国語です。Electron、TypeScript、Angular/CDK、Quill 2.x、SQLite、Native Messaging、Lucide を使用し、正確なバージョンはロックファイルに記録します。過去の進捗は現在の受け入れを意味しません。Explorer の新規作成メニューは保留中、Gemini Notebook 同期は将来の範囲です。

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## ライセンスと連絡先

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
