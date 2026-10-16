# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**Notas locais e assistente de escrita IA**

*Registar localmente, pensar com calma, ouvir ecos inteligentes.*

O NotebookAid é uma aplicação de notas de código aberto com um extra Thunderbird opcional. Os cadernos ficam nas pastas locais escolhidas. A escrita IA, os resumos e as traduções só enviam texto ao fornecedor selecionado quando pede explicitamente a geração.

## Funcionalidades

- Edição formatada Markdown e HTML num subconjunto seguro, texto simples e Quill Delta nativo. Conteúdo não suportado fica protegido no modo de código-fonte.
- Vários cadernos, subpastas, pesquisa, etiquetas, notas fixadas e recentes, anexos, gravação automática, histórico de versões e lixo.
- Encriptação opcional, palavra-passe principal e chave de recuperação por caderno, cópia de segurança e restauro, bloqueio Windows Passkey.
- Cores e capas, temas claro/escuro/sistema e dez idiomas: inglês, chinês simplificado, chinês tradicional (Hong Kong), alemão, francês, italiano, espanhol, português (Portugal), japonês e coreano. Guia inicial e coleção opcional de ovos escondidos.
- Integração Thunderbird por Native Messaging local e importação de tarefas ICS.
- IA opcional por subscrição ChatGPT ou chaves API Gemini/Claude. Aplicam-se as condições e elegibilidade do fornecedor; não há troca automática de fornecedor ou faturação.

## Transferências de teste

São artefactos de teste, sem lançamento oficial. Windows e macOS partilham uma versão numérica. Inicie sessão no GitHub, abra uma execução bem-sucedida e transfira os Artifacts.

- [Instalador EXE / ZIP portátil 0.15.11](https://github.com/lvbeck/NotebookAid/actions/runs/38891357620/artifacts/12042182601): `NotebookAid-windows-x64-test`.
- [Instalador MSI nativo 0.15.11](https://github.com/lvbeck/NotebookAid/actions/runs/38891357620/artifacts/12041793159): `NotebookAid-windows-x64-msi-test`.
- [Pacotes macOS 0.15.11](https://github.com/lvbeck/NotebookAid/actions/runs/38891357616) ([arm64](https://github.com/lvbeck/NotebookAid/actions/runs/38891357616/artifacts/12042456507) / [x64](https://github.com/lvbeck/NotebookAid/actions/runs/38891357616/artifacts/12041757826)): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## Instalação e limites

Extraia primeiro o ZIP exterior. EXE e MSI são artefactos separados e suportam o utilizador atual ou todos os utilizadores. Desinstale o outro tipo antes de mudar. O nome mantém-se NotebookAid. MSI oferece dez idiomas; o chinês simplificado usa Microsoft YaHei.

macOS inclui DMG/ZIP arm64 para Apple Silicon e x64 para Intel, NotebookAid.xpi e dez guias do extra e ponte. Os DMG/ZIP não têm um assistente de instalação do tipo Windows.

Os pacotes são guardados 30 dias e os relatórios 14. Após expiração, escolha uma execução bem-sucedida mais recente. Faça cópias dos cadernos antes de testar; substituir o programa não reverte os dados.

## Assinatura, atualizações e privacidade

Os pacotes Windows de teste não estão assinados. O pedido SignPath Foundation não foi aprovado; a assinatura Windows está suspensa. As atualizações automáticas permanecem desativadas. O Chrome pode bloquear as transferências; a falta de assinatura não prova um falso positivo. Guarde o aviso e verifique a origem e SHA256 sem desativar a proteção geral.

macOS usa assinatura ad hoc, sem Developer ID nem notarização Apple. Os testes reais de Mac, Thunderbird, Keychain e contas IA continuam pendentes. Este teste macOS não suporta bloqueio Passkey. Windows 10 também requer validação real.

Os testes não têm uma origem de atualização ativa. MSI usa um canal GitHub latest-msi.json separado e assinado e executa Windows Installer após confirmação; nunca NSIS. Os artefactos Actions não são um feed de atualização. Autenticação IA, modelos e renovação autorizada podem aceder à rede; o texto só é enviado na geração explícita.

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## Executar e compilar

Use Node.js 24.x (mínimo 24.15; CI: 24.21.0). Windows exige PowerShell e compilador C# .NET Framework; MSI também exige Visual C++ x64 e Windows SDK. Compile macOS em macOS.

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

## Documentação e desenvolvimento

A maioria dos documentos técnicos e de aceitação está em chinês. Tecnologias: Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging e Lucide, com versões exatas no ficheiro de bloqueio. Marcos históricos não equivalem a aceitação atual. O menu Novo do Explorador continua suspenso; a sincronização Gemini Notebook fica para o futuro.

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## Licença e contacto

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
