# NotebookAid no macOS — configurar o Thunderbird

[English](README.en-US.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

## Instalar a aplicação e o extra

1. Escolha arm64 para um Mac com chip Apple da série M, ou x64 para Intel. Abra o DMG, arraste NotebookAid.app para /Applications e inicie uma vez. Esta versão de teste tem assinatura ad hoc, sem Developer ID nem notarização Apple. Se for bloqueada, guarde a mensagem; não desative a proteção global do sistema.
2. No Thunderbird abra « Extras e temas », o menu de engrenagem e « Instalar extra a partir de ficheiro ». Selecione NotebookAid.xpi incluído neste mesmo pacote. Não precisa de transferir um pacote Windows. Não extraia o XPI. A primeira instalação não necessita do assistente de migração.
3. É necessário Thunderbird 157.0 ou superior; a base de teste do projeto é 157.0.1. As versões ESR anteriores não estão abrangidas.

## Registar a ligação local

Depois de instalar no local indicado, execute no Terminal do macOS. Não necessita de instalar Node.js separadamente nem de sudo:

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

Resultado esperado:

    NotebookAid bridge registered for the current user.

Os ficheiros ficam em ~/Library/Application Support/Mozilla/NativeMessagingHosts/ apenas para o utilizador atual. Não é configurada nenhuma porta de rede nem serviço do sistema.

## Ligar e resolver problemas

Encerre totalmente e reabra o Thunderbird. Inicie NotebookAid com um caderno de teste e escolha Reconnect no extra. Open app e Start background podem iniciar a aplicação local.

O registo mantém-se após reiniciar. Atualizar no mesmo caminho normalmente não exige novo registo. Antes de mover a aplicação, execute o mesmo comando com --remove no fim enquanto a aplicação antiga ainda existir; registe depois no novo local. Adapte os três caminhos se necessário. Um registo para outro caminho não é substituído: guarde o erro e não elimine ficheiros sem os verificar.

Se não ligar, confirme a versão Thunderbird e o caminho, reinicie ambas as aplicações e guarde os erros do Terminal/extra. O bloqueio da aplicação por Passkey não é suportado nesta versão macOS; não copie as definições de bloqueio Windows. A encriptação dos cadernos continua disponível. A integração real Thunderbird ainda necessita de testes pelo utilizador.

O arquivo inclui somas SHA256, DMG/ZIP e extra. São pacotes de teste, não uma publicação oficial; as atualizações automáticas não estão ativas.

## Transferências de teste para Windows

[Instalador EXE](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`. [MSI nativo](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`. Inicie sessão no GitHub e escolha uma execução bem-sucedida. O MSI permite instalar para o utilizador atual ou para todos os utilizadores, mantém o nome NotebookAid e usa um canal GitHub assinado separado. Os pacotes de teste sem assinatura não têm uma origem de atualizações ativa. Consulte o [guia MSI](../msi-testing.md).
