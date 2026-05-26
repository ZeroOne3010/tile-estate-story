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
let lang: Language = detectLanguage();
let previewPos: Coord | null = null;

function persist() { saveState(state); }

function redraw() {
  const breakdown = state.selectedMarketIndex !== null && previewPos
    ? previewScore(state, previewPos, state.market[state.selectedMarketIndex])
    : null;
  render(appRoot, state, lang, { pos: previewPos, breakdown });
  bindEvents();
}

function onGameOverCheck() {
  if (!state.gameOver) return;
  const winner = state.scores[0] === state.scores[1] ? 'tie' : (state.scores[0] > state.scores[1] ? 'p1' : 'p2');
  saveHighScore({ date: new Date().toISOString().slice(0,10), p1: state.scores[0], p2: state.scores[1], winner, lang });
}

function bindEvents() {
appRoot.querySelector('#lang')?.addEventListener('click', () => { lang = lang === 'en' ? 'fi' : 'en'; setLanguage(lang); redraw(); });
appRoot.querySelector('#newGame')?.addEventListener('click', () => { state = createInitialState(); persist(); redraw(); });
appRoot.querySelector('#undo')?.addEventListener('click', () => { if (undoMove(state)) { persist(); redraw(); } });

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
      onGameOverCheck();
      persist();
      previewPos = null;
      redraw();
    });
  });
}

persist();
redraw();
