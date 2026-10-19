# Notebook-local settings verification

Version: 0.15.14. Status: user accepted on 2026-10-19.

1. Open an existing notebook, rename it, and set its own autosave interval. Confirm notebook-settings.json appears beside library.json, with the notebook's stable libraryId and no device paths or credentials. Reopen the application and confirm the values persist.
2. Create a second notebook. Give it different folders, nested folders, tags, appearance and autosave settings. Switching notebooks must retain independent values and the corresponding note assignments.
3. Exit NotebookAid before copying a disposable notebook to another directory/device. Open that existing notebook using a separate local application profile. Its name, folders, tags, appearance and explicit autosave override should persist. Do not concurrently edit the original and copied notebook.
4. A copied enabled daily-backup preference can appear checked while the backup destination says none. Configure a local destination before expecting scheduled backups. Backup paths and last/next execution times remain local.
5. Back up a disposable notebook, change its notebook settings, then restore through the existing guarded restore flow. The backed-up notebook preferences should return. Note import into another notebook must retain the target notebook's settings.

This change does not provide iCloud/Dropbox synchronization or cloud conflict handling. Inherited autosave uses the current device's global default. Application-wide theme, language, zoom, credentials, registry paths and backup directories remain on the device.

Program rollback: exit the app and redeploy the retained 0.15.13 portable ZIP. Existing notebook content/schema and legacy local settings are retained. The older program uses its legacy device settings and will not apply the new notebook settings sidecar; do not expect newer preference changes to appear in that version. Restore any notebook data only from an explicitly chosen verified backup using the guarded restore workflow.
