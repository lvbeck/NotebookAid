# T08 security design

## Confirmed scope

The user accepted T07 and authorized T08. Global master-password defaults are off. Each notebook has an independent password and recovery key. Encryption is selected per note. The final Passkey decision is: unlock the application with a Passkey, then unlock encrypted notebooks with their passwords. A Passkey never derives or unwraps a notebook key. T09 backup scheduling and T10 Thunderbird note integration are not implemented here.

## Notebook encryption

- Node.js crypto implements AES-256-GCM with a random 256-bit notebook key, fresh 96-bit nonce and 128-bit authentication tag per payload. AAD binds the format version, notebook ID and canonical note/revision/attachment path. Payloads start with `NASEC001`.
- The password wrapping key uses scrypt N=131072, r=8, p=1, a random 128-bit salt and a 192 MiB memory ceiling. New passwords require at least 10 characters and at most 1024 UTF-8 bytes. Parameters are fixed and checked, not accepted from untrusted arbitrary keyring settings.
- The recovery key is independently random, 256 bits, displayed once as `NA1-` plus hexadecimal groups. Only a notebook key wrapped by that recovery key is stored. The recovery key is not in the notebook or backup. Password changes and recovery rewrap the same notebook key without rewriting every attachment.
- Schema 7 stores `keyring.json` and per-note `security.json`. Selected note revision metadata (title, tags, attachment names and other note fields), bodies and all attachment blobs are encrypted. This includes existing history and detached attachments retained for history. Folder names, shared tag definitions, random identifiers, revision counters, sizes and timestamps remain visible.
- Search/catalog storage is in memory whenever a keyring exists; prior disk indexes are removed. SQLite temporary storage is also in memory. Locked notes are excluded before pagination and counts. The core rejects direct note, history and attachment access while locked.
- Encryption removes plaintext request fingerprints from legacy recovery journals; new encrypted saves keep them only in encrypted revision metadata. Replay validation reads that protected metadata. Revision integrity hashes and import transaction fingerprints remain visible, so this format does not conceal all structural or equality information.
- Conversion verifies all readable history and attachment hashes, builds and checks a new note tree, fsyncs it, then journals an atomic directory swap. Startup completes a prepared swap and removes the prior tree. Incomplete preparation can be discarded while the original remains intact. It never discards an original before the replacement is durable and verified.
- Encryption cannot securely erase SSD blocks, OS paging/crash data, external plaintext files, previously exported copies or old backups. Decryption deliberately writes plaintext. Keep a separate notebook copy before testing an irreversible recovery-key loss or storage-corruption scenario; use only disposable test data for fault injection.
- Locked keys are zeroed where held in Buffers. JavaScript strings and runtime/OS copies cannot be guaranteed securely erased; the UI clears note/editor/history/attachment/export state, closes dialogs, and application locking reloads the renderer. This is not a defense against a compromised unlocked OS or malicious local administrator.

## App Passkeys

- Windows native WebAuthn is called through a small .NET Framework helper. This avoids granting arbitrary web authentication origins to the Electron renderer. The helper only handles authentication data, never notebook passwords, keys or note content.
- The local RP identifier is `notebookaid.local`, with client origin `https://notebookaid.local`. It is an authentication identifier, not a hosted NotebookAid service. There is no NotebookAid account backend.
- A resident/discoverable ES256 credential and user verification are required. Windows controls Windows Hello/security key/phone choices. On supported Windows 11 builds, the phone option provides the cross-device QR flow. iPhone/iCloud support must be verified on the user's actual devices; the API probe alone does not prove that flow works.
- `@simplewebauthn/server` verifies registration and assertion data, origin, challenge, RP hash, user verification, credential ID, user handle and signature/counter. Random challenges are short lived, single use, and invalidated by locking or cancellation. Signature verification in progress cannot unlock after a subsequent lock.
- Only public credential material, counters and a random local user handle are persisted in the application data directory. Private Passkeys remain with the authenticator/keychain. Adding another key or disabling protection requires a fresh assertion once protection exists.
- Startup uses a separate lock screen. Note/settings/notification IPC is denied until main-process verification succeeds. There is no renderer-controlled unlock boolean. Native file dialogs remain native, and Windows Security must also remain native because it owns the authenticator ceremony; normal app confirmations use the existing CDK dialog.
- The app lock protects app access, not plaintext notebook files against direct filesystem access. A local user able to modify application files/configuration is outside that boundary. Lost Passkeys can require recovering the synced keychain or resetting the local application-lock configuration; neither action recovers notebook passwords. Do not remove notebook `keyring.json` to reset an app lock.
- Optional cross-device authentication may use Windows/Apple network services and Bluetooth; no note body or notebook key is supplied to them by NotebookAid.

## Locking and import/export

Idle locking checks 15 minutes of trusted keyboard/pointer/wheel inactivity. It requests a save and locks only when the renderer reports no pending or failed edits. A failed save retains the draft and postpones locking. Switching notebooks and exiting discard the in-memory notebook key. App locking also locks the current notebook. Unlocking the app does not unlock that notebook.

Encrypted cross-notebook import prompts for the source password, requires target protection to be set up and unlocked, decrypts in memory and re-encrypts with the target key. The source is opened read-only and stays unchanged, including its schema. Source keys and import plans are cleared after import, cancellation, switching or locking. Plaintext sources remain plaintext unless the user explicitly encrypts imported notes.

Markdown, HTML, TXT, native Delta exchange packages and exported attachments are plaintext exports, even when the source note is encrypted. The app asks for confirmation for encrypted-note exports. Native exchange still supports 50 attachments, 20 MiB each, 200 MiB total; it is not an encrypted backup format.

The core addon facade filters hidden notes independently of encryption and returns generic invalidation events without note identifiers/content. The actual Thunderbird note-reading transport is planned in T10; this task does not claim an end-to-end Thunderbird privacy test.

## Reference material

- [Node.js crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html)
- [OWASP password storage recommendations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Microsoft native WebAuthn APIs](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/webauthn-apis)
- [Microsoft creating and saving Passkeys](https://support.microsoft.com/en-us/accounts-billing/security/create-save-passkey)
- [SimpleWebAuthn verification](https://simplewebauthn.dev/docs/packages/server)

This implementation uses reviewed platform/library primitives; it has not undergone an independent security audit.
