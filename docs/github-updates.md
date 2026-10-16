# GitHub update build preparation

## Current policy

Windows signing is suspended after the SignPath application was not approved. Windows builds remain unsigned and automatic updates remain disabled. macOS keeps its existing ad-hoc test signing and manual downloads; this task does not activate macOS updating or notarization.

The authoritative build policy is [github-updates.json](../config/github-updates.json):

- Repository: `https://github.com/lvbeck/NotebookAid`.
- Reserved NSIS feed base: `https://github.com/lvbeck/NotebookAid/releases/latest/download/`.
- Reserved MSI feed: `https://github.com/lvbeck/NotebookAid/releases/latest/download/latest-msi.json`.
- Windows mode: `prepare-only`; publisher: `null`; signature verification: mandatory.
- macOS mode: `manual`.

These reserved URLs do not create a Release or turn on updates. Ordinary test packages continue to omit active feed configuration. Setting old update environment variables while the policy is `prepare-only` fails the build instead of silently enabling a feed. Previously saved GitHub repository variables are not automatically exposed to workflow commands.

## Manual GitHub Actions build

After the accepted changes have been explicitly authorized for push to the default branch:

1. Open GitHub **Actions → Windows update candidates (no release)**.
2. Choose **Run workflow**, select the reviewed branch, and start it.
3. Download `NotebookAid-windows-update-candidate-<run-id>` after success. The verification artifact contains scan/localization/UI reports.

The workflow only runs through `workflow_dispatch`. It builds EXE/MSI and verified XPI resources, runs regression/UI/localization checks, and scans EXE/MSI/portable ZIP. Its token has only `contents: read`. It uploads Actions artifacts, never creates a tag or GitHub Release, and never calls a publishing command. Existing Windows/macOS test workflows continue unchanged.

Candidate contents:

| File | Purpose |
| --- | --- |
| `candidate-latest.yml` | NSIS update metadata example: version, EXE size and SHA-512 |
| `candidate-latest-msi.json` | MSI metadata example: version, tagged asset URL, size and SHA-256 |
| `NotebookAid-<version>-Setup-x64.exe` and `.blockmap` | Test EXE and blockmap |
| `NotebookAid-<version>-Setup-x64.msi` | Test native MSI |
| `update-build-report.json` | Version, disabled status, unpublished status and SHA-256 inventory |
| `README.txt` | Explicit unsigned/inactive warning |

**Do not rename candidate metadata to `latest.yml` or `latest-msi.json`, or upload it as a live feed.** Actions artifact URLs are temporary test downloads, not the reserved update feed. No GitHub token belongs in an installed application's update configuration.

## Local candidate verification

Run from the repository in Windows PowerShell after the normal build/package steps:

```powershell
npm run build
npm run package
npm run installer
npm run installer:msi
node scripts/prepare-github-updates.cjs --candidate
```

The output is `release/update-candidate/`. The script rejects active feed configuration in the NSIS or MSI payload. Output must be empty: move an earlier candidate to a retained directory before rerunning; no previous package or candidate is deleted automatically. Final hashes are calculated from the installer bytes actually copied into the candidate.

## Future signed activation — deferred

The signature integration itself is **not implemented or enabled by this task**. Resume only after a suitable signing certificate/service and explicit activation authorization are available.

1. Integrate signing for application/helper EXEs, both payloads and final EXE/MSI installers. Regenerate the NSIS payload integrity inventory after signing; preserve signed bytes through packaging. An MSI build recompiles its own helper, so signing only the NSIS source directory is insufficient.
2. Change the reviewed policy to Windows `signed` and set the actual certificate publisher. `NOTEBOOKAID_UPDATE_PUBLISHER` may supply that name at build time; `NOTEBOOKAID_MSI_PUBLISHER`, if supplied, must match. `NOTEBOOKAID_UPDATE_URL`, if supplied, must equal the reserved base URL. Secrets/private signing material must stay in the selected signing service or GitHub Secrets.
3. Rebuild installed packages with `resources/app-update.yml` for NSIS and `resources/msi-update.json` for MSI. Old unsigned test installations need a manual installation of this first properly configured signed version.
4. Run `node scripts/prepare-github-updates.cjs --signed`. It verifies matching packaged feeds, payload inventory, trusted Authenticode signatures, certificate publishers and product versions before creating `release/update-ready/latest.yml` and `latest-msi.json`. It also verifies application/helper EXEs in both payload directories. No signature bypass or simulated success switch is exposed by the CLI.
5. Test an installed signed version upgrading to a higher signed version, including save/confirmation, cancellation, signature/publisher/hash rejection, EXE/MSI separation and user/machine install contexts. The current stable MSI validator requires tag `v<version>` and exact asset name `NotebookAid-<version>-Setup-x64.msi`; it does not use an arbitrary preview-feed URL.
6. Only after separate publication approval upload the verified final installers, blockmap and metadata together to the matching GitHub Release. The finalizer does not upload anything. A draft Release is not a working `/releases/latest/download/` source; do not point production clients at missing assets. Test-channel work, if required, is a separate scoped change.

macOS remains manual in this policy. No `latest-mac.yml` is generated. Its signing/feed activation and the platform-specific readiness check remain deferred.

## Verification boundaries and rollback

Automated fixture tests can establish candidate naming/hashes, configuration gates and unsigned-file rejection. They do not establish trusted signed EXE/MSI updating, signing service availability, an actual GitHub Actions run, GitHub publication or macOS updating.

This task changes build infrastructure only. It does not migrate notes, change the installed application version, replace the accepted portable test directory or activate an update feed. To roll back the infrastructure change, restore its scoped configuration/scripts/workflow from Git; do not delete accepted program packages or notebook data.

References: [electron-builder v26 auto-update](https://www.electron.build/v26/docs/features/auto-update/), [GitHub workflow dispatch](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch).
