import type { GameState, Language } from './model';

const STATE_KEY = 'tileEstateStory.state';
const SCORES_KEY = 'tileEstateStory.highScores';

export interface HighScoreEntry {
  date: string;
  p1: number;
  p2: number;
  winner: 'p1' | 'p2' | 'tie';
  lang: Language;
}

export function saveState(state: GameState): void { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
export function loadState(): GameState | null {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as GameState; } catch { return null; }
}

export function saveHighScore(entry: HighScoreEntry): void {
  const list = loadHighScores();
  list.unshift(entry);
  localStorage.setItem(SCORES_KEY, JSON.stringify(list.slice(0, 10)));
}
export function loadHighScores(): HighScoreEntry[] {
  const raw = localStorage.getItem(SCORES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as HighScoreEntry[]; } catch { return []; }
}
