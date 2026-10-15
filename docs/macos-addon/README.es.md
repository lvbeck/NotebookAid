# NotebookAid en macOS — configuración de Thunderbird

[English](README.en.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md) | [Português (Portugal)](README.pt-PT.md)

## Instalar la aplicación y el complemento

1. Elija arm64 para un Mac con chip Apple serie M, o x64 para Intel. Abra el DMG, arrastre NotebookAid.app a /Applications e iníciela una vez. Esta prueba usa firma ad hoc, sin Developer ID ni notarización de Apple. Si se bloquea, conserve el mensaje; no desactive la protección global del sistema.
2. En Thunderbird abra « Complementos y temas », el menú de engranaje y « Instalar complemento desde archivo ». Seleccione NotebookAid.xpi incluido en este mismo paquete. No hace falta descargar un paquete Windows. No descomprima el XPI. Una instalación inicial no necesita el asistente de migración.
3. Se requiere Thunderbird 157.0 o posterior; la base de pruebas del proyecto es 157.0.1. No se cubren versiones ESR anteriores.

## Registrar el puente local

Tras instalar en la ruta indicada, ejecute en Terminal de macOS. No requiere instalar Node.js por separado ni usar sudo:

    ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"

Salida esperada:

    NotebookAid bridge registered for the current user.

Los archivos se guardan en ~/Library/Application Support/Mozilla/NativeMessagingHosts/ solo para el usuario actual. No se configura ningún puerto de red ni servicio del sistema.

## Conectar y resolver problemas

Cierre completamente y vuelva a abrir Thunderbird. Inicie NotebookAid con un cuaderno de prueba y pulse Reconnect en el complemento. Open app y Start background pueden iniciar la aplicación local.

El registro persiste tras reiniciar. Normalmente no se repite al actualizar en la misma ruta. Antes de mover la aplicación, ejecute el mismo comando añadiendo --remove mientras la aplicación anterior aún exista; registre después la nueva ubicación. Adapte las tres rutas si es necesario. Se rechaza un registro para otra ubicación: conserve el error y no elimine archivos a ciegas.

Si no conecta, compruebe versión Thunderbird y ruta, reinicie ambas aplicaciones y conserve los errores de Terminal/complemento. Esta prueba macOS no admite bloqueo de aplicación Passkey; no copie los ajustes de bloqueo Windows. El cifrado del cuaderno sigue disponible. La integración real Thunderbird todavía requiere pruebas del usuario.

El archivo incluye sumas SHA256, DMG/ZIP y complemento. Son paquetes de prueba, no una publicación oficial; las actualizaciones automáticas no están activadas.
