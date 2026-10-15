# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**Note locali e assistente di scrittura IA**

*Annota in locale, pensa con calma, ascolta echi intelligenti.*

NotebookAid è un’applicazione desktop open source per note, con un componente Thunderbird facoltativo. I taccuini restano nelle cartelle locali scelte. Scrittura IA, riassunti e traduzioni inviano testo al fornitore selezionato solo quando richiedi esplicitamente la generazione.

## Funzionalità

- Modifica avanzata Markdown e HTML in un sottoinsieme sicuro, testo semplice e Quill Delta nativo. I contenuti non supportati sono protetti in modalità sorgente.
- Più taccuini, sottocartelle, ricerca, etichette, note fissate e recenti, allegati, salvataggio automatico, cronologia e cestino.
- Cifratura facoltativa, password principale e chiave di recupero per taccuino, backup e ripristino, blocco Windows Passkey.
- Colori e copertine, temi chiaro/scuro/sistema e dieci lingue: inglese, cinese semplificato, cinese tradizionale (Hong Kong), tedesco, francese, italiano, spagnolo, portoghese (Portogallo), giapponese e coreano. Guida iniziale e raccolta facoltativa di uova nascoste.
- Integrazione Thunderbird tramite Native Messaging locale e importazione Tasks da ICS.
- IA facoltativa con abbonamento ChatGPT o chiavi API Gemini/Claude. Si applicano requisiti e condizioni del fornitore; nessun cambio automatico di fornitore o fatturazione.

## Download di prova

Sono artefatti di prova, senza pubblicazione ufficiale. Windows e macOS condividono una versione numerica. Accedi a GitHub, apri un’esecuzione riuscita e scarica gli Artifacts.

- [Installazione EXE / ZIP portabile](https://github.com/lvbeck/NotebookAid/actions/runs/38703093807/artifacts/11957258886): `NotebookAid-windows-x64-test`.
- [Installazione MSI nativa](https://github.com/lvbeck/NotebookAid/actions/runs/38703093807/artifacts/11957099080): `NotebookAid-windows-x64-msi-test`.
- [Pacchetti macOS](https://github.com/lvbeck/NotebookAid/actions/runs/38703093814): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## Installazione e limiti

Estrai prima lo ZIP esterno. EXE e MSI sono artefatti distinti e supportano l’utente corrente o tutti gli utenti. Disinstalla l’altro tipo prima di cambiare. Il nome resta NotebookAid. MSI offre dieci lingue; il cinese semplificato usa Microsoft YaHei.

macOS offre DMG/ZIP arm64 per Apple Silicon e x64 per Intel, NotebookAid.xpi e dieci guide per componente e bridge. I DMG/ZIP non hanno una procedura guidata di tipo Windows.

Pacchetti conservati 30 giorni, rapporti 14. Dopo la scadenza scegli un’esecuzione riuscita più recente. Esegui il backup dei taccuini prima delle prove: sostituire il programma non ripristina i dati.

## Firma, aggiornamenti e privacy

I pacchetti Windows di prova non sono firmati. La richiesta SignPath Foundation è in attesa. Chrome può bloccare i download: la sola assenza di firma non dimostra un falso positivo. Conserva l’avviso e verifica origine e SHA256, senza disattivare le protezioni generali.

macOS usa una firma ad hoc, senza Developer ID o autenticazione Apple. Restano da verificare Mac reali, Thunderbird, Keychain e account IA. Il blocco Passkey non è supportato in questa versione macOS. Anche Windows 10 richiede prove reali.

Le prove non hanno una fonte di aggiornamento attiva. MSI usa un canale GitHub latest-msi.json separato e firmato, quindi Windows Installer dopo conferma; mai NSIS. Gli artefatti Actions non sono un feed di aggiornamento. Autenticazione IA, modelli e rinnovi autorizzati possono collegarsi alla rete; il testo viene inviato solo su generazione esplicita.

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## Esecuzione e compilazione

Usa Node.js 24.x (almeno 24.15; CI: 24.21.0). Windows richiede PowerShell e il compilatore C# .NET Framework; MSI richiede anche Visual C++ x64 e Windows SDK. Compila i pacchetti macOS su macOS.

```sh
npm ci
npm run build
npm run test:platform
npm start
```

Windows PowerShell:

```powershell
npm run package
npm run installer
npm run installer:msi
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

`release/installer` · `release/msi` · `release/`

macOS Terminal (Apple Silicon: arm64; Intel: x64):

```sh
node scripts/create-macos-icon.cjs
npm run package:mac -- arm64
npm run installer:mac -- arm64
node scripts/build-macos-addon.cjs
```

`release/macos`

## Documentazione e sviluppo

Molti documenti tecnici e di accettazione sono in cinese. Tecnologie: Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging e Lucide. Le versioni esatte sono nel lockfile. I vecchi traguardi non costituiscono accettazione attuale. Il menu Nuovo di Esplora file resta sospeso; la sincronizzazione Gemini Notebook è futura.

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## Licenza e contatto

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
