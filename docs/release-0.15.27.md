# NotebookAid 0.15.27 — Windows and macOS

## Fixes

- The notification, language, theme and application-menu entries use matching icon buttons. Native hover titles and accessible names identify each action and the current language/theme; dropdown choices and the unread badge remain available.

- Delta rich-text pastes keep supported headings, lists, tables and attachment images. Unsupported pasted formatting falls back to text instead of leaving visible changes outside the saved note body. If snapshot serialization fails, the draft remains available in the existing source/diagnostics view. Native Delta v1 validation remains strict.
- Encrypted TXT, Markdown and HTML exports now carry their source identity and display the existing plaintext warning. File export, printing and PDF require confirmation whenever the submitted format, title or body cannot be verified as an unchanged saved unencrypted snapshot. Cancelled confirmation produces no output.
- Failed attachment writes or filesystem synchronization remove the incomplete new export so the same destination can be retried. Existing destination files and protected notebook/application paths remain guarded.
- Clipboard, export/print IPC and filesystem-fault regression coverage is expanded. GUI smoke checks use the current export menu and theme controls, and exercise protected output cancellation/confirmation and actual PDF generation.

## Packages

Windows x64: EXE installer, native MSI and portable ZIP. macOS: separate Apple Silicon (arm64) and Intel (x64) DMG/ZIP packages. Thunderbird standard/compatibility XPIs and SHA256 lists accompany the release. Keep the existing installer type and scope when upgrading.

## Verification and limits

The user accepted the local Windows 0.15.27 build. Local regression checks completed with 387 passed, zero failed and one macOS-only bridge test skipped; the focused repair checks passed 18/18. Development, packaged and installed Delta/security GUI checks passed initial launch and reopen, including clipboard/save persistence, protected output confirmation/cancellation, actual PDF generation, lock clearing and failed-save preservation. The all-users MSI upgrade from 0.15.26 completed with exit code 0, no reboot required, preserved language/shortcut settings and all 144 installed payload files matching the final MSI payload.

The accepted local Windows EXE/MSI/ZIP passed Windows Defender scanning with remediation disabled. Package verification checked 140 inventory files, 143 ZIP files, six checksums, native metadata, embedded addons and licenses; 260 renderer/runtime files matched ASAR. Source-matched release CI results and uploaded asset digests are recorded separately after verification.

Windows installers remain unsigned. macOS packages use ad-hoc signing without Apple notarization. Direct printing was simulated; physical printers, real Passkey enrollment/use, physical macOS, native keyboard/IME and screen-reader behavior are not established by these checks. The separate Windows cross-user pipe-identity hypothesis has not been reproduced and is not claimed as a fixed vulnerability. Automatic updates remain disabled. T15-A Windows New-menu prototypes remain shelved and excluded. No notebook schema or dependency upgrade is introduced.

Back up notebooks before installing. For portable program rollback, fully exit the application and restore the retained 0.15.26 ZIP. For an installed MSI rollback, remove only the program while preserving notebook/configuration data, then install the retained 0.15.26 MSI. Program rollback does not undo note edits. See [the implementation and acceptance record](implementation-plan.md).
