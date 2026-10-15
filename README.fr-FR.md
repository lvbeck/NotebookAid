# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**Notes locales et assistant de rédaction IA**

*Écrire localement, penser sereinement, entendre des échos intelligents.*

NotebookAid est une application de notes de bureau libre, avec un module Thunderbird facultatif. Les carnets restent dans les dossiers locaux choisis. La rédaction IA, les résumés et les traductions transmettent du texte au fournisseur choisi uniquement sur demande explicite de génération.

## Fonctionnalités

- Édition enrichie Markdown et HTML dans un sous-ensemble sûr, texte brut et Quill Delta natif. Le contenu non pris en charge est protégé en mode source.
- Plusieurs carnets, dossiers imbriqués, recherche, étiquettes, notes épinglées et récentes, pièces jointes, sauvegarde automatique, historique et corbeille.
- Chiffrement facultatif des notes, mot de passe principal et clé de récupération par carnet, sauvegarde et restauration, verrouillage Windows Passkey.
- Couleurs et couvertures, thèmes clair/sombre/système et dix langues : anglais, chinois simplifié, chinois traditionnel (Hong Kong), allemand, français, italien, espagnol, portugais (Portugal), japonais et coréen. Guide de démarrage et collection facultative d’œufs cachés.
- Intégration Thunderbird par Native Messaging local et importation de tâches ICS.
- IA facultative via abonnement ChatGPT ou clés API Gemini/Claude. Les conditions et l’éligibilité du fournisseur s’appliquent. Aucun changement automatique de fournisseur ou de facturation.

## Téléchargements de test

Ces fichiers sont des artefacts de test, sans publication officielle. Windows et macOS partagent une version numérique. Connectez-vous à GitHub, ouvrez une exécution réussie et téléchargez ses Artifacts.

- [Installateur EXE / ZIP portable](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`.
- [Installateur MSI natif](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`.
- [Paquets macOS](https://github.com/lvbeck/NotebookAid/actions/workflows/macos-build.yml): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## Installation et limites

Extrayez d’abord le ZIP externe. EXE et MSI sont des artefacts distincts et prennent en charge l’utilisateur actuel ou tous les utilisateurs. Désinstallez l’autre type avant de changer. Le nom reste NotebookAid. Le MSI propose dix langues ; le chinois simplifié utilise Microsoft YaHei.

macOS fournit des DMG/ZIP arm64 pour Apple Silicon et x64 pour Intel, NotebookAid.xpi et dix guides d’installation du module et du pont. Les DMG/ZIP n’ont pas d’assistant de type Windows.

Artefacts conservés 30 jours, rapports 14 jours. Après expiration, choisissez une exécution réussie plus récente. Sauvegardez les carnets avant les tests ; remplacer le programme ne restaure pas les données.

## Signature, mises à jour et confidentialité

Les paquets Windows de test ne sont pas signés. La demande SignPath Foundation est en attente. Chrome peut bloquer le téléchargement ; l’absence de signature ne prouve pas un faux positif. Conservez l’avertissement, vérifiez la source et SHA256, sans désactiver la protection générale.

macOS utilise une signature ad hoc, sans Developer ID ni notarisation Apple. Les essais réels Mac, Thunderbird, Keychain et comptes IA restent nécessaires. Le verrouillage Passkey est indisponible dans cette version macOS. Windows 10 reste à vérifier sur une machine réelle.

Les tests n’ont pas de source de mise à jour active. Le MSI utilise son propre canal GitHub latest-msi.json signé, puis Windows Installer après confirmation ; jamais un installateur NSIS. Les artefacts Actions ne sont pas un flux de mise à jour. L’authentification IA, la liste des modèles et le renouvellement autorisé peuvent communiquer ; les notes sont envoyées uniquement lors d’une génération explicite.

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## Exécution et compilation

Utilisez Node.js 24.x (24.15 minimum ; CI : 24.21.0). Windows exige PowerShell et le compilateur C# .NET Framework. Le MSI exige aussi Visual C++ x64 et le SDK Windows. Compilez macOS sur macOS.

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

## Documentation et développement

La plupart des documents techniques et de validation sont en chinois. Technologies : Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging et Lucide ; versions exactes dans le fichier de verrouillage. Les anciens jalons ne constituent pas une validation actuelle. Le menu Nouveau de l’Explorateur reste suspendu ; la synchronisation Gemini Notebook reste prévue ultérieurement.

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## Licence et contact

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
