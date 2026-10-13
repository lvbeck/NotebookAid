import type { Locale } from './i18n';
const labels:Record<Locale,string[]>={
 en:['Rename','Duplicate','Delete','Move to folder','Add tags','Cut','Copy','Paste','Select all','Cancel','Save','Note title','Folder','Tags','No tags available. Create tags in folder and tag management.',' (copy)'],
 'zh-CN':['重命名','复制','删除','移动到文件夹','添加标签','剪切','复制','粘贴','全选','取消','保存','笔记标题','文件夹','标签','暂无可添加的标签，请在文件夹与标签管理中创建。','（副本）'],
 'zh-TW':['重新命名','複製','刪除','移至資料夾','新增標籤','剪下','複製','貼上','全選','取消','儲存','筆記標題','資料夾','標籤','沒有可新增的標籤，請在資料夾與標籤管理中建立。','（副本）'],
 de:['Umbenennen','Duplizieren','Löschen','In Ordner verschieben','Tags hinzufügen','Ausschneiden','Kopieren','Einfügen','Alles auswählen','Abbrechen','Speichern','Notiztitel','Ordner','Tags','Keine Tags verfügbar. Erstellen Sie Tags in der Ordner- und Tagverwaltung.',' (Kopie)'],
 fr:['Renommer','Dupliquer','Supprimer','Déplacer vers un dossier','Ajouter des étiquettes','Couper','Copier','Coller','Tout sélectionner','Annuler','Enregistrer','Titre de la note','Dossier','Étiquettes','Aucune étiquette disponible. Créez-en dans la gestion des dossiers et étiquettes.',' (copie)'],
 it:['Rinomina','Duplica','Elimina','Sposta nella cartella','Aggiungi etichette','Taglia','Copia','Incolla','Seleziona tutto','Annulla','Salva','Titolo della nota','Cartella','Etichette','Nessuna etichetta disponibile. Creane nella gestione delle cartelle ed etichette.',' (copia)'],
 es:['Renombrar','Duplicar','Eliminar','Mover a carpeta','Añadir etiquetas','Cortar','Copiar','Pegar','Seleccionar todo','Cancelar','Guardar','Título de la nota','Carpeta','Etiquetas','No hay etiquetas disponibles. Créalas en la gestión de carpetas y etiquetas.',' (copia)'],
 'pt-PT':['Mudar nome','Duplicar','Eliminar','Mover para pasta','Adicionar etiquetas','Cortar','Copiar','Colar','Selecionar tudo','Cancelar','Guardar','Título da nota','Pasta','Etiquetas','Não há etiquetas disponíveis. Crie-as na gestão de pastas e etiquetas.',' (cópia)'],
};
const keys=['rename','duplicate','delete','move','tags','cut','copy','paste','selectAll','cancel','save','title','folder','tagLabel','noTags','copySuffix'] as const;
export type ContextKey=typeof keys[number];
export function contextText(locale:Locale,key:ContextKey):string{return labels[locale][keys.indexOf(key)];}
