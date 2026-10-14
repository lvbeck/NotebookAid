# Startup performance and loading acceptance

Version: 0.14.4-startup.0. Task T14-D was accepted by the user on 2026-10-14. T15-A is not started.

## Behavior

- Startup and notebook switching show a theme-consistent loading indicator. Unknown-duration phases are indeterminate; metadata loading uses actual processed/total counts. No simulated overall percentage is used.
- Counts remain unavailable while loading. The UI does not suggest an empty notebook or no selection before loading finishes. Writing and filtering are disabled during initialization. Failures show a localized reason and retry; locked encrypted notes remain hidden.
- The validated catalog loads metadata, not every note body. Opening a note verifies its body hash and format. Paging alone does not read bodies. Explicit full-text searches load and validate uncached bodies after metadata filters; this is necessary to preserve body search. Search caches stay in memory and are cleared on lock/close/rebuild.
- Startup still verifies writer locks, pending operations, metadata and history references. It no longer verifies every body's bytes immediately: body-only corruption is detected on access or explicit full integrity verification. Failed reads do not replace content or save an empty body. Backup verification and security conversion retain full validation.
- The last opened readable, non-deleted note is restored from the notebook's existing recent records. If no such record remains, the latest modified readable note is selected. A locked encrypted note requires explicit unlock.
- Global settings offer 10, 20, 30, 50 or 100 notes per page, default 30. Changes reset the page offset and survive restart. Existing settings files remain valid.

## Manual acceptance

1. Fully exit and start the portable app three times with the normal notebook. Observe loading instead of false empty states; verify the restored note and its rich-text rendering.
2. Open an older note without modifying it, exit, restart and verify that this note returns even though another note was modified more recently.
3. Set notes per page to 10, advance and return a page, apply search/folder/tag filters and restart. Verify page size and total counts. Try 30 and 100 as well.
4. Lock an encrypted-only test notebook: it should show the locked state, not an empty notebook. Unlock and verify normal editing and search.
5. Temporarily make a test notebook unavailable while the app is closed. Verify a specific error and retry; restore its path and retry. Do not alter real notebook files for this test.
6. Check notebook switching, unsaved-save handling, add-on changes, import, trash/restore, backup and explicit full integrity verification.

## Automated validation and timing

The benchmark uses a synthetic notebook with 62 notes and 8 revisions per note. It reports read counts, byte counts and median phase timings over five opens. No real user content is read and Windows file caches are not cleared. Comparing source snapshots in the same execution environment is required; these timings are not a promise about real cold startup.

`scripts/startup-smoke.cjs` exercises the production Electron runtime with isolated notebooks: reopen/last-opened restoration, paging settings, empty, encrypted/locked and unavailable/retry. A self-test-only 1200 ms delay makes transient loading observable; it is excluded from core timing and is not present in normal launches. Screenshots and reports are generated under `output/startup-packaged`.

## Rollback

Fully exit and deploy the retained `NotebookAid-0.14.3-context.5-win-x64.zip` using the normal portable deployment procedure. Notebook schema and content require no migration. Before launching the older version, remove only `global.notePageSize` from `settings.json` because older builds reject unknown fields; preserve every other setting and keep a copy of this small configuration file. No new plaintext disk search cache or body cache is created.

### Measured comparison

Same elevated execution environment and synthetic fixture, five opens per implementation: baseline median 2323.706 ms, optimized median 1112.802 ms (about 52% shorter). Body reads: 187 → 1; bytes read: 6073073 → 593719. This measures core open/list/query/selection, not Electron/renderer launch. Windows file caches were not cleared. Reports: `output/startup-benchmark/baseline.json` and `optimized.json`.

### Final package checks

Production startup/paging (five launches), UI/restart, context menus and four editing formats, Native Messaging/desktop targeting/restart, and virtual Passkey gate checks passed. The complete core run passed 248/249 on the first serialized run; an intermittent Windows EPERM prevented a crash-injection rename. That case and an additional rename failure during the rerun passed targeted retesting. No unrelated rename policy was changed. Physical devices, screen readers, Windows 10 and real notebook cold-start timings were not tested.
