# NotebookAid on macOS — Thunderbird setup

[English](README.en-US.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

## Install the app and addon

1. Choose arm64 for an Apple M-series Mac, or x64 for Intel. Open the DMG and drag NotebookAid.app to /Applications, then launch it once. This test app has ad-hoc signing but no Developer ID signature or Apple notarization. If macOS blocks it, keep the exact message; do not disable system-wide security protections.
2. Open Thunderbird → Add-ons and Themes → gear menu → Install Add-on From File, and select the NotebookAid.xpi included in this same artifact. No separate Windows download is needed. Do not unzip the XPI. First-time installations do not need the compatibility migration helper.
3. The addon requires Thunderbird 157.0 or newer; the project's test baseline is 157.0.1. Older ESR versions are not covered.

## Register the local bridge

Run this in macOS Terminal, after installing the app at the path above. No separate Node.js installation or sudo is needed:

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

Expected output:

    NotebookAid bridge registered for the current user.

The script writes current-user registration files under ~/Library/Application Support/Mozilla/NativeMessagingHosts/. It does not configure a network port or system-wide service.

## Connect and troubleshoot

Quit and reopen Thunderbird, open NotebookAid and a test notebook, then choose Reconnect in the addon. Open app and Start background can launch the local application when needed.

Registration persists after reboot. Updating the app at the same path does not normally require registration again. Before moving the app, run the same command with --remove appended while the old app still exists; register again from the new location. Change all three application paths if using a different location. An existing registration for another path is rejected: keep the error instead of deleting registration files blindly.

If disconnected, verify the Thunderbird version and application path, relaunch both applications and retain the terminal/addon error text. macOS Passkey application locking is not supported in this test build; do not copy Windows application-lock settings. Notebook encryption remains available. Real Thunderbird integration still needs user testing.

The archive contains SHA256 checksums, DMG/ZIP alternatives and this addon. These are test artifacts, not a formal release; automatic updates are not enabled.

## Windows test downloads

[EXE installer](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`. [Native MSI](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`. Choose a successful run and sign in to download. MSI supports current-user and all-user installation, keeps the name NotebookAid, and uses a separate signed GitHub update channel. Current unsigned test packages have no active update feed. See the [MSI guide](../msi-testing.md).
