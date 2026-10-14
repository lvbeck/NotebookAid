export type StartupPhase = 'opening' | 'recovery' | 'notes' | 'history' | 'restoring';
export interface StartupProgress { phase: StartupPhase; processed?: number; total?: number; }
export interface StartupMetrics { totalMs: number; phasesMs: Record<string, number>; }
