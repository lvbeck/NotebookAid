# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**Local notes and AI writing assistant**

*Record locally, think calmly, hear intelligent echoes.*

NotebookAid is an open-source desktop notebook application with an optional Thunderbird addon. Notebooks stay in local folders you choose. AI writing, summaries and translations send note text to the selected provider only when you explicitly request generation.

## Features

- Markdown and HTML rich-text editing within a supported safe subset, plain text, and native Quill Delta notes; unsupported content is protected in source mode.
- Multiple notebooks, nested folders, search, tags, pinned and recent notes, attachments, autosave, version history and a recycle bin.
- Optional note encryption, notebook master passwords and recovery keys, backup and restore, and Windows Passkey application locking.
- Notebook colors and covers, light/dark/system themes, ten interface languages (English, Simplified Chinese, Traditional Chinese for Hong Kong, German, French, Italian, Spanish, Portuguese for Portugal, Japanese and Korean), onboarding and optional collectible Easter eggs.
- Thunderbird integration through local Native Messaging, and Tasks import from ICS files.
- Optional AI assistance using ChatGPT subscription sign-in, Gemini API keys or Claude API keys. Access depends on the provider's account eligibility and terms; the application does not switch providers or billing channels automatically.

## Test downloads

This project is in testing. No formal GitHub Release has been published.

Windows and macOS share the numeric source version 0.15.7. Application and addon versions use major.minor.patch without platform suffixes.

