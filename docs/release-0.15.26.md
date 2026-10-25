# NotebookAid 0.15.26 — Windows and macOS

## Highlights

- Quill's native format-tool icons are enlarged to 18px, including color and background pickers. Existing horizontal-rule, formula and table actions follow the same icon size.
- Format icons are vertically centered inside the existing 26px controls. Rich-text/source mode, undo/redo, overflow, file actions, fullscreen/Save and top preferences keep their existing dimensions.
- The complete editor header stays sticky in normal and fullscreen modes. Existing responsive overflow menus, inline toolbars, themes and equal header padding remain available.
- Existing Quill buttons and handlers remain in use. No note source, revision, schema, interface-string or dependency changes are introduced. Ten README translations describe the accepted refinement.

## Packages

Windows x64: EXE installer, native MSI and portable ZIP. macOS: separate Apple Silicon (arm64) and Intel (x64) DMG/ZIP packages. Standard/compatibility Thunderbird XPIs and SHA256 checksum lists accompany the release. Keep the existing installer type and scope when upgrading.

## Verification and limits

The user accepted the local Windows 0.15.26 build. Packaged and installed GUI checks passed nine native-icon/alignment combinations, each measuring nineteen 18px icons centered in unchanged 26px controls, plus 32 layout boundaries, 120 sticky scroll samples, 40 compact-control measurements and ten locales. Exact note bodies and revisions were unchanged. Editor/image/table/HTML/undo/PDF, offline formula editing and restart checks passed. The actual all-users MSI upgrade from 0.15.25 succeeded; all 144 installed payload files matched the final MSI payload. Release verification records CI results and uploaded asset digests separately.

Windows installers are unsigned. macOS uses ad-hoc signing without Apple notarization. Physical macOS, native keyboard/IME, screen readers and physical-printer behavior are not established by these automated checks. Check real display scaling and very short windows with your notes. Automatic updates remain disabled. T15-A Windows New-menu prototypes remain shelved and excluded.

Back up notebooks before installing. For portable program rollback, fully exit the application and restore a retained prior ZIP. MSI rollback requires removing only the program, preserving notebook/configuration data, then installing a retained earlier MSI. Program rollback does not undo note edits. This icon refinement introduces no notebook schema migration.

## Published verification

Source/tag commit: `9293a2208a59c20517cf76045f133e8a21d5a1cd`. [Windows CI](https://github.com/lvbeck/NotebookAid/actions/runs/40183811761) and [macOS CI](https://github.com/lvbeck/NotebookAid/actions/runs/40183811759) passed. The [published release](https://github.com/lvbeck/NotebookAid/releases/tag/v0.15.26) contains fifteen assets, including the ten binaries listed in SHA256SUMS-0.15.26.txt. Accepted Windows package hashes were retained; macOS packages came from these verified CI runs. All upload digests, public downloads and the public checksum manifest were checked.
