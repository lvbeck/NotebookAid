# NotebookAid working instructions

## Scope and communication

- Work only in `C:\Projects\ws\NotebookAid` unless the user explicitly expands scope.
- The user authorizes replacing portable test program files in `C:\Softwares\NotebookAid-win32-x64` after each completed development step and ZIP delivery. Run `scripts/Prepare-TestPortable.ps1` after package verification: check for running processes, links and user data; validate the retained release ZIP; do not create folder backups or retain extracted staging copies; clear its contents; extract the ZIP contents with NotebookAid.exe directly at the target root; verify hashes. Use retained version ZIPs for rollback. Request tool approval when the filesystem boundary requires it. Never force-stop the app or delete detected user data without resolving that condition. This deployment does not approve the task or authorize the next task.
- Respond in Chinese for technical discussions. Use English for code, identifiers, code comments, and commit messages.
- Treat `docs/requirements.md` as the product baseline and `docs/implementation-plan.md` as the task and approval register. Later direct user decisions override earlier documents; update affected documents within the authorized task.
- Distinguish confirmed requirements, proposed defaults, technical hypotheses, and verified behavior.
- Preserve the agreed Electron, TypeScript, Angular, Quill 2.x, SQLite, Native Messaging, and Lucide route. Verify exact versions before locking them.

## Mandatory task gate

- Execute one numbered task at a time. Do not start the next task until the user explicitly approves the current task and authorizes continuation.
- Completing automated checks is not user acceptance. Silence, elapsed time, or a request to fix the current task is not approval to advance.
- Report deliverables, actual checks, limitations, user test steps, and rollback instructions at each handoff. Mark the task as awaiting user acceptance.
- Keep approval records factual; quote or summarize an actual user approval before marking a task approved.
- Use the local Git repository on branch main. After the user explicitly accepts a development task, commit that task's scoped source, tests, documentation and assets with an English commit message and report the commit hash. Do not commit tasks awaiting acceptance, or treat authorization to start a task as acceptance. Inspect the diff and staged files before committing; exclude generated packages, dependencies, test output and secrets. Do not push or configure a remote without explicit authorization. The first baseline commit must wait for T04 acceptance because the current tree already contains T04 changes; do not fabricate separate historical task commits.
- Fix failed acceptance within the current task, then request retesting. Do not create separate chats, automations, or delegated agents merely because the plan contains subtasks.

## Implementation boundaries

- Use minimal scoped changes. Do not perform unrelated refactoring, upgrades, publishing, or remote Git operations without authorization.
- Keep shared business logic independent of Angular and Thunderbird. All writes go through one local core.
- Treat the Electron renderer and addon requests as untrusted inputs. Validate permissions and data in the core.
- Do not store credentials or decrypted private content in source control, logs, analytics, or browser storage.
- Do not automatically send note content to AI, switch providers, or change the billing channel.
- Implement encryption with reviewed libraries and an explicit key/recovery design; do not invent cryptographic primitives.
- Retain third-party licenses. The project license is BSD-3-Clause, copyright Jin Lu, contact it@live.cn.

## Validation

- Run checks appropriate to the active task. Report exactly which checks ran and which did not.
- Static checks do not establish Windows installation, Electron GUI, Thunderbird integration, real AI access, or recovery behavior.
- Use simulated providers for automated AI tests; distinguish user-run real account tests in the acceptance record.
- Keep documentation links relative inside the repository. Keep task status and requirement traceability consistent.
