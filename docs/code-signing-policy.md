# Code signing policy

Updated 16 October 2026. The maintainer reported that the SignPath Foundation application was not approved. Windows signing is suspended and current Windows test packages remain unsigned. GitHub update builds prepare inactive candidates only; macOS remains on manual updates. The following SignPath-specific arrangements are historical proposals, not an active signing service.

## Project and proposed roles

- Project: NotebookAid, https://github.com/lvbeck/NotebookAid
- License: BSD-3-Clause, copyright Jin Lu.
- Proposed author, reviewer and signing approver: Jin Lu, https://github.com/lvbeck
- Contact: it@live.cn

The maintainer must confirm these roles and enable multi-factor authentication for GitHub and SignPath before signing is enabled. External contributions must be reviewed before inclusion in a signing build. Every signing request requires explicit approval by the authorized signing approver.

## Planned scope and controls

Only eligible NotebookAid executable artifacts built from public project source and reviewed build scripts will be submitted. The exact scope, including the Electron-based application executable and native helpers, must be agreed with SignPath. Original upstream binaries must not be re-signed using the project's entitlement. Bundled third-party notices remain intact.

Build provenance, product metadata and final-byte checksums must be verified. Credentials must not be stored in source control or exposed to untrusted contribution workflows. A signing failure blocks delivery as a signed package. Signing approval and publication approval are separate actions.

## Attribution after approval

Only after approval and actual service activation, replace this section with the required acknowledgment:

> Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

Until then, the homepage and download documentation must state that packages are unsigned and the SignPath application was not approved and Windows signing is suspended. This acknowledgment must not be presented as existing sponsorship before approval.

## Privacy and distribution

See the [privacy statement](privacy.md). Personal notebooks, keys and AI credentials must not be part of build or signing artifacts. Optional AI authorization and generation contact selected providers; authorized token renewal and enabled update checks may run in the background. No unconditional offline-operation claim is made.

Current downloads are temporary GitHub Actions test artifacts. No formal release or signed automatic update channel is active. Further publication requires the user's explicit authorization.

The intended Windows test-download page is the [Windows workflow](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml). Official program conditions are available from [SignPath Foundation](https://signpath.org/terms.html); eligibility and signing scope remain subject to its review.
