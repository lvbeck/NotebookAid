# Persistent editor controls (0.15.25)

Status: accepted by the user on 2026-10-25. The user explicitly authorized committing, pushing and publishing this version to GitHub. T15-A remains shelved; no next task is authorized.

## Behavior

- The editor's version/save/fullscreen row, note title, organization controls and complete rich-text/source toolbar share one sticky region. They stay visible while the note body scrolls in normal and editor-fullscreen modes.
- Existing toolbar wrapping, contextual formatting controls, menus and theme colors are retained. The sticky background covers both side gutters in light and dark themes.
- Outline navigation places a target below the entire fixed region. The image-size floating panel also avoids the complete region and follows its height changes.
- This is a display change. It does not migrate notebooks, rewrite note bodies or change note versions when switching views or scrolling. Existing labels remain available in all ten languages.

- Compact controls: 26px height, 11px labels and 12px icons in the editor and top language/theme/app controls. The fullscreen/save row has 6px padding above and below; the normal title has no extra top margin and an 8px bottom margin. The editing toolbar has no lower divider.

## Acceptance

1. Open a long Markdown note. In normal and editor-fullscreen modes, scroll the pane to the middle and end. Check the title, folder/tags/history/security controls, rich/source switch, formatting, attachments, AI, View, Export, Print and Save.
2. Repeat in light/dark themes, narrow/wide windows, continuous/pages/fold/directory layouts and source mode. In narrow windows, check existing wrapping, the formatting overflow menu and horizontal organization-row scrolling.
3. Click an outline heading far below the current view; confirm it appears below the fixed controls. Edit text or a formula, resize an image, undo/redo, save and reopen.
4. Confirm scrolling and layout changes leave the original body and revision unchanged. Physical IME and extreme zoom/very short windows still require manual verification.

## Rollback

Fully exit NotebookAid and its native helpers, then restore the retained `release/NotebookAid-0.15.24-win-x64.zip` with the portable preparation workflow. No notebook migration is needed. An existing backup remains the way to restore note data; program rollback alone does not undo note edits.

The installed application uses the matching all-users MSI upgrade. Retain the 0.15.23 MSI for rollback; MSI downgrade requires uninstalling only the program first and reinstalling the retained package. Keep notebook data and configuration.

## Evidence

Executed checks and package/deployment evidence are recorded in implementation-plan.md. Automated Windows GUI checks do not establish physical macOS, a physical printer or actual install/upgrade behavior.
