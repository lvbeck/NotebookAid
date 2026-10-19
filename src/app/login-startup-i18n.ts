import type { Locale } from './i18n';
export type LoginStartupKey = 'title' | 'enabled' | 'window' | 'background' | 'hint';
const text: Record<Locale, Record<LoginStartupKey, string>> = {
  "en": {
    "title": "Startup settings",
    "enabled": "Start automatically at login",
    "window": "Window startup",
    "background": "Background startup",
    "hint": "Applies to this device and user. Background startup keeps NotebookAid in the tray."
  },
  "de": {
    "title": "Starteinstellungen",
    "enabled": "Bei der Anmeldung automatisch starten",
    "window": "Mit Fenster starten",
    "background": "Im Hintergrund starten",
    "hint": "Gilt für dieses Gerät und diesen Benutzer. Beim Hintergrundstart bleibt NotebookAid im Infobereich."
  },
  "fr": {
    "title": "Paramètres de démarrage",
    "enabled": "Démarrer automatiquement à la connexion",
    "window": "Démarrer avec une fenêtre",
    "background": "Démarrer en arrière-plan",
    "hint": "Concerne cet appareil et cet utilisateur. En arrière-plan, NotebookAid reste dans la zone de notification."
  },
  "it": {
    "title": "Impostazioni di avvio",
    "enabled": "Avvia automaticamente all’accesso",
    "window": "Avvia con finestra",
    "background": "Avvia in background",
    "hint": "Si applica a questo dispositivo e utente. In background, NotebookAid rimane nell’area di notifica."
  },
  "es": {
    "title": "Configuración de inicio",
    "enabled": "Iniciar automáticamente al iniciar sesión",
    "window": "Iniciar con ventana",
    "background": "Iniciar en segundo plano",
    "hint": "Se aplica a este dispositivo y usuario. En segundo plano, NotebookAid permanece en la bandeja del sistema."
  },
  "pt-PT": {
    "title": "Definições de arranque",
    "enabled": "Iniciar automaticamente ao iniciar sessão",
    "window": "Iniciar com janela",
    "background": "Iniciar em segundo plano",
    "hint": "Aplica-se a este dispositivo e utilizador. Em segundo plano, o NotebookAid permanece na área de notificação."
  },
  "zh-CN": {
    "title": "启动设置",
    "enabled": "开机自动启动",
    "window": "窗口启动",
    "background": "后台启动",
    "hint": "仅适用于本机当前用户。后台启动时，NotebookAid 保留在系统托盘中。"
  },
  "zh-TW": {
    "title": "啟動設定",
    "enabled": "開機自動啟動",
    "window": "視窗啟動",
    "background": "背景啟動",
    "hint": "僅適用於本機目前使用者。背景啟動時，NotebookAid 保留在系統匣中。"
  },
  "ja": {
    "title": "起動設定",
    "enabled": "ログイン時に自動起動",
    "window": "ウィンドウで起動",
    "background": "バックグラウンドで起動",
    "hint": "この端末の現在のユーザーにのみ適用されます。バックグラウンド起動時はトレイに常駐します。"
  },
  "ko": {
    "title": "시작 설정",
    "enabled": "로그인 시 자동 시작",
    "window": "창으로 시작",
    "background": "백그라운드로 시작",
    "hint": "이 기기의 현재 사용자에게만 적용됩니다. 백그라운드로 시작하면 시스템 트레이에 유지됩니다."
  }
};
export function loginStartupText(locale: Locale, key: LoginStartupKey): string { return text[locale][key]; }