| Platform | Packages | Latest verified test build | Workflow |
| --- | --- | --- | --- |
| Windows x64 EXE | NSIS installer, portable ZIP, Thunderbird XPI files and SHA256 checksums | [EXE / ZIP 0.15.7](https://github.com/lvbeck/NotebookAid/actions/runs/38703093807/artifacts/11957258886) | [Windows builds](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) |
| Windows x64 native MSI | Native Windows Installer package and SHA256 checksums; current-user or all-user installation | [MSI 0.15.7](https://github.com/lvbeck/NotebookAid/actions/runs/38703093807/artifacts/11957099080) | [MSI installation and updates](docs/msi-testing.md) |
| macOS Apple Silicon / Intel | Separate arm64 and x64 DMG/ZIP packages, Thunderbird XPI, ten language setup guides and SHA256 checksums | [macOS 0.15.7 test build](https://github.com/lvbeck/NotebookAid/actions/runs/38703093814) | [macOS builds](https://github.com/lvbeck/NotebookAid/actions/workflows/macos-build.yml) |

To download, sign in to GitHub, open a successful run, then find **Artifacts**:

- Windows: `NotebookAid-windows-x64-test`.
- Native MSI: `NotebookAid-windows-x64-msi-test`. EXE and MSI are separate artifacts; choose one installer type and uninstall the other before switching.
- macOS: `NotebookAid-macos-arm64-test` or `NotebookAid-macos-x64-test`.

Package artifacts are retained for **30 days**. If an older run has expired, use a newer successful run from the workflow page. Verification reports are separate artifacts, retained for 14 days.

Extract the outer artifact archive first. Windows contains the installer in its `installer` directory, a portable ZIP, and both addon XPI files. Extract the portable ZIP before running `NotebookAid.exe`. For macOS, use the package matching your processor. Back up notebooks before testing; replacing program files is not a data rollback.

## Platform status and limitations

Starting with 0.15.7, each macOS test artifact also contains NotebookAid.xpi, INSTALL.md and ten language guides in Guides/. Follow these guides to install the addon and register its current-user bridge without downloading a Windows package.

| Platform | Current status |
| --- | --- |
| Windows 11 x64 | Local testing and Windows CI checks are available. The installer supports current-user and all-user installation; administrator all-user installation and the full high-DPI matrix still need manual validation. |
| Windows 10 x64 | Intended support target; not yet verified on a real Windows 10 machine. |
| macOS arm64 / x64 | CI builds and packaged UI/editor checks pass. Real-world installation, Thunderbird, Keychain and live AI-account testing remain pending. Passkey application locking is not supported in this macOS test version; existing locks are not silently removed. |
| Linux | No packaged test builds are currently provided. |

Thunderbird's current project baseline is Release 157.0.1. Newer releases and ESR need separate compatibility validation. See the [Windows CI guide](docs/windows-ci-testing.md) and [macOS guide](docs/macos-testing.md) (Chinese) for checks, installation and rollback details.

## Signing, updates and privacy

- **Windows test packages are unsigned.** The maintainer has submitted the SignPath Foundation application and is awaiting review; signing has not been approved or enabled.
- macOS test applications use ad-hoc signing, without Developer ID signing or Apple notarization. Gatekeeper may block them; do not disable system-wide security protections to run a test build.
- An update mechanism exists, but current test packages have no active automatic-update feed. The GitHub update address is reserved for future signed releases; Actions artifacts are not an update feed.
- Native MSI updates use a separate GitHub-hosted `latest-msi.json` channel, signature and product verification, and Windows Installer after confirmation. All-user updates may require UAC approval. MSI never installs an NSIS update. See the [MSI guide](docs/msi-testing.md).
- AI authentication, model checks and authorized token renewal can contact the selected provider. Note text is sent for explicit generation requests. Local storage does not mean the application is always offline.

The EXE and native MSI wizards support ten languages. Simplified Chinese uses Microsoft YaHei. DMG/ZIP packages include the ten-language app and setup guides; they have no Windows-style wizard. Defender scanning of these test packages does not establish why Chrome blocked a previous archive or guarantee that Safe Browsing will accept them. See [Chrome download protection](https://support.google.com/chrome/answer/6261569?hl=en).

Read the [Code signing policy](docs/code-signing-policy.md) and [Privacy statement](docs/privacy.md) (English).

## Run from source

Use Node.js **24.x** (24.15 or newer); CI uses **24.21.0**. Dependencies are pinned in `package-lock.json`. Windows builds also require PowerShell and the Windows .NET Framework C# compiler. Native MSI builds additionally require Visual C++ x64 build tools and the Windows SDK. Build macOS packages on macOS.

From the repository root:

```sh
npm ci
npm run build
npm run test:platform
npm start
```

## Build test packages

Windows PowerShell:

```powershell
npm run package
npm run installer
npm run installer:msi
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

EXE installers are written to `release/installer`, native MSI packages to `release/msi`, and portable ZIP/addons to `release/`. The bundle script includes the portable ZIP, Thunderbird addons and checksums. See the [Windows build guide](docs/windows-ci-testing.md) (Chinese).

macOS Terminal, on the matching architecture (replace `arm64` with `x64` for Intel):

```sh
node scripts/create-macos-icon.cjs
npm run package:mac -- arm64
npm run installer:mac -- arm64
node scripts/build-macos-addon.cjs
```

Outputs are written to `release/macos`. These commands produce test packages, not a formal release. Build directories may be recreated; do not store personal notebooks in `dist/`, `release/` or `output/`.

## Documentation and development history

Most technical and acceptance documents are currently in Chinese. An English README does not imply that every linked document has been translated.

The implementation uses Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging and Lucide. Exact dependency versions are recorded in the lockfile.

| Document | Purpose |
| --- | --- |
| [Requirements](docs/requirements.md) | Confirmed features, boundaries and future scope |
| [Architecture](docs/architecture.md), [data model](docs/data-model.md), [API contract](docs/api-contract.md) | Design and shared local core |
| [Wireframes](docs/wireframes.md) | UI planning |
| [Implementation plan](docs/implementation-plan.md) | Authoritative task progress and acceptance records |
| [Acceptance checklist](docs/acceptance.md), [testing history](docs/testing-history.md) | Current and historical validation guides |
| [Sources and licenses](docs/sources-and-licenses.md) | Dependencies and third-party notices |
| [Working instructions](AGENTS.md) | Contribution scope and development conventions |

Historical milestone statuses and local-only package paths are kept out of the main download section. Windows Explorer “New” menu integration remains shelved; Gemini Notebook synchronization remains future scope. Automated checks do not replace user acceptance or the manual validation listed above.

## License and contact

[BSD-3-Clause](LICENSE). Copyright © 2026 Jin Lu. Third-party components retain their respective licenses.

Contact: [it@live.cn](mailto:it@live.cn).
