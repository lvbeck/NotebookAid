# Native editor icons (0.15.26)

Status: accepted by the user on 2026-10-25. The user explicitly authorized the scoped commit, push and publication of v0.15.26. T15-A remains shelved; no next task is authorized.

## Behavior

- Existing Quill 2.0.3 native format buttons, icons and handlers remain in use. Format icons are 18px, including color/background controls. Existing custom horizontal-rule, formula and table actions use the same icon size.
- Existing button dimensions remain unchanged. Rich/source mode, undo/redo, overflow, heading/language dropdown arrows, attachments, AI, View/Export/Print, fullscreen/Save and top preferences retain their previous dimensions and icon sizes.
- Same-row controls are vertically centered. The full editor header remains sticky in both normal and fullscreen modes, with the existing equal heading padding, responsive wrapping and overflow menu.
- No note schema, source, revision or dependency changes are introduced. No new interface strings are added; existing ten-language labels remain available.

## Acceptance

1. Open a long Markdown note. In normal and fullscreen modes, scroll to the middle and end, then check the title, note properties, mode controls, tools and file actions remain visible.
2. Open the formatting overflow menu; check native bold/italic/underline/strike, color/background, lists, quote/code/link/image and clear-format icons. Confirm 18px icons are centered within the existing buttons and the mode/file buttons retain their size. Repeat with a wide inline toolbar and light/dark appearance.
3. Test native formatting, color pickers, images/tables/formulas, rich/source switching, undo/redo, saving/reopening and PDF export. Check a code-language dropdown retains its prior dimensions.
4. Check narrow windows and actual display scaling. Physical keyboard/IME, screen readers, physical macOS and physical-printer behavior still require manual verification.

## Rollback

Fully exit NotebookAid and helpers, then restore the retained `release/NotebookAid-0.15.25-win-x64.zip` through the portable preparation workflow. For an MSI rollback, remove only the program, preserve notebook/configuration data, then install the retained `release/msi/NotebookAid-0.15.25-Setup-x64.msi`. Program rollback does not undo note edits.

Actual test, package and deployment results are recorded in implementation-plan.md.
