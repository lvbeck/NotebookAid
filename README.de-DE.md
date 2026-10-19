# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**Lokale Notizen und KI-Schreibassistent**

*Lokal festhalten, in Ruhe nachdenken, intelligente Impulse erhalten.*

NotebookAid ist eine quelloffene Desktop-Anwendung für Notizbücher mit einer optionalen Thunderbird-Erweiterung. Notizbücher bleiben in den lokal ausgewählten Ordnern. Für KI-Schreiben, Zusammenfassungen und Übersetzungen wird Text erst nach einer ausdrücklichen Generierungsanforderung an den ausgewählten Anbieter gesendet.

## Funktionen

- Markdown und HTML als Rich Text innerhalb eines sicheren unterstützten Teilumfangs, TXT und natives Quill Delta; nicht unterstützte Inhalte bleiben im Quelltextmodus geschützt.
- Mehrere Notizbücher, Unterordner, Suche, Schlagwörter, angeheftete und zuletzt verwendete Notizen, Anhänge, automatisches Speichern, Versionsverlauf und Papierkorb.
- Optionale Verschlüsselung, Hauptpasswort je Notizbuch, Wiederherstellungsschlüssel, Sicherung und Wiederherstellung sowie eine Windows-Anwendungssperre mit Passkey.
- Farben und Titelbilder für Notizbücher, helle und dunkle Darstellung oder Systemdesign, zehn Oberflächensprachen (Englisch, vereinfachtes Chinesisch, traditionelles Chinesisch für Hongkong, Deutsch, Französisch, Italienisch, Spanisch, Portugiesisch für Portugal, Japanisch und Koreanisch), Einführung und abschaltbare Sammel-Easter-Eggs.
- Thunderbird-Anbindung über lokales Native Messaging und Import von Aufgaben aus ICS-Dateien.
- Optionale KI-Unterstützung mit ChatGPT-Abonnementanmeldung, Gemini-API-Schlüssel oder Claude-API-Schlüssel. Zugang und Berechtigung richten sich nach dem Konto und den Bedingungen des Anbieters. Anbieter und Abrechnungsweg werden nicht automatisch gewechselt.

## Neueste lokale Änderungen

- Ansicht bietet fortlaufendes Layout, A4-Seiten, direktes Einklappen sowie Gliederung und Text. Markdown-Überschriften mit # und eingerückte TXT-Listen mit - bilden die Gliederung, ohne den Notiztext umzuschreiben. Direktes Einklappen ist schreibgeschützt und bietet Text bearbeiten; Gliederung und Text behält den bisherigen Editor bei.
- Die fixierte Editorleiste deckt im dunklen Modus beide Seitenränder ab. Zehn Notizbuchdesigns folgen dem aktiven Notizbuch und dem hellen/dunklen Erscheinungsbild; die violette Vorgabe heißt Auroraviolett.
- Neue Notizen verwenden standardmäßig TXT. Exportmenü, PDF-Export und nativer Windows-Druck bündeln verwandte Aktionen. Die erweiterte Suche unterstützt AND/OR, Ordner samt optionalen Unterordnern, Tags und angeheftete Notizen.
- Notizbucheinstellungen werden im Notizbuch gespeichert. Vollständiger .nabook-Import/-Export erhält Inhalte, Verlauf und Sicherheitseinstellungen.
- Der optionale Autostart für den aktuellen Benutzer ist standardmäßig aus und bietet Fenster- oder Hintergrundmodus. Echte Anmeldungen und physische macOS-Tests stehen weiterhin aus.
- Das lokale Codex-MCP-Plugin erstellt ausdrücklich autorisierte TXT-/Markdown-Notizen in einem Ordner, mit Eigentümerbestätigung, begrenzten Berechtigungen und verschlüsselten lokalen Client-Zugangsdaten. Die App-Sperre kann eine interaktive Passkey-Prüfung verlangen. Inhalte werden dadurch nicht automatisch an KI gesendet.

[Gliederung testen und zurücksetzen](docs/outline-testing.md). Diese lokalen Änderungen wurden vom Benutzer abgenommen; T15-A bleibt zurückgestellt. Kein Push und keine offizielle Veröffentlichung.

## Testversionen herunterladen

Die lokale Quellversion ist 0.15.21. Die folgenden CI-Downloads verweisen weiterhin auf die zuvor geprüften Builds 0.15.11; ein neuer Remote-Build oder eine offizielle Veröffentlichung wird nicht behauptet.

