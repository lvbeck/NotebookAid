# NotebookAid su macOS — configurazione Thunderbird

[English](README.en.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md) | [Português (Portugal)](README.pt-PT.md)

## Installare applicazione e componente aggiuntivo

1. Scegliere arm64 per un Mac Apple serie M oppure x64 per Intel. Aprire il DMG, trascinare NotebookAid.app in /Applications e avviarlo una volta. La versione di test usa una firma ad hoc, senza Developer ID o autenticazione notarile Apple. In caso di blocco conservare il messaggio; non disattivare la protezione globale del sistema.
2. In Thunderbird aprire « Componenti aggiuntivi e temi », quindi il menu ingranaggio e « Installa componente aggiuntivo da file ». Selezionare NotebookAid.xpi incluso nello stesso archivio. Non serve scaricare un pacchetto Windows. Non estrarre il file XPI. La prima installazione non richiede l’assistente di migrazione.
3. È richiesto Thunderbird 157.0 o successivo; la base di test del progetto è 157.0.1. Le versioni ESR precedenti non sono coperte.

## Registrare il collegamento locale

Dopo l’installazione nel percorso indicato, eseguire nel Terminale macOS. Non occorrono un’installazione separata di Node.js o sudo:

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

Risultato previsto:

    NotebookAid bridge registered for the current user.

I file sono salvati in ~/Library/Application Support/Mozilla/NativeMessagingHosts/ solo per l’utente corrente. Non vengono configurati porte di rete o servizi di sistema.

## Connessione e problemi

Chiudere completamente e riaprire Thunderbird, avviare NotebookAid con un quaderno di test e selezionare Reconnect nel componente. Open app e Start background possono avviare l’applicazione locale.

La registrazione resta dopo il riavvio. Un aggiornamento nello stesso percorso normalmente non richiede di ripeterla. Prima di spostare l’applicazione, eseguire lo stesso comando aggiungendo --remove mentre la vecchia applicazione esiste ancora, quindi registrare il nuovo percorso. Modificare tutti e tre i percorsi se necessario. Una registrazione per un altro percorso non viene sovrascritta: conservare l’errore, senza eliminare file alla cieca.

Se non si connette, verificare versione Thunderbird e percorso, riavviare entrambe le applicazioni e conservare gli errori del Terminale/componente. Il blocco applicazione Passkey non è supportato in questa versione macOS; non copiare le impostazioni di blocco Windows. La crittografia dei quaderni resta disponibile. L’integrazione reale Thunderbird deve ancora essere provata dall’utente.

L’archivio contiene checksum SHA256, DMG/ZIP e componente aggiuntivo. Sono pacchetti di test, non una pubblicazione ufficiale; gli aggiornamenti automatici non sono attivi.
