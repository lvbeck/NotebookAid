# NotebookAid 0.15.25 — Windows and macOS

## Highlights

- The complete editor header stays visible while scrolling in both normal and fullscreen modes: title, folder/tags/history/security controls, rich-text/source tools, attachments, AI, View, Export, Print and Save.
- Compact 26px buttons, 11px labels and 12px icons, including the top language/theme/app controls. The fullscreen/save row has equal 6px top and bottom padding. Title spacing is reduced and the divider below the editing toolbar is removed.
- Outline navigation and floating image-size controls avoid the full sticky header. Light/dark gutter coverage and responsive toolbar wrapping are preserved.
- All ten README translations describe the accepted compact layout. Markdown source and note revisions remain unchanged when scrolling or changing layouts.
- Existing offline KaTeX formulas, Markdown horizontal rules, H1–H6 editing, four view layouts and explicitly authorized local MCP note creation remain available.

## Packages

Windows x64: EXE installer, native MSI and portable ZIP. macOS: separate Apple Silicon (arm64) and Intel (x64) DMG/ZIP packages. Standard/compatibility Thunderbird XPIs and SHA256 checksum lists accompany the release. Keep the existing installer type and scope when upgrading.

## Verification and limits

The user accepted the local Windows 0.15.25 build. Packaged and actually installed Windows GUI checks passed 32 theme/layout boundaries, 120 sticky scroll samples, 40 compact geometry checks, ten locales, exact note bodies and unchanged revisions. Editor/image/table/HTML/undo/PDF, offline formula editing and restart checks also passed. The actual all-users MSI upgrade from 0.15.23 succeeded and all 143 installed payload files matched the final MSI payload. Release verification records CI results and uploaded asset digests separately.

Windows installers are unsigned. macOS uses ad-hoc signing without Apple notarization. Physical macOS, native keyboard/IME, screen readers and physical-printer testing are not established by these automated checks. Very short windows and extreme display scaling should be checked with real notes. Automatic updates remain disabled. T15-A Windows New-menu prototypes remain shelved and excluded.

Back up notebooks before installing. For portable program rollback, fully exit the application and restore a retained prior ZIP. MSI rollback requires removing only the program, preserving notebook/configuration data, then installing a retained earlier MSI. Program rollback does not undo note edits. This layout change introduces no notebook schema migration.

## Published verification

Source/tag commit: `38f40d5139eba67cb1ceced7dc617763cf1d2b6c`. [Windows CI](https://github.com/lvbeck/NotebookAid/actions/runs/40178011749) and [macOS CI](https://github.com/lvbeck/NotebookAid/actions/runs/40178011739) passed. The [published release](https://github.com/lvbeck/NotebookAid/releases/tag/v0.15.25) contains fifteen assets, including the ten binaries listed in SHA256SUMS-0.15.25.txt. Windows assets retain the accepted local hashes; macOS packages come from these verified CI runs. All upload digests, public downloads and the public checksum manifest were checked.
