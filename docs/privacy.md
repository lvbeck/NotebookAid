# NotebookAid privacy statement

Updated on 14 October 2026. This statement describes the current implementation and in-app privacy information. It is not a claim of SignPath approval.

## Local information

Notes, attachments, settings, notification history and notebook metadata are stored locally. Users choose notebook locations. Encryption is optional; unlocked notebooks may display decrypted content. Exports, backups, prints and recovery-key PDFs may contain sensitive information, and users control their destination and protection.

NotebookAid does not operate a developer-hosted note-sync service. Personal notebooks, passwords and provider credentials are excluded from the public repository and build artifacts. Users can nevertheless choose to disclose information through AI requests, exports or messages they send to the maintainer.

## Optional AI providers

Users select and authorize ChatGPT/OpenAI, Gemini/Google or Claude/Anthropic. Authentication and model checks contact that provider. Note text and additional instructions are sent when users explicitly request generation, according to the selected scope. Credentials are retained in locally protected storage. After authorization, ChatGPT token renewal may run while the application is running and unlocked. Provider processing follows its terms and privacy policy.

- [OpenAI privacy policy](https://openai.com/policies/privacy-policy/)
- [OpenAI enterprise and API privacy information](https://openai.com/enterprise-privacy/)
- [Google privacy policy](https://policies.google.com/privacy)
- [Anthropic privacy policy](https://www.anthropic.com/legal/privacy)

## Thunderbird

The addon communicates with the local application through Native Messaging. Access to encrypted or hidden notes remains subject to notebook security rules. This integration is not a developer-hosted cloud service.

## Updates and signing

Current unsigned Windows test builds have no active update feed. Future signed installed builds may contact configured GitHub Releases for enabled automatic or manual checks and downloads. These interactions may expose normal request information, including the requesting IP address, to the hosting service.

[GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

If approved, SignPath would receive public-source build artifacts and signing-request metadata through the build pipeline. Personal notebooks, keys and credentials must not be included. Signing is not integrated at present. The separate service application shares applicant form information under the [SignPath privacy policy](https://signpath.io/privacy-policy).

## Contact

Project maintainer: Jin Lu. Public project contact: it@live.cn. Repository: https://github.com/lvbeck/NotebookAid.
