# Native MSI testing and GitHub updates

The native MSI is a separate Windows Installer package, not an EXE wrapper. ProductName and the Windows Installed Apps display name are always **NotebookAid**; ProductVersion is the shared numeric application version. MSI and EXE packages are separate installation families. Do not install them over one another in the same directory. Uninstall the previous package first; notebook folders and application settings are retained.

## Test downloads

- [EXE installer and portable ZIP](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): artifact `NotebookAid-windows-x64-test`.
- [Native MSI installer](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): artifact `NotebookAid-windows-x64-msi-test`.
- Sign in to GitHub and select a successful run. Test packages expire after 30 days. No formal Release or update feed has been published. Both Windows test installers are unsigned.

## Installation

The MSI wizard offers a ten-language selector (English, Simplified Chinese, Traditional Chinese for Hong Kong, German, French, Italian, Spanish, Portuguese for Portugal, Japanese and Korean), defaults to the supported Windows UI language, and offers current-user or all-user installation, an installation folder, and optional desktop and Start menu shortcuts (desktop off and Start menu on by default). The app and EXE wizard support the same ten interface languages. Simplified Chinese uses Microsoft YaHei, Traditional Chinese uses Microsoft JhengHei, Japanese uses Meiryo and Korean uses Malgun Gothic. The original BSD license text remains English. Windows Installer service diagnostics and technical custom-action details can remain in English. All-user installation requires administrator permission and a subdirectory of Program Files. Install, upgrade, repair and uninstall require NotebookAid and its native helpers to be fully closed. The package rejects existing NSIS installations, cross-scope/path changes and another directory's bridge registration instead of overwriting them. Remove an old portable bridge using that portable copy's registration script before installing MSI. All-user installation also rejects a current-user bridge that would take precedence; other users must remove their own obsolete per-user bridge registrations when applicable.

PowerShell examples (replace the version and package path):

```powershell
msiexec.exe /i "NotebookAid-0.15.7-Setup-x64.msi" ALLUSERS=2 MSIINSTALLPERUSER=1 /l*v "$env:TEMP\NotebookAid-msi.log"
msiexec.exe /i "NotebookAid-0.15.7-Setup-x64.msi" ALLUSERS=1
msiexec.exe /fa "NotebookAid-0.15.7-Setup-x64.msi" ALLUSERS=2 MSIINSTALLPERUSER=1
msiexec.exe /x "NotebookAid-0.15.7-Setup-x64.msi"
```

For unattended deployment add `/qn /norestart`. Set `INSTALLDESKTOPSHORTCUT=0` or `INSTALLSTARTMENUSHORTCUT=0` to omit a shortcut. Keep the original installation scope and directory for upgrades. The MSI update worker also preserves the installed shortcut choices. Windows Installer owns installed files and rolls back failed transactions; unowned files are preserved. Uninstall removes only Native Messaging values still pointing to this installation. Installing an older version is rejected; for deliberate rollback uninstall the current application and reinstall the retained previous package after backing up notebooks. Application rollback is not notebook data rollback.

## GitHub-hosted MSI updates

GitHub Releases can host MSI updates, but electron-updater does not implement native MSI updates. NotebookAid therefore uses a separate MSI channel, never the EXE/NSIS `latest.yml` channel. Actions artifacts are test downloads, not the production update source.

Future signed builds can set `NOTEBOOKAID_MSI_PUBLISHER` to the certificate's exact publisher name at build time. This creates resources/msi-update.json pointing to:

`https://github.com/lvbeck/NotebookAid/releases/latest/download/latest-msi.json`

Once signing is approved and a formal release is explicitly authorized, publish a signed MSI with the exact product identity and a manifest such as:

```json
{
  "version": "0.15.6",
  "url": "https://github.com/lvbeck/NotebookAid/releases/download/v0.15.6/NotebookAid-0.15.7-Setup-x64.msi",
  "sha256": "REPLACE_WITH_THE_SIGNED_MSI_SHA256",
  "size": 123456789
}
```

The app checks for newer versions, downloads with progress, verifies the exact size and SHA256, then verifies Authenticode trust, the expected publisher, ProductName, ProductVersion and UpgradeCode. Installation requires explicit user confirmation and successful saving of pending changes. The launcher rechecks the package while holding a read lock, waits for the app to exit, and starts msiexec in the existing scope and directory. All-user updates may request UAC approval. Canceling or failing installation does not silently switch package types or disable signature verification. Restart the app manually after the installer finishes.

