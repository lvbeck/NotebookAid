# Markdown rich-text blocks (0.15.22)

Status: accepted by the user on 2026-10-19, together with KaTeX formulas, multilingual README updates and third-party notices. Scoped local commit authorized. The accepted outline work is committed as 9de61c7. T15-A remains shelved. No next task, push, tag or formal release.

## Scope

- Markdown H4/H5/H6 headings render and can be selected in the existing heading picker. Existing H1-H3 remain available.
- Horizontal rules support Markdown --- / *** / ___ and safe HTML hr blocks. The Markdown toolbar provides a localized line icon. It is disabled inside tables/code blocks and hidden for other primary formats.
- Opening, switching views and saving without editing preserve exact original source. Rich edits serialize equivalent Markdown; separator spelling and spacing can normalize after an actual edit. Undo restores the previous exact body.
- Existing heading outlines continue to use source offsets. Fold in place remains read-only. HTML sanitization and unsupported-source guards remain enabled. No notebook schema, Delta v1 format, dependencies or credentials change.

## User checks

1. Open a Markdown note with H4/H5/H6, ordinary paragraphs and all three separator spellings. Confirm rich mode is available and opening/saving without edits preserves source.
2. Edit the headings, apply Heading 4/5/6 from the existing picker, insert a rule in an ordinary paragraph, then undo and redo. Save and reopen; confirm rules/headings and surrounding content remain.
3. Test Continuous, Page, Fold in place and Outline and body; navigate to H4/H5/H6. Check light/dark themes and narrow/fullscreen windows. Try all ten interface languages.
4. Unknown code languages and unsupported HTML still retain source protection. Delta v1 keeps H1-H3 and does not offer the Markdown divider action.

## Rollback

Fully exit NotebookAid and its native helpers. Select Continuous first if desired. Restore the retained release/NotebookAid-0.15.21-win-x64.zip through the project portable preparation workflow; do not remove user data or force-stop processes. Existing notes need no migration. The old version can still save Markdown with these elements in source mode; avoid converting them to rich text with that version.

## Evidence

Build, UI regression, packaging and deployment results will be recorded after execution in implementation-plan.md. Native printer, physical IME/macOS and actual install/upgrade are separate from automated fixtures.
