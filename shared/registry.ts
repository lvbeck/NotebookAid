import type { LibraryErrorCode, LibraryStatus, Result } from './library';
export interface LibraryEntry { id: string; libraryId: string | null; name: string; path: string; lastOpenedAt: string | null; }
export interface LibraryEntryState extends LibraryEntry { appearance?: import('./notebook-appearance').NotebookAppearance; appearanceIssue?: boolean; availability: 'available' | LibraryErrorCode; current: boolean; schemaVersion: number | null; }
export interface RegistryState { entries: LibraryEntryState[]; activeId: string | null; }
export interface RegistryApi {
  chooseNotebookCover(id: string): Promise<Result<string | null>>;
  setNotebookAppearance(id: string, value: import('./notebook-appearance').NotebookAppearance): Promise<Result<RegistryState>>;
  registry(): Promise<Result<RegistryState>>;
  register(mode: 'existing' | 'create'): Promise<Result<RegistryState | null>>;
  activate(id: string): Promise<Result<LibraryStatus>>;
  rename(id: string, name: string): Promise<Result<RegistryState>>;
  relocate(id: string): Promise<Result<RegistryState | null>>;
  remove(id: string): Promise<Result<RegistryState>>;
}
