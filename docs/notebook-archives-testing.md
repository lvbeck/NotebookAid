# Complete notebook archives

Version: 0.15.15. Status: user accepted on 2026-10-19.

1. On the notebook page, Import from .nabook must be immediately beside Add existing notebook, with the same button alignment. Export notebook appears in each notebook card.
2. Export a disposable notebook with nested folders, tags, several note formats, attachments, history and custom notebook settings. The suggested filename uses the notebook name and `.nabook`. The file is a standard ZIP containing archive.json, backup.json and notebook/ payload. An existing export must not be replaced silently.
3. On another local application profile, import that archive, select a destination parent and confirm. A new child directory appears only after validation. The imported notebook is added to the list, without changing the current notebook. Open it and verify note content, history, attachments, folder/tag assignments, appearance and settings. Reopen the app and verify registration persists.
4. Cancel the import confirmation and check that no notebook is created. Import a damaged archive and verify it is rejected. A notebook identity already registered is rejected; remove its existing registry entry first if you intentionally want to reopen an archive copy. Removing the entry does not delete its files.
5. Encrypted notes remain encrypted, including when exporting a locked notebook. Unlock the imported notebook using its original master password or recovery workflow. The archive adds no encryption for plain notes. Device backup paths and login credentials are not added to the archive by this feature.
6. After installing the new EXE or MSI, `.nabook` files should show the document/N icon. Double-click a file, then click Import from .nabook to select its destination. Verify both a cold launch and an already running app. Portable delivery does not change system file associations. macOS UTI/icon configuration is included, but physical macOS testing is required separately.

The codec is loaded on demand. Compression, extraction and complete import validation run in a worker; notebook writes pause for consistency and progress appears in the existing themed banner. The archive is bounded to 100002 file entries and 32 GiB expanded content. Malformed paths, links and case/normalization collisions are rejected. No generic ZIP extraction command or external executable is run.

Rollback: exit NotebookAid and redeploy the retained 0.15.14 program ZIP. Existing notebook schemas/content are unchanged. The older version cannot open `.nabook` directly; a successfully imported notebook is an ordinary notebook folder that can be added using Add existing notebook. Retain the original archive and source notebook until acceptance.
