# NotebookAid unter macOS — Thunderbird einrichten

[English](README.en-US.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

## Anwendung und Add-on installieren

1. Für einen Mac mit Apple-M-Chip arm64 wählen, für Intel x64. Die DMG öffnen, NotebookAid.app nach /Applications ziehen und einmal starten. Diese Testversion ist ad hoc signiert, jedoch ohne Developer-ID-Signatur und Apple-Notarisierung. Bei einer Sperre die Meldung aufbewahren; den systemweiten Schutz nicht deaktivieren.
2. In Thunderbird „Add-ons und Themes“ öffnen, im Zahnradmenü „Add-on aus Datei installieren“ wählen und die mitgelieferte NotebookAid.xpi auswählen. Kein zusätzlicher Windows-Download ist nötig. Die XPI nicht entpacken. Bei der Erstinstallation ist kein Migrationshelfer erforderlich.
3. Erforderlich ist Thunderbird ab 157.0; die Testbasis des Projekts ist 157.0.1. Ältere ESR-Versionen sind nicht abgedeckt.

## Lokale Verbindung registrieren

Nach der Installation am obigen Ort im macOS-Terminal ausführen. Eine separate Node.js-Installation oder sudo ist nicht erforderlich:

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

Erwartete Ausgabe:

    NotebookAid bridge registered for the current user.

Die Registrierung liegt unter ~/Library/Application Support/Mozilla/NativeMessagingHosts/ und gilt nur für den aktuellen Benutzer. Es werden weder Netzwerkport noch Systemdienst eingerichtet.

## Verbinden und Fehler prüfen

Thunderbird vollständig beenden und erneut öffnen, NotebookAid mit einem Testnotizbuch starten und im Add-on Reconnect wählen. Open app und Start background können die lokale Anwendung bei Bedarf starten.

Die Registrierung bleibt nach einem Neustart erhalten. Bei Updates am selben Ort ist normalerweise keine erneute Registrierung nötig. Vor dem Verschieben den gleichen Befehl mit angehängtem --remove ausführen, solange die alte Anwendung noch vorhanden ist; danach am neuen Ort registrieren. Bei anderem Installationsort alle drei Anwendungspfade anpassen. Eine Registrierung für einen anderen Pfad wird nicht überschrieben: die Fehlermeldung behalten, Dateien nicht blind löschen.

Bei Verbindungsproblemen Thunderbird-Version und Pfad prüfen, beide Anwendungen neu starten und Terminal-/Add-on-Meldungen aufbewahren. Die Passkey-Anwendungssperre wird in dieser macOS-Testversion nicht unterstützt; Windows-Sperreinstellungen nicht übernehmen. Notizbuchverschlüsselung bleibt verfügbar. Die echte Thunderbird-Integration muss noch vom Benutzer getestet werden.

Das Archiv enthält SHA256-Prüfsummen, DMG/ZIP und das Add-on. Es ist ein Testpaket, keine offizielle Veröffentlichung; automatische Updates sind nicht aktiv.

## Windows-Testdownloads

[EXE-Installation](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`. [Native MSI-Installation](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`. Bei GitHub anmelden und einen erfolgreichen Lauf wählen. MSI unterstützt den aktuellen Benutzer und alle Benutzer, behält den Namen NotebookAid und verwendet einen getrennten signierten GitHub-Updatekanal. Nicht signierte Testpakete haben keine aktive Update-Quelle. Siehe [MSI-Anleitung](../msi-testing.md) und [deutsches Projekt-README](../../README.de-DE.md).
