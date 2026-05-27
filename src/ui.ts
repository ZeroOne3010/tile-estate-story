import { t, tileLabel } from './i18n';
import type { Coord, GameState, Language, ScoreBreakdown, Tile, TileType } from './model';
import { loadHighScores } from './storage';

const TILE_COLORS: Record<string, string> = {
  empty: '#f1f5f9', residential: '#2f9e44', commercial: '#1c7ed6', industrial: '#fcc419', improvement: '#9c36b5', busStop: '#212529',
};

function tileAsset(tile: Tile): string {
  const base = import.meta.env.BASE_URL;
  if (tile.type === 'empty') return `${base}assets/tiles/empty.png`;
  if (tile.type === 'busStop') return `${base}assets/tiles/bus-stop.png`;
  return `${base}assets/tiles/${tile.type}-${tile.level}.png`;
}


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reasonLabel(lang: Language, reason: string): string {
  const byType: Partial<Record<TileType, string>> = {
    residential: t(lang, 'scoringResidential').replace('🟩 ', ''),
    commercial: t(lang, 'scoringCommercial').replace('🟦 ', ''),
    industrial: t(lang, 'scoringIndustrial').replace('🟨 ', ''),
    improvement: t(lang, 'scoringImprovement').replace('🟪 ', ''),
    busStop: 'Bus',
  };
  if ((reason as TileType) in byType) return byType[reason as TileType] ?? reason;
  if (reason.startsWith('occupied:')) return t(lang, 'scoringImprovement').replace('🟪 ', '');
  return reason;
}

export function render(
  app: HTMLElement,
  state: GameState,
  lang: Language,
  showTileText: boolean,
  preview: {pos: Coord | null; breakdown: ScoreBreakdown | null},
  latestScore: { player: 0 | 1; points: number; reasons: string[]; pos: Coord } | null,
): void {
  const hs = loadHighScores();
  const [p1NameRaw, p2NameRaw] = state.playerNames;
  const p1Name = escapeHtml(p1NameRaw);
  const p2Name = escapeHtml(p2NameRaw);
  const remainingCounts = {
    residential: state.deck.filter((x) => x.type === 'residential').length,
    commercial: state.deck.filter((x) => x.type === 'commercial').length,
    industrial: state.deck.filter((x) => x.type === 'industrial').length,
    improvement: state.deck.filter((x) => x.type === 'improvement').length,
  };
  app.innerHTML = `
  <main class="layout">
    <header><h1>${t(lang,'title')}</h1><div class="controls"><button id="lang">${lang.toUpperCase()}</button><button id="toggleTileText">${showTileText ? t(lang,'tileTextOn') : t(lang,'tileTextOff')}</button><button id="setPlayers">${p1Name} / ${p2Name}</button><button id="newGame">${t(lang,'newGame')}</button><button id="undo">${t(lang,'undo')}</button></div>
    <div class="status">${t(lang,'currentPlayer')}: <strong>${state.currentPlayer===0?p1Name:p2Name}</strong></div>
    <div class="scores"><span>${p1Name}: ${state.scores[0]}</span><span>${p2Name}: ${state.scores[1]}</span></div>
    ${state.gameOver?`<div class="banner">${t(lang,'gameOver')}</div>`:''}</header>
    <section id="board" class="board"></section>
    <section class="preview">${preview.breakdown?`+${preview.breakdown.points}: ${preview.breakdown.reasons.map((r) => reasonLabel(lang, r)).join(' + ')}`:(state.selectedMarketIndex===null?`${t(lang,'selectTile')}, ${state.currentPlayer===0?p1Name:p2Name}!`:t(lang,'hoverHint'))}</section>
    <section class="latest-score">${
      latestScore
        ? `${t(lang, 'latestScore')}: ${latestScore.player === 0 ? p1Name : p2Name} +${latestScore.points}${latestScore.reasons.length ? ` (${latestScore.reasons.slice(0, 3).map((r) => reasonLabel(lang, r)).join(' + ')})` : ''}`
        : t(lang, 'latestScoreEmpty')
    }</section>
    <section><h2>${t(lang,'market')}</h2><div id="market" class="market"></div><div class="tile-counts">${t(lang,'tileCounts')}: RES ${remainingCounts.residential}, COM ${remainingCounts.commercial}, IND ${remainingCounts.industrial}, IMP ${remainingCounts.improvement} (total ${state.deck.length})</div></section>
    <section><h3>${t(lang,'highScores')}</h3><ol>${hs.map((e)=>`<li>${e.date}: ${e.p1}-${e.p2}</li>`).join('')}</ol></section>
  </main>`;

  const boardEl = app.querySelector('#board') as HTMLElement;
  state.board.forEach((row, r) => row.forEach((cell, c) => {
    const btn = document.createElement('button');
    btn.className = `cell ${cell.type} ${cell.level===2?'upgraded':''}`;
    btn.dataset.r = String(r); btn.dataset.c = String(c);
    if (cell.type !== 'empty') btn.style.backgroundColor = TILE_COLORS[cell.type] ?? '#ddd';
    if (cell.type !== 'empty') {
      btn.innerHTML = `<img alt="${cell.type}" src="${tileAsset(cell)}"/>${showTileText ? `<span>${tileLabel(lang, cell.type)}</span>` : ''}`;
      const img = btn.querySelector('img') as HTMLImageElement;
      img.onerror = () => { img.style.display = 'none'; btn.classList.add('fallback'); };
    }
    if (latestScore && latestScore.pos.r === r && latestScore.pos.c === c && latestScore.points > 0) {
      btn.insertAdjacentHTML('beforeend', `<span class="score-pop">+${latestScore.points}</span>`);
    }
    if (cell.type !== 'empty') btn.disabled = true;
    boardEl.appendChild(btn);
  }));

  const marketEl = app.querySelector('#market') as HTMLElement;
  state.market.forEach((tile, i) => {
    const b = document.createElement('button');
    b.className = `market-tile ${state.selectedMarketIndex===i?'selected':''}`;
    b.dataset.market = String(i);
    b.style.backgroundColor = TILE_COLORS[tile.type];
    b.innerHTML = `<img alt="${tile.type}" src="${tileAsset(tile)}"/><span>${tileLabel(lang, tile.type)}</span>`;
    const img = b.querySelector('img') as HTMLImageElement;
    img.onerror = () => { img.style.display = 'none'; b.classList.add('fallback'); };
    marketEl.appendChild(b);
  });
}
