import { tileLabel, t } from './i18n';
import type { Coord, GameState, Language, ScoreBreakdown, Tile } from './model';
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

export function render(app: HTMLElement, state: GameState, lang: Language, showTileText: boolean, preview: {pos: Coord | null; breakdown: ScoreBreakdown | null}): void {
  const hs = loadHighScores();
  app.innerHTML = `
  <main class="layout">
    <header><h1>${t(lang,'title')}</h1><div class="controls"><button id="lang">${lang.toUpperCase()}</button><button id="toggleTileText">${showTileText ? t(lang,'tileTextOn') : t(lang,'tileTextOff')}</button><button id="newGame">${t(lang,'newGame')}</button><button id="undo">${t(lang,'undo')}</button></div>
    <div class="status">${t(lang,'currentPlayer')}: <strong>${state.currentPlayer===0?t(lang,'p1'):t(lang,'p2')}</strong></div>
    <div class="scores"><span>${t(lang,'p1')}: ${state.scores[0]}</span><span>${t(lang,'p2')}: ${state.scores[1]}</span></div>
    ${state.gameOver?`<div class="banner">${t(lang,'gameOver')}</div>`:''}</header>
    <section id="board" class="board"></section>
    <section class="preview">${preview.breakdown?`+${preview.breakdown.points}: ${preview.breakdown.reasons.join(' + ')}`:(state.selectedMarketIndex===null?t(lang,'selectTile'):t(lang,'hoverHint'))}</section>
    <section><h2>${t(lang,'market')}</h2><div id="market" class="market"></div></section>
    <section><h3>${t(lang,'highScores')}</h3><ol>${hs.map((e)=>`<li>${e.date}: ${e.p1}-${e.p2}</li>`).join('')}</ol></section>
    <section class="scoring-hints">
      <h3>${t(lang,'scoringHintsTitle')}</h3>
      <ul>
        <li><strong>${t(lang,'scoringResidential')}</strong><br/>${t(lang,'scoringResidentialBody')}</li>
        <li><strong>${t(lang,'scoringIndustrial')}</strong><br/>${t(lang,'scoringIndustrialBody')}</li>
        <li><strong>${t(lang,'scoringCommercial')}</strong><br/>${t(lang,'scoringCommercialBody')}</li>
        <li><strong>${t(lang,'scoringImprovement')}</strong><br/>${t(lang,'scoringImprovementBody')}</li>
        <li><strong>${t(lang,'scoringUpgraded')}</strong><br/>${t(lang,'scoringUpgradedBody')}</li>
      </ul>
    </section>
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
