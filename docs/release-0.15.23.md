# NotebookAid 0.15.23 — Windows and macOS

## Highlights

- Offline KaTeX formulas in Markdown: inline `$…$` / `\(…\)` and display `$$…$$` / `\[…\]`, editable LaTeX with local preview, insertion/removal, undo/redo and rendered PDF output.
- Markdown horizontal rules and all six heading levels in the rich editor, with source preservation when opening or saving an untouched note.
- Four view layouts, including Fold in place and Outline and body for Markdown headings and indented TXT lists; dark-mode gutter overflow fixes.
- Ten-language interface and README updates, notebook color skins including Aurora violet, and complete KaTeX code/font/dependency notices.
- Local notebooks, history, encryption/recovery, backups, attachments, Thunderbird integration and explicitly authorized local MCP note creation remain available.

## Packages

Windows x64: EXE installer, native MSI and portable ZIP. macOS: separate Apple Silicon (arm64) and Intel (x64) DMG/ZIP packages. Thunderbird standard/compatibility XPI files and SHA256 checksum lists accompany the packages. Choose the package for your architecture; use the matching checksum list.

## Verification and limits

Local Windows regression: 381 passed, one platform skip. Packaged formula/source editing, offline fonts/PDF, ten locales, editor blocks, outline/restart, third-party notices and sixteen dark-layout boundary cases passed. The release page records final CI results and artifact origins.

Windows installers are unsigned. macOS uses ad-hoc signing without Apple notarization. Physical macOS, Windows 10, real Passkey/Windows Hello, native IME and physical-printer testing are not established by these automated checks. Display formulas nested inside lists or quotations retain source protection; inline formulas remain supported there. Unsupported LaTeX stays editable as source.

Automatic updates remain disabled pending signed update configuration. This release does not enable update feeds. T15-A Windows New-menu integration remains shelved and excluded.

Keep notebook backups before installing. For portable program rollback, exit NotebookAid and its helpers completely and restore a retained prior version ZIP; use source mode for formula notes in versions without formula rendering. No notebook schema migration was introduced by the Markdown blocks/formula changes.
