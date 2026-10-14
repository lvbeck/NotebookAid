export const eggIds = ['hello', 'echo', 'dawn', 'moon', 'explorer', 'opensource'] as const;
export type EggId = typeof eggIds[number];
export interface EasterState { enabled: boolean; reducedMotion: boolean; found: EggId[]; celebrated: boolean; }
export const defaultEasterState: EasterState = { enabled: true, reducedMotion: false, found: [], celebrated: false };
export function validEasterState(value: unknown): value is EasterState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as EasterState;
  return Object.keys(state).length === 4 && Object.keys(state).every(key => ['enabled', 'reducedMotion', 'found', 'celebrated'].includes(key))
    && typeof state.enabled === 'boolean' && typeof state.reducedMotion === 'boolean' && typeof state.celebrated === 'boolean'
    && Array.isArray(state.found) && state.found.length <= eggIds.length && new Set(state.found).size === state.found.length
    && state.found.every(id => eggIds.includes(id)) && (!state.celebrated || state.found.length === eggIds.length);
}