| Plattform / Paket | Download | Inhalt |
| --- | --- | --- |
| Windows x64 EXE | [EXE / ZIP 0.15.11](https://github.com/lvbeck/NotebookAid/actions/runs/38891357620/artifacts/12042182601) | NSIS-Installationsprogramm, portable ZIP-Datei, Thunderbird-XPI-Dateien und SHA256-Prüfsummen; Artefakt `NotebookAid-windows-x64-test` |
| Windows x64 MSI | [MSI 0.15.11](https://github.com/lvbeck/NotebookAid/actions/runs/38891357620/artifacts/12041793159) | Eigenständiges Windows-Installer-Paket und SHA256-Prüfsumme; Artefakt `NotebookAid-windows-x64-msi-test` |
| macOS Apple Silicon / Intel | [macOS 0.15.11-Testdownload](https://github.com/lvbeck/NotebookAid/actions/runs/38891357616) ([arm64](https://github.com/lvbeck/NotebookAid/actions/runs/38891357616/artifacts/12042456507) / [x64](https://github.com/lvbeck/NotebookAid/actions/runs/38891357616/artifacts/12041757826)) | Separate arm64- und x64-DMG/ZIP-Dateien, `NotebookAid.xpi` und Installations-/Bridge-Anleitungen in zehn Sprachen |

Bei GitHub anmelden, einen erfolgreichen Workflow-Lauf öffnen und unter **Artifacts** das gewünschte Paket herunterladen. Die Pakete werden 30 Tage aufbewahrt, Prüfberichte 14 Tage. Zuerst das äußere Artefaktarchiv entpacken. Die EXE befindet sich im Unterordner `installer`; die portable ZIP muss vor dem Start von `NotebookAid.exe` zusätzlich entpackt werden. Auf dem Mac die zum Prozessor passende Architektur wählen.

Weitere Testläufe: [Windows](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) und [macOS](https://github.com/lvbeck/NotebookAid/actions/workflows/macos-build.yml).

EXE und MSI sind getrennte Installationsarten. Vor einem Wechsel die bisherige Installationsart deinstallieren; Notizbücher und Benutzereinstellungen bleiben erhalten. Nicht beide Installationsprogramme über dasselbe Verzeichnis installieren. Der Software- und Anzeigename ist immer **NotebookAid**, die Version steht separat. Beide Installationsarten unterstützen den aktuellen Benutzer und alle Benutzer des Computers. Letzteres benötigt Administratorrechte; beim MSI muss das Ziel unter Program Files liegen. Desktop- und Startmenüverknüpfungen sind optional. Siehe [MSI-Anleitung](docs/msi-testing.md) (Englisch).

Vor Tests die Notizbücher sichern. Ein Austausch der Programmdateien setzt keine Notizbuchdaten zurück.

## Plattformstatus

| Plattform | Status und Einschränkungen |
| --- | --- |
| Windows 11 x64 | Lokale Tests und CI-Prüfungen stehen zur Verfügung. Die vollständige Prüfung des Installationsassistenten, der UAC-Dialoge mit Standardbenutzern und hoher DPI-Skalierung bleibt eine manuelle Aufgabe. |
| Windows 10 x64 | Geplante Zielplattform; noch nicht auf einem echten Windows-10-Gerät verifiziert. |
| macOS arm64 / x64 | CI-Builds sowie Prüfungen der gepackten Oberfläche und des Editors vorhanden. Installation auf echten Macs, Thunderbird, Keychain und echte KI-Konten müssen noch getestet werden. Passkey-Anwendungssperren werden auf macOS derzeit nicht unterstützt und nicht stillschweigend entfernt. |
| Linux | Derzeit keine gepackten Testversionen. |

Die Thunderbird-Projektbasis ist Release 157.0.1. Neuere Releases und ESR benötigen eigene Kompatibilitätsprüfungen. Die [deutsche macOS-Anleitung](docs/macos-addon/README.de-DE.md) beschreibt die Plugin-Installation und Bridge-Registrierung. Weitere Prüfungen und Grenzen stehen in der [Windows-CI-Anleitung](docs/windows-ci-testing.md) und der [macOS-Testanleitung](docs/macos-testing.md) (Chinesisch).

## Signaturen, Updates und Datenschutz

- **Windows-Testpakete sind nicht signiert.** Der Antrag bei der SignPath Foundation wurde nicht genehmigt; die Windows-Signierung ist ausgesetzt. Automatische Updates bleiben deaktiviert.
- macOS-Testanwendungen sind ad-hoc signiert, ohne Developer-ID-Signatur und Apple-Notarisierung. Gatekeeper kann den Start blockieren. Die systemweiten Sicherheitsfunktionen nicht für einen Test deaktivieren.
- Der Update-Mechanismus ist vorbereitet, aber die Testpakete haben keine aktive Update-Quelle. GitHub Actions dient nur zum Testdownload; spätere signierte Updates können über GitHub Releases bereitgestellt werden.
- Native MSI-Updates verwenden einen getrennten Kanal mit `latest-msi.json`, Größen-/SHA256-Prüfung sowie Prüfung von Authenticode-Signatur, Herausgeber und Produktidentität. Nach Bestätigung und Speichern offener Änderungen übernimmt Windows Installer die Aktualisierung im bisherigen Installationsumfang und Verzeichnis. Bei einer Installation für alle Benutzer kann UAC eine erneute Zustimmung verlangen. MSI installiert keine NSIS-Updates. Die Anwendung nach Abschluss manuell neu starten.
- KI-Anmeldung, Modellabfragen und genehmigte Token-Erneuerung können den ausgewählten Anbieter kontaktieren. Notiztext wird nur zur ausdrücklich angeforderten Generierung übertragen. Lokale Speicherung bedeutet nicht, dass die Anwendung immer offline ist.

Siehe [Signaturrichtlinie](docs/code-signing-policy.md) und [Datenschutzerklärung](docs/privacy.md) (Englisch).

## Aus dem Quellcode starten

Voraussetzungen: Node.js 24 gemäß `package.json`, npm und für Windows die .NET-Framework-Buildwerkzeuge. Native MSI-Builds benötigen zusätzlich Visual-C++-x64-Buildwerkzeuge und das Windows SDK. Die CI verwendet gesperrte Abhängigkeiten; keine globale Aktualisierung ist erforderlich.

```powershell
npm ci
npm run build
npm start
```

Windows PowerShell:

```powershell
npm run package
npm run installer
npm run installer:msi
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

EXE-Dateien liegen unter `release/installer`, MSI-Dateien unter `release/msi`, portable ZIP und Erweiterungen unter `release`. Das MSI verwendet die unveränderten, von electron-builder festgelegten WiX-Buildwerkzeuge mit beigelegter MS-RL-Lizenz.

macOS-Terminal auf der passenden Architektur, für Intel `arm64` durch `x64` ersetzen:

```sh
node scripts/create-macos-icon.cjs
npm run package:mac -- arm64
npm run installer:mac -- arm64
node scripts/build-macos-addon.cjs
```

Die Ausgabe liegt unter `release/macos`. Diese Befehle erzeugen Testpakete und veröffentlichen kein offizielles Release. Buildverzeichnisse können neu erstellt werden; keine persönlichen Notizbücher in `dist`, `release` oder `output` ablegen.

## Dokumentation und Entwicklungsstand

Technische Dokumente und Abnahmeprotokolle sind überwiegend auf Chinesisch. Dieses deutsche README bedeutet nicht, dass sämtliche verlinkten Dokumente übersetzt sind.

Die Anwendung verwendet Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging und Lucide. Die genauen Versionen stehen in der Lockdatei.

| Dokument | Zweck |
| --- | --- |
| [Anforderungen](docs/requirements.md) | Bestätigte Funktionen und Grenzen |
| [Architektur](docs/architecture.md), [Datenmodell](docs/data-model.md), [API-Vertrag](docs/api-contract.md) | Gemeinsamer lokaler Kern und Schnittstellen |
| [Implementierungsplan](docs/implementation-plan.md) | Verbindlicher Aufgaben- und Abnahmestand |
| [Abnahmecheckliste](docs/acceptance.md), [Testhistorie](docs/testing-history.md) | Aktuelle und frühere Prüfungen |
| [Quellen und Lizenzen](docs/sources-and-licenses.md) | Abhängigkeiten und Hinweise Dritter |
| [Projektregeln](AGENTS.md) | Entwicklungs- und Beitragsregeln |

Die Integration in das Windows-Explorer-Menü „Neu“ bleibt zurückgestellt. Gemini-Notebook-Synchronisierung ist ein zukünftiges Vorhaben. Automatisierte Prüfungen ersetzen keine Benutzerabnahme oder die genannten manuellen Tests.

## Lizenz und Kontakt

[BSD-3-Clause](LICENSE). Copyright © 2026 Jin Lu. Komponenten Dritter behalten ihre jeweiligen Lizenzen.

Kontakt: [it@live.cn](mailto:it@live.cn).

Die EXE- und MSI-Assistenten unterstützen zehn Sprachen; vereinfachtes Chinesisch verwendet Microsoft YaHei. Die DMG/ZIP-Pakete enthalten die zehnsprachige Anwendung und Anleitungen, keinen Windows-Assistenten. Ein unauffälliger Defender-Scan erklärt keine konkrete Chrome-Sperre und garantiert keine Freigabe durch Safe Browsing. [Chrome-Downloadschutz](https://support.google.com/chrome/answer/6261569?hl=en).
