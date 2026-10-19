# Offline Markdown formulas (0.15.23)

Status: accepted by the user on 2026-10-19, together with Markdown horizontal rules, H4/H5/H6 rich editing, multilingual README updates and third-party notices. Scoped local commit authorized. T15-A stays shelved. No next task, push, tag or formal release.

## Behavior

- Markdown supports inline `$…$` and `\(…\)`, and display `$$…$$` / `\[…\]` on their own lines. Formula contents use the supported KaTeX syntax; unsupported LaTeX commands/packages are not automatically converted.
- Formulas use locally bundled KaTeX 0.19.0, CSS and fonts. No CDN, AI service or network rendering is used. Click a formula, or focus it and press Enter, to edit LaTeX with a local preview. The existing rich toolbar's formula action inserts a formula.
- Markdown stores the delimited source, not a raster image. Opening, changing views, saving without edits and restarting preserve the original body. Actual rich edits can normalize Markdown paragraph spacing and delimiters of an edited formula. Existing delimiters of an unchanged formula stay intact; undo restores the prior body.
- Display formulas inside lists/quotations retain source protection because Quill block embeds cannot preserve those containers; inline formulas remain supported there.
- Code spans/fences, escaped dollar signs and ordinary currency remain literal. Invalid formulas display their source and remain editable. Input is bounded to 8192 characters per rendered formula, with isolated macros, 1000 expansions, size limits and `trust=false`.
- PDF output reconstructs formulas after HTML sanitization and embeds local WOFF2 fonts. HTML/TXT export keeps LaTeX source; this task does not add a standalone HTML formula viewer or change Delta v1.
- The license page's generated catalog includes KaTeX, its bundled fonts, and actual runtime dependencies. Original code/font MIT notices ship as KATEX-LICENSE.txt and KATEX-FONTS-LICENSE.txt, in addition to the renderer/runtime notice bundles.

## Acceptance checks

1. Use Markdown with `$E=mc^2$`, `\(a+b\)`, and a separate `$$` integral block. Verify rich display offline in light/dark themes and narrow/fullscreen views.
2. Click a formula and edit its source; test live preview, inline/block switching, cancel, apply, remove, insertion, undo/redo and save/reopen. Confirm surrounding text and other formula sources stay intact.
3. Test code spans/fences, escaped dollars, currency, invalid commands and malformed delimiters. Invalid input must retain its source; cancel must leave the note unchanged.
4. Check both outlines and all six heading levels, all ten UI languages and the new license rows/notices. Export Markdown to check source, and PDF to check visible formulas and fonts.

## Rollback

Fully exit NotebookAid and native helpers. Restore the retained `release/NotebookAid-0.15.22-win-x64.zip` using the project portable preparation workflow. No notebook migration is needed. Older versions can save the original Markdown source but do not render these formulas; use source mode and avoid rich editing math notes in an older version.

## Validation limits

Executed evidence is recorded in implementation-plan.md. Automated PDF checks do not prove a physical printer, native IME, physical macOS, real Passkey or Windows install/upgrade behavior. No task is accepted merely because automated checks pass.
