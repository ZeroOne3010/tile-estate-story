import type { GameState } from './model';
import { createInitialState } from './rules';

export function selectStartupState(savedState: GameState | null, requestedSeed: number | null): GameState {
  if (requestedSeed === null) return savedState ?? createInitialState();
  if (savedState?.seed === requestedSeed) return savedState;
  return createInitialState(requestedSeed);
}
