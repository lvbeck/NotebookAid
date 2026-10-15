# macOS の NotebookAid — Thunderbird の設定

[English](README.en-US.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

## アプリとアドオンのインストール

1. Apple M シリーズの Mac は arm64、Intel は x64 を選択してください。DMG を開き、NotebookAid.app を /Applications にドラッグして一度起動します。テストアプリはアドホック署名であり、Developer ID 署名・Apple 公証はありません。遮断された場合は表示を保持し、システム全体の保護を無効にしないでください。
2. Thunderbird → アドオンとテーマ → 歯車 → ファイルからアドオンをインストール、から同じ成果物内の NotebookAid.xpi を選択します。Windows 版のダウンロードは不要です。XPI を展開しないでください。初回は互換移行アドオンも不要です。
3. Thunderbird 157.0 以上が必要です。検証基準は 157.0.1 です。古い ESR は対象外です。

## ローカルブリッジの登録

上記の場所にインストール後、macOS のターミナルで実行します。別途 Node.js のインストールや sudo は不要です。

```sh
ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"
```

成功すると `NotebookAid bridge registered for the current user.` と表示します。登録先は `~/Library/Application Support/Mozilla/NativeMessagingHosts/` です。ネットワークポートやシステムサービスは設定しません。

## 接続と問題の確認

Thunderbird を終了して開き直し、NotebookAid でテスト用ノートブックを開き、アドオンの再接続を押してください。アプリを開く／バックグラウンドで開始の操作でローカルアプリを起動できます。

登録は再起動後も保持します。同じ場所への更新では通常再登録は不要です。アプリを移動する前に元のアプリを残した状態で上記コマンドの末尾に `--remove` を追加して実行し、新しい場所から登録してください。別の場所を使う場合は 3 つのパスをすべて変更します。他の場所を指す既存の登録は拒否します。ファイルを無断削除せずエラーを保持してください。

切断時は Thunderbird のバージョンとアプリの場所を確認し、両方を再起動してエラー表示を保持してください。この macOS テスト版は Passkey アプリロックに未対応です。Windows のアプリロック設定をコピーしないでください。ノートブック暗号化は利用できます。Thunderbird 連携の実機検証はまだ必要です。

成果物には SHA256、DMG/ZIP、アドオンと設定ガイドを含みます。正式リリースではなく、自動更新は有効にしていません。

## Windows テスト版

[EXE／ポータブル ZIP](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`。[ネイティブ MSI](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`。GitHub にログインして成功した実行から選んでください。MSI は現在のユーザー／全ユーザーに対応し、名前は NotebookAid のままです。独立した署名更新経路を使用しますが、未署名テスト版の更新元は無効です。[MSI ガイド](../msi-testing.md)を参照してください。
