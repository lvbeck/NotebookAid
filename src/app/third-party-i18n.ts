import type { Locale } from './i18n';
const labels: Record<Locale, readonly [string,string,string,string]> = {
  en:['Component','Loading component notices…','Unable to load component notices.','Bundled notice files'],
  'zh-CN':['组件名称','正在加载组件声明…','无法加载组件声明。','随附声明文件'],
  'zh-TW':['元件名稱','正在載入元件聲明…','無法載入元件聲明。','隨附聲明檔案'],
  de:['Komponente','Komponentenhinweise werden geladen…','Komponentenhinweise konnten nicht geladen werden.','Enthaltene Hinweisdateien'],
  fr:['Composant','Chargement des avis des composants…','Impossible de charger les avis des composants.','Fichiers d’avis inclus'],
  it:['Componente','Caricamento delle informative…','Impossibile caricare le informative dei componenti.','File informativi inclusi'],
  es:['Componente','Cargando avisos de componentes…','No se pudieron cargar los avisos de componentes.','Archivos de avisos incluidos'],
  'pt-PT':['Componente','A carregar avisos dos componentes…','Não foi possível carregar os avisos dos componentes.','Ficheiros de avisos incluídos'],
  ja:['コンポーネント名','コンポーネントの表示を読み込み中…','コンポーネントの表示を読み込めませんでした。','同梱の表示ファイル'],
  ko:['구성 요소 이름','구성 요소 고지를 불러오는 중…','구성 요소 고지를 불러올 수 없습니다.','포함된 고지 파일']
};
export function thirdPartyText(locale: Locale, index: 0|1|2|3): string { return labels[locale][index]; }
