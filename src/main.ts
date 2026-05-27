import './styles.css';
import { detectLanguage, setLanguage } from './i18n';
import { createInitialState, applyMove, previewScore, undoMove } from './rules';
import { loadState, saveHighScore, saveState } from './storage';
import type { Coord, GameState, Language } from './model';
import { render } from './ui';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing');
const appRoot: HTMLElement = app;

let state: GameState = loadState() ?? createInitialState();
if (!state.playerNames) state.playerNames = ['Player 1', 'Player 2'];
let lang: Language = detectLanguage();
let previewPos: Coord | null = null;
let latestScore: { player: 0 | 1; points: number; reasons: string[]; pos: Coord } | null = null;
const TILE_TEXT_KEY = 'tileEstateStory.showTileText';
let showTileText = localStorage.getItem(TILE_TEXT_KEY) !== '0';

function persist() { saveState(state); }

function redraw() {
  const breakdown = state.selectedMarketIndex !== null && previewPos
    ? previewScore(state, previewPos, state.market[state.selectedMarketIndex])
    : null;
  render(appRoot, state, lang, showTileText, { pos: previewPos, breakdown }, latestScore);
  bindEvents();
}

function onGameOverCheck() {
  if (!state.gameOver) return;
  const winner = state.scores[0] === state.scores[1] ? 'tie' : (state.scores[0] > state.scores[1] ? 'p1' : 'p2');
  saveHighScore({ date: new Date().toISOString().slice(0,10), p1: state.scores[0], p2: state.scores[1], winner, lang });
}

function bindEvents() {
appRoot.querySelector('#lang')?.addEventListener('click', () => { lang = lang === 'en' ? 'fi' : 'en'; setLanguage(lang); redraw(); });
appRoot.querySelector('#toggleTileText')?.addEventListener('click', () => { showTileText = !showTileText; localStorage.setItem(TILE_TEXT_KEY, showTileText ? '1' : '0'); redraw(); });
appRoot.querySelector('#newGame')?.addEventListener('click', () => { latestScore = null; state = createInitialState(); state.playerNames = [...state.playerNames]; persist(); redraw(); });
appRoot.querySelector('#setPlayers')?.addEventListener('click', () => {
  const p1 = prompt(lang === 'fi' ? 'Anna Pelaaja 1 nimi' : 'Enter Player 1 name', state.playerNames[0])?.trim();
  const p2 = prompt(lang === 'fi' ? 'Anna Pelaaja 2 nimi' : 'Enter Player 2 name', state.playerNames[1])?.trim();
  if (p1) state.playerNames[0] = p1;
  if (p2) state.playerNames[1] = p2;
  persist();
  redraw();
});
appRoot.querySelector('#undo')?.addEventListener('click', () => { if (undoMove(state)) { latestScore = null; persist(); redraw(); } });

appRoot.querySelectorAll<HTMLElement>('.market-tile').forEach((el) => {
    el.addEventListener('click', () => { state.selectedMarketIndex = Number(el.dataset.market); redraw(); });
  });

appRoot.querySelectorAll<HTMLElement>('.cell').forEach((el) => {
    const pos = { r: Number(el.dataset.r), c: Number(el.dataset.c) };
    el.addEventListener('pointerenter', () => { previewPos = pos; redraw(); });
    el.addEventListener('click', () => {
      if (state.selectedMarketIndex === null) return;
      const res = applyMove(state, pos, state.selectedMarketIndex);
      if (!res) return;
      latestScore = { player: state.currentPlayer === 0 ? 1 : 0, points: res.points, reasons: res.reasons, pos };
      onGameOverCheck();
      persist();
      previewPos = null;
      redraw();
    });
  });
}

persist();
redraw();
