# Notebook color skins (0.15.18)

Status: accepted by the user on 2026-10-19. No formal release or remote push.

- In Notebook settings > Appearance, save each of the ten preset colors. Buttons, selections, menus, checkboxes and page surfaces follow the active notebook in light and dark modes.
- Mist blue restores the initial preview: `#92A8BA` selector swatch, `#456987` light accent and `#AEC4D5` dark accent. All surfaces and highlights use the original muted palette; version remains 0.15.18.
- Switch between notebooks with different colors. Editing an inactive notebook's appearance must not change the active notebook's skin. Exit and reopen to confirm persistence.
- Change the operating system appearance with Follow system selected; the current notebook's skin must remain selected while its light/dark palette changes.
- Verify translated color names in all ten application languages. The main page has no additional skin picker; notebook Appearance retains the existing color picker and ten swatches.
- The interim `#78B9E8` color resolves to Mist blue without rewriting the stored color. Custom colors remain intact and use the nearest preset hue; neutral custom colors use Stone grey. This does not change note/tag colors or document formatting.
- No schema migration, new dependencies, network access or startup note-body reads are introduced by skin selection.

Automated evidence: `output/mist-blue-build.log`, `output/mist-blue-types.log`, `output/mist-blue-tests.log`, the earlier `output/notebook-skins-regression-elevated.log`, and development/packaged skin UI reports. Windows package checks do not establish physical macOS behavior or a fresh installation/upgrade matrix.

Rollback: exit NotebookAid and its helpers, then replace test program files from the retained `release/NotebookAid-0.15.17-win-x64.zip` using the established verified deployment procedure. Notebook data needs no rollback.
