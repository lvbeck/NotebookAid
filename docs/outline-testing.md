# Outline views and editor boundaries (0.15.21)

Status: accepted by the user on 2026-10-19; scoped local commit authorized. T15-A remains shelved. No remote push or formal release.

## User checks

- Open a Markdown or TXT note and choose View. Continuous and Page layouts remain available. The additional choices are Fold in place and Outline and body. HTML and Delta retain Continuous/Page; a remembered outline preference falls back to Continuous for unsupported formats.
- Markdown outlines use ATX hash headings, including skipped levels and repeated titles. Fenced code, escaped hashes and HTML comments do not create headings. TXT outlines use hyphen lists and actual indentation, with tab stops of four columns. Other list marker types do not create TXT outline nodes.
- Fold in place offers expand/collapse controls and preserves preamble and section text. It is a read-only view; Edit body returns to the existing editor. This avoids hidden text being accidentally edited or deleted while folded. Section content is displayed as literal text, including Markdown inline syntax.
- Outline and body keeps the original editor beside the outline. Click an entry to locate the heading or source position. On narrow panes, the outline moves above the editor. Edit, undo, save, switch notes and reopen the application.
- Switching views, collapsing and navigating must leave the exact saved body and note version unchanged. Only an explicit edit may change the body. No schema migration, outline file, saved fold marker or rewritten note content is introduced.
- Check both left and right edges in dark mode after scrolling, with the normal window and editor fullscreen. The sticky header must cover the pane gutters; paginated decoration and toolbar controls must fit the pane. Check narrow windows and light mode too.
- Verify the four View choices, contextual controls, empty-outline messages and accessible labels in all ten supported languages. Notes without matching headings/list items display an empty-outline message; they remain editable in the original editor.
- Root README files in all ten languages summarize recent local features. Their existing CI download URLs are intentionally retained; local 0.15.21 delivery is not a new remote build or release.

## Validation boundaries

Automated reports are recorded in the implementation plan after execution. Parser tests check exact source offsets, CRLF, fences, indentation, duplicate titles and reconstruction. Isolated Electron fixtures use synthetic notebooks only. They do not establish physical macOS, real IME composition, screen-reader behavior, printer hardware or actual installer upgrade behavior.

## Rollback

Before leaving 0.15.21, choose View > Continuous layout and exit NotebookAid and its helpers. This removes the optional editorLayout preference; older builds reject the new fold/directory values. No notebook schema or body rollback is needed.

Use the retained release/NotebookAid-0.15.20-win-x64.zip with the established Prepare-TestPortable.ps1 procedure for program rollback. Disable login startup before replacing an executable that has been registered to start at login. Program rollback does not undo explicit note edits or replace user notebooks.
