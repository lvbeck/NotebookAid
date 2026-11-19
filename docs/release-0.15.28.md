# NotebookAid 0.15.28 — Windows and macOS

## Changes

- Fix the generic UI regression assertion that required the portable update message on Windows installations. The test now reads the actual updater phase and checks its localized status. Installed runs explicitly require `unconfigured`; Windows portable/development runs explicitly require `portable`. Unexpected self-test updater states still fail.
- Add an installed UI runner that loads only the current test module into the real installed application using a temporary loopback inspector. It uses isolated synthetic notebooks, records the loaded test hash, and verifies that the executable, ASAR and installation metadata remain unchanged.
- Include the accepted test correction in rebuilt 0.15.28 packages. This release does not change note formats, application behavior, dependencies or automatic-update policy. T15-A remains shelved and excluded. The v0.15.27 tag and release assets remain intact.

## Verification and limits

The user accepted the Windows MSI full generic UI first-launch/reopen checks and the portable/development checks recorded on 2026-11-06. They covered ten languages, themes, menus and information pages, notification history, focus, shortcuts and dialog guards, zoom restoration, safe errors and note preservation. Updater unit checks passed 4/4. New build, package and source-matched CI results will be recorded after verification; prior results are not presented as fresh 0.15.28 installer validation.

Windows installers remain unsigned. macOS packages use ad-hoc signing without notarization. Real keyboard/IME, screen readers, physical macOS, real Passkey, printers, Thunderbird and AI account acceptance are not established by this test-only change. Automatic updates remain disabled.

Back up notebooks before updating and keep the same installer type and scope. For portable rollback, fully exit the app and restore the retained 0.15.27 ZIP. For an MSI rollback, remove only the program while preserving notebook/configuration data and install the retained 0.15.27 MSI. Program rollback does not undo note edits. See [installed UI testing](installed-ui-testing.md) and [the implementation record](implementation-plan.md).
