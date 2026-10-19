# Advanced Search and tag colors

Version: 0.15.17. Awaiting user acceptance.

1. In Folder and tag management, create/edit a tag. Select each of the ten presets; verify the check mark and native custom color value update together. Pick a custom color, save, restart and verify it persists. Existing custom tag colors must remain unchanged when merely opening this page.
2. Open Advanced Search from the sidebar (replaces Pinned and the folder navigation entry). The note-card column is replaced by filters; the editor remains available by opening a result or choosing All notes.
3. Add/remove keyword fields (up to eight). The Add keyword button and AND/OR group must match the input's width and left edge, excluding the separate remove icon. AND matches all nonempty fields; OR matches any. Each field is a literal phrase, case/width insensitive. Search covers titles and content. All selected tags must match, and the pinned checkbox restricts results. Locked encrypted notes are excluded, as in the existing core search.
   Include subfolders is checked by default. With a parent folder selected, uncheck it and search: only notes directly in that folder may match. Recheck and search to include descendants. An empty parent with populated children must give zero results when unchecked. Reset restores the checked default. All folders remains unrestricted; Unclassified remains limited to unclassified notes.
4. Verify default pagination is ten results; change to 20/50/100. Previous/Next must respect bounds; applying filters resets to page one. No-match and reset states must be clear. Editor pagination preferences are separate.
5. Verify a pinned result starts with the pin icon and label before the title. Folder and tags occupy separate columns; Created and Modified are the last columns. All cells are vertically centered. Only matching title text is bold; markup in a title must remain literal text.
6. Open a result, edit/save, return to Advanced Search and verify updated results. Switch notebooks and confirm old filters/results clear. Lock the notebook/application and confirm sensitive results clear.
7. Check all ten languages, light/dark themes, keyboard navigation, custom select menus and narrow-window table scrolling. No new external library or network search is used.

Keyword searches intentionally examine candidate note content on demand; empty-keyword metadata searches do not load bodies. Search results contain summaries only. Automatic queries are not added to cold startup.

Physical macOS and Windows 10 validation are not implied by automated Windows 11 checks. Exit the application before rolling program files back to the retained 0.15.16 ZIP. No notebook schema migration is required. Custom colors already supported by older versions remain readable.
