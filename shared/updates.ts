export type UpdatePhase = 'unconfigured' | 'portable' | 'idle' | 'checking' | 'current' | 'downloading' | 'ready' | 'error';
export interface UpdateState { phase: UpdatePhase; version?: string; percent?: number; }
export interface UpdatesApi { state(): Promise<UpdateState>; check(): Promise<UpdateState>; install(): Promise<UpdateState>; onState(callback: (state: UpdateState) => void): () => void; }
