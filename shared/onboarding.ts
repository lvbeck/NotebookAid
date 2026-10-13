export interface OnboardingState { version: 1; enabled: boolean; completed: boolean; started: boolean; step: number; }
export const defaultOnboarding: OnboardingState = { version: 1, enabled: true, completed: false, started: false, step: 0 };
export function validOnboarding(value: unknown): value is OnboardingState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as OnboardingState;
  return Object.keys(value).length === 5 && Object.keys(value).every(key => ['version','enabled','completed','started','step'].includes(key)) && state.version === 1 && typeof state.enabled === 'boolean' && typeof state.completed === 'boolean' && typeof state.started === 'boolean' && Number.isInteger(state.step) && state.step >= 0 && state.step < 6 && (!state.completed || state.started && state.step === 5) && (state.started || state.step === 0);
}
