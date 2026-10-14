import type { Locale } from './i18n';
import type { StartupPhase } from '../../shared/startup';
const keys = ['opening', 'recovery', 'notes', 'history', 'restoring', 'failed', 'retry'] as const;
const labels: Record<Locale, string[]> = {
  'zh-CN': ['正在打开笔记本','正在检查恢复记录','正在加载笔记','正在校验笔记历史','正在恢复上次打开的笔记','笔记本加载失败','重试'],
  'zh-TW': ['正在開啟筆記本','正在檢查復原記錄','正在載入筆記','正在驗證筆記歷程','正在恢復上次開啟的筆記','筆記本載入失敗','重試'],
  en: ['Opening notebook','Checking recovery records','Loading notes','Validating note history','Restoring the last opened note','Notebook could not be loaded','Retry'],
  de: ['Notizbuch wird geöffnet','Wiederherstellungsdaten werden geprüft','Notizen werden geladen','Notizverlauf wird geprüft','Zuletzt geöffnete Notiz wird wiederhergestellt','Notizbuch konnte nicht geladen werden','Erneut versuchen'],
  fr: ['Ouverture du carnet','Vérification des données de récupération','Chargement des notes','Vérification de l’historique','Ouverture de la dernière note consultée','Impossible de charger le carnet','Réessayer'],
  it: ['Apertura del taccuino','Verifica dei dati di recupero','Caricamento delle note','Verifica della cronologia','Ripristino dell’ultima nota aperta','Impossibile caricare il taccuino','Riprova'],
  es: ['Abriendo cuaderno','Comprobando datos de recuperación','Cargando notas','Validando historial','Restaurando la última nota abierta','No se pudo cargar el cuaderno','Reintentar'],
  'pt-PT': ['A abrir o caderno','A verificar dados de recuperação','A carregar notas','A validar o histórico','A restaurar a última nota aberta','Não foi possível carregar o caderno','Tentar novamente'],
};
export function startupText(locale: Locale, key: StartupPhase | 'failed' | 'retry'): string { return labels[locale][keys.indexOf(key)]!; }
const pageSizeLabels: Record<Locale, string> = { 'zh-CN':'每页笔记数量','zh-TW':'每頁筆記數量',en:'Notes per page',de:'Notizen pro Seite',fr:'Notes par page',it:'Note per pagina',es:'Notas por página','pt-PT':'Notas por página' };
export function pageSizeText(locale: Locale): string { return pageSizeLabels[locale]; }
