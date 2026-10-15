# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**Notas locales y asistente de escritura con IA**

*Registra en local, piensa con calma, escucha ecos inteligentes.*

NotebookAid es una aplicación de notas de escritorio de código abierto con un complemento opcional de Thunderbird. Los cuadernos se guardan en las carpetas locales elegidas. La escritura con IA, los resúmenes y las traducciones solo envían texto al proveedor seleccionado cuando se solicita generar contenido.

## Funciones

- Edición enriquecida Markdown y HTML dentro de un subconjunto seguro, texto plano y Quill Delta nativo. El contenido no compatible se protege en modo fuente.
- Varios cuadernos, subcarpetas, búsqueda, etiquetas, notas fijadas y recientes, adjuntos, guardado automático, historial y papelera.
- Cifrado opcional, contraseña maestra y clave de recuperación por cuaderno, copias de seguridad y restauración, bloqueo Windows Passkey.
- Colores y portadas, temas claro/oscuro/sistema y diez idiomas: inglés, chino simplificado, chino tradicional (Hong Kong), alemán, francés, italiano, español, portugués (Portugal), japonés y coreano. Guía inicial y colección opcional de huevos ocultos.
- Integración con Thunderbird mediante Native Messaging local e importación de tareas ICS.
- IA opcional mediante suscripción de ChatGPT o claves API Gemini/Claude. Se aplican los requisitos y condiciones del proveedor; no se cambia de proveedor ni facturación automáticamente.

## Descargas de prueba

Son artefactos de prueba, sin publicación oficial. Windows y macOS comparten una versión numérica. Inicie sesión en GitHub, abra una ejecución correcta y descargue sus Artifacts.

- [Instalador EXE / ZIP portátil](https://github.com/lvbeck/NotebookAid/actions/runs/38703093807/artifacts/11957258886): `NotebookAid-windows-x64-test`.
- [Instalador MSI nativo](https://github.com/lvbeck/NotebookAid/actions/runs/38703093807/artifacts/11957099080): `NotebookAid-windows-x64-msi-test`.
- [Paquetes macOS](https://github.com/lvbeck/NotebookAid/actions/runs/38703093814): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## Instalación y límites

Extraiga primero el ZIP externo. EXE y MSI son artefactos distintos y permiten instalar para el usuario actual o todos los usuarios. Desinstale el otro tipo antes de cambiar. El nombre sigue siendo NotebookAid. MSI ofrece diez idiomas; el chino simplificado usa Microsoft YaHei.

macOS incluye DMG/ZIP arm64 para Apple Silicon y x64 para Intel, NotebookAid.xpi y diez guías del complemento y puente. Los DMG/ZIP no tienen un asistente de instalación como Windows.

Los paquetes se conservan 30 días y los informes 14. Si caducan, elija una ejecución correcta más reciente. Haga copia de los cuadernos antes de probar; sustituir el programa no revierte los datos.

## Firma, actualizaciones y privacidad

Los paquetes Windows de prueba no están firmados. La solicitud SignPath Foundation está pendiente. Chrome puede bloquear las descargas; no tener firma no demuestra un falso positivo. Conserve el aviso y compruebe origen y SHA256 sin desactivar la protección general.

macOS usa firma ad hoc, sin Developer ID ni notarización Apple. Aún faltan pruebas reales de Mac, Thunderbird, Keychain y cuentas IA. Esta versión macOS no admite bloqueo Passkey. Windows 10 también requiere pruebas reales.

Las pruebas no tienen una fuente activa de actualización. MSI usa su propio canal GitHub latest-msi.json firmado y ejecuta Windows Installer tras confirmación; nunca NSIS. Los artefactos Actions no son un canal de actualización. La autenticación IA, los modelos y la renovación autorizada pueden usar la red; el texto se envía solo al generar explícitamente.

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## Ejecutar y compilar

Use Node.js 24.x (24.15 o superior; CI: 24.21.0). Windows requiere PowerShell y el compilador C# de .NET Framework; MSI también necesita Visual C++ x64 y Windows SDK. Compile macOS en macOS.

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

## Documentación y desarrollo

La mayoría de documentos técnicos y de aceptación están en chino. Se utilizan Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging y Lucide. Las versiones exactas están en el archivo de bloqueo. Los hitos históricos no equivalen a aceptación actual. El menú Nuevo de Explorer está aplazado y la sincronización Gemini Notebook es futura.

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## Licencia y contacto

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
