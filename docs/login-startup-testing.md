# Login startup settings

User acceptance on 2026-10-19 covers login startup and the corrected spacing. The delivered application version remains 0.15.19.

## Behavior

Startup settings follow Basic settings. Automatic startup is off by default. Window/Background mode controls are disabled while off, and Background is initially selected. Enabling registers the packaged application for the current OS user; disabling removes its login entry and optional local preference. Manual launch opens the window. Background login launch keeps the tray available. The mode control has 16px space above it. Labels support all ten application languages.

Windows registration and openAtLogin readback use the same default application ID. macOS uses the main application login service and its login-launch marker. Development builds cannot register themselves. Registration or settings-write failures attempt to restore the previous OS registration and preserve the previous preference.

## Verification

The accepted delivery passed 16 targeted settings/adapter regressions, development/packaged UI checks for defaults, disabled states, ordering, mode persistence, failed-write radio restoration, ten locales and spacing, plus a native Windows probe for registration/readback/removal using a unique temporary identity. Dedicated probe registry values were confirmed absent afterward. Actual OS logout/login and physical macOS behavior were not independently exercised by the assistant.

After compiling the desktop, run:

~~~powershell
node --test test/settings.test.cjs test/login-startup.test.cjs
node scripts/login-startup-smoke.cjs
node scripts/login-startup-native-probe.cjs
~~~

The UI fixture uses isolated settings and skips actual OS registration. The native probe temporarily creates and removes only its unique test startup value. Relevant evidence is under output/login-startup-fix-*.log and output/login-startup-native/1792412719888/report.json; generated output is excluded from Git.

## Rollback

While the new application is available, disable automatic startup before restoring an older program ZIP. This removes the OS login item and global.loginStartup, which older strict settings readers do not accept. If recovering manually, first back up the local settings file and remove only global.loginStartup. OS login items must also be disabled in system settings if the application cannot remove them. Notebook contents require no migration or rollback.