Current unsigned test packages contain no active MSI update configuration. Real signed online updates remain pending a signing certificate and a future authorized release.

## Validation and licenses

GitHub CI builds the production MSI and separate synthetic older/failing MSI fixtures. It verifies current-user and all-user installation, fixed display name and version, single uninstall entry, reinstall, repair, upgrade, rollback, downgrade rejection, cross-scope rejection and preservation of unowned files/bridge registration. Synthetic fixtures are not historical release binaries and are not uploaded as installers. Actual results and remaining manual tests are recorded in implementation-plan.md after each run. Real Windows 10/11 wizard, standard-user/UAC and signed network updates still require device testing.

The unchanged WiX toolset archive is pinned by electron-builder 26.15.3 with SHA256 `fe677fcd837b18c9b912985d91636bbd8a1e800c3b3a6a841b6f96e89624e839`. Its Microsoft Reciprocal License (MS-RL) and source notice are included in the MSI payload as WIX-LICENSE.txt and WIX-NOTICE.txt. The installer UI and custom action source are authored in this repository; no WiX UI/custom-action runtime DLL is embedded. No new npm runtime dependency is introduced. See [WiX source](https://github.com/wixtoolset/wix3), [MSI support](https://www.electron.build/v26/docs/msi/), [dual-purpose packages](https://learn.microsoft.com/en-us/windows/win32/msi/single-package-authoring) and [rollback actions](https://learn.microsoft.com/en-us/windows/win32/msi/rollback-custom-actions).

## Verified 0.15.6 test build

Source commit 1e41f74: [Windows test run](https://github.com/lvbeck/NotebookAid/actions/runs/38690187888) succeeded. Separate [EXE / portable ZIP](https://github.com/lvbeck/NotebookAid/actions/runs/38690187888/artifacts/11951594701) and [native MSI](https://github.com/lvbeck/NotebookAid/actions/runs/38690187888/artifacts/11951974541) downloads require GitHub sign-in and expire after 30 days.

All 15 native MSI report flags passed on the disposable Windows Server 2022 administrator runner, including current-user/all-user installation, repair, first-install and upgrade deferred-failure rollback, downgrade/scope protection, preservation of external state and rejection of the actual unsigned package. The production MSI contains no failure-fixture DLL. Four ICE105 static warnings remain for machine-only operations inside the dual-purpose package; both execution contexts passed their live checks. Both installer signatures are NotSigned; real Windows 10/11 wizard, standard-user/UAC and trusted signed online-update tests remain pending.

Before switching from a registered portable copy, fully exit NotebookAid and Thunderbird, then run the old copy's Register-Bridge.ps1 with -Remove from that copy's program folder. Do not run the removal command from an unrelated installation. Uninstall an existing EXE edition before choosing MSI. Notebook data and settings remain outside the application payload.

## Version 0.15.7 localization verification

The installer language can also be selected for unattended deployment using `NA_LANGUAGE=en`, `zh-CN`, `zh-TW` (Hong Kong wording), `de`, `fr`, `it`, `es`, `pt-PT`, `ja` or `ko`. For example, `msiexec.exe /i "NotebookAid-0.15.7-Setup-x64.msi" NA_LANGUAGE=ja ALLUSERS=2 MSIINSTALLPERUSER=1`. Invalid language IDs fail closed. The installer writes the selected language into its owned installation metadata; existing application preferences remain authoritative.

`scripts/verify-msi-localization.ps1` opens the built MSI and executes only its property-setting localization action for all ten languages, checking 37 texts and both font properties for each. It does not execute an installation sequence. This does not prove visual layout, high-DPI behavior or screen-reader interaction. The disposable CI installation test additionally exercises Simplified Chinese current-user and Japanese all-user installations, upgrades, repair and rollback.

Chrome blocks reported as “This file is dangerous” require investigation for both the EXE artifact ZIP and MSI artifact ZIP. The unsigned state alone does not establish why Safe Browsing blocked a particular download. Verify the successful Actions run, exact inner-file SHA256 and available antivirus results; do not rename the archive or disable browser/system protection to bypass the warning. Signing approval is still pending and signing cannot guarantee removal of a security verdict. See [Chrome download protection](https://support.google.com/chrome/answer/6261569?hl=en).
