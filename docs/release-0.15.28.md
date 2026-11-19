# NotebookAid 0.15.28 — Windows and macOS

## Changes

- Fix the generic UI regression assertion that required the portable update message on Windows installations. The test now reads the actual updater phase and checks its localized status. Installed runs explicitly require `unconfigured`; Windows portable/development runs explicitly require `portable`. Unexpected self-test updater states still fail.
- Add an installed UI runner that loads only the current test module into the real installed application using a temporary loopback inspector. It uses isolated synthetic notebooks, records the loaded test hash, and verifies that the executable, ASAR and installation metadata remain unchanged.
- Include the accepted test correction in rebuilt 0.15.28 packages. This release does not change note formats, application behavior, dependencies or automatic-update policy. T15-A remains shelved and excluded. The v0.15.27 tag and release assets remain intact.

## Verification and limits

The user accepted the UI test correction and explicitly authorized the new 0.15.28 release. On 2026-11-19, desktop compilation and the complete build passed. The final installed runner completed full first-launch/reopen checks against the existing real MSI 0.15.27 with isolated synthetic notes; installed program hashes stayed unchanged and the expected updater phase was `unconfigured`. The newly built 0.15.28 program package passed full generic UI launch/reopen checks with phase `portable`. Coverage includes ten languages, themes, menus and information pages, notification history, focus, shortcuts and dialog guards, zoom restoration, safe errors and note preservation. Updater unit checks passed 4/4. These results distinguish the existing local MSI from the new 0.15.28 packages.

Windows package verification passed 140 inventory files, 143 ZIP files, six checksums, five native helper versions and three licensed MCP components. All 260 runtime/renderer files, twenty WOFF2 fonts and license notices matched ASAR. Property-only MSI localization passed ten languages and 37 texts per language. The actual final EXE/MSI/ZIP passed Windows Defender scans with remediation disabled; this does not establish a browser reputation verdict. The specified portable test directory was refreshed from the verified 0.15.28 ZIP. Source-matched CI and publication results are recorded after completion.

Windows installers remain unsigned. macOS packages use ad-hoc signing without notarization. Real keyboard/IME, screen readers, physical macOS, real Passkey, printers, Thunderbird and AI account acceptance are not established by this test-only change. Automatic updates remain disabled.

Back up notebooks before updating and keep the same installer type and scope. For portable rollback, fully exit the app and restore the retained 0.15.27 ZIP. For an MSI rollback, remove only the program while preserving notebook/configuration data and install the retained 0.15.27 MSI. Program rollback does not undo note edits. See [installed UI testing](installed-ui-testing.md) and [the implementation record](implementation-plan.md).

## Published verification

[v0.15.28](https://github.com/lvbeck/NotebookAid/releases/tag/v0.15.28) is the public Latest release with fifteen assets. All uploaded sizes and SHA256 digests match the verified files. Unauthenticated release-page, Windows EXE/MSI and both macOS DMG download checks passed; the public ten-binary checksum manifest matches its retained local copy exactly. The v0.15.27 tag target and all fifteen prior asset sizes/digests are unchanged.

Source commit: `03ef3b7ee06e6216c11e61e23fd112d0b1eb7f0f`. [Windows CI](https://github.com/lvbeck/NotebookAid/actions/runs/44536099511) passed 387 tests with zero failed and one platform skip, plus MSI user/machine installation and upgrade/rollback, packaged GUI/editor, scanning and EXE installation checks. [macOS CI](https://github.com/lvbeck/NotebookAid/actions/runs/44536099849) passed both architectures, each with 369 passed, zero failed and nine platform skips, plus embedded-addon, signature/architecture/language and packaged GUI/editor/reopen checks. Release macOS assets match the exact successful CI artifact archives and their checksum lists. Later documentation commits update download links and evidence without changing tagged application code.
