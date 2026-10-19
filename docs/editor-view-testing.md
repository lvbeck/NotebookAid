# Editor view layouts (0.15.19)

Status: View layouts and Aurora violet naming accepted by the user on 2026-10-19. The later dark-mode overflow report remains open; outline views are requested follow-up work. Neither follow-up is implemented by this acceptance commit. No push or formal release.

- Open a note and choose **View** beside Export and Print. New profiles use Continuous layout. The menu contains themed radio choices for Continuous layout and Page layout; the icon changes with the selection. Escape and outside clicks close the popup.
- Choose Page layout to display A4-proportioned paper surfaces, page numbers and gaps. The display follows the notebook skin and light/dark theme. The preference is local to this installation and survives restart; it does not add page breaks or formatting to the note body.
- Exercise TXT, Markdown/HTML/Delta rich text and source mode. Edit, paste plain text, use the right-click menu, undo/redo, save, change notes and restart. For Chinese/Japanese/Korean input methods, confirm that composition commits once and is not interrupted by reflow.
- Check long paragraphs, lists, tables, tall attachment images and narrow windows. Paper guides reserve space around text; tall pictures are constrained on screen without changing their saved dimensions. Continuous layout retains the previous editor presentation and has no active pagination observers.
- Printing and PDF export continue to use the existing print engine and its own paper/margin settings. Screen pages are a viewing layout, not a printer-specific proof.

Automated evidence: `output/view-build.log`, `output/view-types.log`, `output/view-settings-tests.log`, `output/view-regression.log`, and development/packaged `output/view-ui/` reports. UI fixtures check line rectangles against page gaps, unchanged TXT/HTML source, plain undo, right-click selection, cross-page table rows, tall pictures, ten translated labels, source-mode round trips, dark/narrow layouts and restart persistence. These checks do not establish physical macOS, physical IME, printer or new installer installation behavior.

## Rollback

While 0.15.19 is still running, select **View > Continuous layout**, turn off **Startup settings > Start automatically at login**, then exit the application and helpers. This removes the new `global.editorLayout` preference from the local settings file; older builds strictly reject unknown settings keys. Keep a backup of the local settings file before manually editing it if the new app cannot be opened; remove only `global.editorLayout` and `global.loginStartup` in that recovery case.

Replace test program files using the retained `release/NotebookAid-0.15.18-win-x64.zip` and the established verified portable deployment procedure. Its SHA256 is `21e878eae038e7bca135db59abfa4017ab7bcbc02416f44e8bfe6ae0b301938b`. Notebook bodies and schema require no rollback.

## Startup settings follow-up

Verify the Aurora violet preset name and unchanged colors. Basic settings must be followed by Startup settings and Interface zoom. On a fresh profile, login startup is unchecked, Background is selected and both mode controls are disabled. Enable it, select either mode, restart the app, and verify the saved choice. Then sign out/in to verify the real OS behavior: Window opens the app; Background keeps the tray available. Manual launch always opens the window. Disable login startup before uninstalling or rolling back; this removes the OS login entry and the optional local preference. Settings apply only to the current user, including all-users installations. macOS login-service approval and actual login behavior must be checked on a physical Mac. Automated UI runs simulate OS registration and do not modify the test machine’s login items.

Startup acceptance fix: the adapter now uses the default application identity for both Windows registration and readback; the former custom entry name did not match Electron’s openAtLogin lookup. A native Windows probe verifies both argument modes and removal using a temporary application ID, then checks that its dedicated Run/StartupApproved values are absent. Run with node scripts/login-startup-native-probe.cjs after the desktop build. This probe does not perform logout/login. Confirm 16px spacing above the mode control, enable login startup in the delivered app, switch modes, restart the app and verify the actual desired login behavior.
