# NotebookAid sur macOS — configuration Thunderbird

[English](README.en.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md) | [Português (Portugal)](README.pt-PT.md)

## Installer l’application et le module

1. Choisissez arm64 pour un Mac Apple série M, ou x64 pour Intel. Ouvrez le DMG, déplacez NotebookAid.app vers /Applications et lancez-le une fois. Cette version de test possède une signature ad hoc, sans Developer ID ni notarisation Apple. En cas de blocage, conservez le message ; ne désactivez pas la protection globale du système.
2. Dans Thunderbird, ouvrez « Modules complémentaires et thèmes », puis le menu engrenage et « Installer un module depuis un fichier ». Sélectionnez NotebookAid.xpi fourni dans cette même archive. Aucun téléchargement Windows supplémentaire n’est nécessaire. Ne décompressez pas le XPI. Une première installation ne nécessite pas l’assistant de migration.
3. Thunderbird 157.0 ou ultérieur est requis ; la base de test du projet est 157.0.1. Les anciennes versions ESR ne sont pas couvertes.

## Enregistrer le pont local

Après installation à l’emplacement indiqué, exécutez dans le Terminal macOS. Aucune installation séparée de Node.js ni sudo n’est nécessaire :

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

Résultat attendu :

    NotebookAid bridge registered for the current user.

Les fichiers sont créés dans ~/Library/Application Support/Mozilla/NativeMessagingHosts/ pour l’utilisateur actuel uniquement. Aucun port réseau ni service système n’est configuré.

## Connexion et dépannage

Quittez complètement Thunderbird puis rouvrez-le. Lancez NotebookAid avec un carnet de test, puis cliquez sur Reconnect dans le module. Open app et Start background peuvent démarrer l’application locale.

L’enregistrement persiste après redémarrage. Une mise à jour au même emplacement ne nécessite normalement pas de nouvel enregistrement. Avant de déplacer l’application, exécutez la même commande avec --remove ajouté à la fin tant que l’ancienne application existe, puis enregistrez le nouvel emplacement. Adaptez les trois chemins si nécessaire. Un enregistrement vers un autre chemin est refusé : conservez l’erreur et ne supprimez pas les fichiers à l’aveugle.

Si la connexion échoue, vérifiez la version Thunderbird et le chemin, relancez les deux applications et conservez les erreurs du Terminal/module. Le verrouillage de l’application par Passkey n’est pas pris en charge sur cette version macOS ; ne copiez pas les réglages de verrouillage Windows. Le chiffrement des carnets reste disponible. L’intégration réelle avec Thunderbird reste à tester par l’utilisateur.

L’archive contient les sommes SHA256, les DMG/ZIP et le module. Ce sont des fichiers de test, pas une publication officielle ; les mises à jour automatiques ne sont pas activées.

## Téléchargements de test Windows

[Installation EXE](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) : `NotebookAid-windows-x64-test`. [MSI natif](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml) : `NotebookAid-windows-x64-msi-test`. Connectez-vous à GitHub et choisissez une exécution réussie. Le MSI prend en charge l’utilisateur actuel ou tous les utilisateurs, conserve le nom NotebookAid et utilise un canal GitHub signé distinct. Les paquets de test non signés n’ont pas de source de mise à jour active. Voir le [guide MSI](../msi-testing.md).
