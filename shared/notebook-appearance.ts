export const defaultNotebookColor = '#7460c9';
export interface NotebookAppearance { version: 1; color: string; cover: string | null; }
export const defaultNotebookAppearance = (): NotebookAppearance => ({ version: 1, color: defaultNotebookColor, cover: null });
