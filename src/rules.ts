import { BOARD_SIZE, cloneBoard, cloneTile, type Coord, type GameState, type ScoreBreakdown, type Tile, type TileType } from './model';
import { createDeck, drawTiles } from './deck';

const ORTHO = [[-1,0],[1,0],[0,-1],[0,1]] as const;
const EIGHT = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as const;

export function createInitialState(): GameState {
  const board: Tile[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ type: 'empty', level: 1 })),
  );
  const busStops: [Coord, Coord] = [{ r: 1, c: 1 }, { r: 6, c: 6 }];
  for (const p of busStops) board[p.r][p.c] = { type: 'busStop', level: 1, fixed: true };
  board[1][2] = { type: 'residential', level: 1, fixed: true };
  board[6][5] = { type: 'commercial', level: 1, fixed: true };
  board[0][1] = { type: 'improvement', level: 1, fixed: true };
  board[1][0] = { type: 'industrial', level: 1, fixed: true };
  board[6][7] = { type: 'residential', level: 1, fixed: true };
  board[7][6] = { type: 'industrial', level: 1, fixed: true };

  const deck = createDeck();
  const market = drawTiles(deck, 3);
  return { board, currentPlayer: 0, scores: [0,0], market, deck, selectedMarketIndex: null, lastGain: 0, lastGainPos: null, gameOver: false, busStops, history: [], playerNames: ['Player 1', 'Player 2'] };
}

function inBounds(r:number,c:number){return r>=0&&c>=0&&r<BOARD_SIZE&&c<BOARD_SIZE;}

function orthoNeighbors(pos: Coord): Coord[] { return ORTHO.map(([dr,dc])=>({r:pos.r+dr,c:pos.c+dc})).filter(p=>inBounds(p.r,p.c)); }
function eightNeighbors(pos: Coord): Coord[] { return EIGHT.map(([dr,dc])=>({r:pos.r+dr,c:pos.c+dc})).filter(p=>inBounds(p.r,p.c)); }

function getPositiveNeighbors(state: GameState, pos: Coord): Tile[] {
  const direct = orthoNeighbors(pos).map((p)=>state.board[p.r][p.c]).filter((t)=>t.type!=='empty');
  const teleport: Tile[] = [];
  const [a,b] = state.busStops;
  const adjacentA = orthoNeighbors(a).some((p)=>p.r===pos.r&&p.c===pos.c);
  const adjacentB = orthoNeighbors(b).some((p)=>p.r===pos.r&&p.c===pos.c);
  if (adjacentA) teleport.push(...orthoNeighbors(b).map((p)=>state.board[p.r][p.c]).filter((t)=>t.type!=='empty'&&t.type!=='busStop'));
  if (adjacentB) teleport.push(...orthoNeighbors(a).map((p)=>state.board[p.r][p.c]).filter((t)=>t.type!=='empty'&&t.type!=='busStop'));
  return [...direct, ...teleport];
}

function neighborValue(tile: Tile, base: number): number { return base + (tile.level === 2 ? 1 : 0); }

export function previewScore(state: GameState, pos: Coord, tile: Tile): ScoreBreakdown {
  if (state.board[pos.r][pos.c].type !== 'empty') return { points: 0, reasons: [] };
  const neighbors = getPositiveNeighbors(state, pos);
  let points = 0;
  const reasons: string[] = [];

  if (tile.type === 'residential') {
    let resPts = 0; let comPts = 0;
    neighbors.forEach((n)=>{
      if (n.type==='residential' && resPts<2) { const v = Math.min(2-resPts, neighborValue(n,1)); resPts+=v; reasons.push('residential'); }
      if (n.type==='commercial' && comPts<2) { const v = Math.min(2-comPts, neighborValue(n,1)); comPts+=v; reasons.push('commercial'); }
      if (n.type==='improvement') { points += neighborValue(n,2); reasons.push('improvement'); }
    });
    points += resPts + comPts;
  }
  if (tile.type === 'industrial') {
    let indPts = 0; let comPts = 0;
    neighbors.forEach((n)=>{
      if (n.type==='industrial' && indPts<2) { const v=Math.min(2-indPts, neighborValue(n,1)); indPts+=v; reasons.push('industrial'); }
      if (n.type==='commercial' && comPts<2) { const v=Math.min(2-comPts, neighborValue(n,1)); comPts+=v; reasons.push('commercial'); }
      if (n.type==='improvement') { points += neighborValue(n,2); reasons.push('improvement'); }
    });
    points += indPts + comPts;
  }
  if (tile.type === 'commercial') {
    const unique = new Set<TileType>();
    neighbors.forEach((n)=>{ if (n.type!=='empty') unique.add(n.type); });
    points += Math.min(5, unique.size);
    reasons.push(...Array.from(unique));
  }
  if (tile.type === 'improvement') {
    const occupied = eightNeighbors(pos).filter((p)=>state.board[p.r][p.c].type!=='empty').length;
    points += Math.ceil(occupied / 2);
    if (occupied>0) reasons.push(`occupied:${occupied}`);
  }
  return { points, reasons };
}

export function recalcUpgrades(state: GameState, around: Coord): void {
  const toCheck = [around, ...eightNeighbors(around)];
  for (const p of toCheck) {
    const t = state.board[p.r][p.c];
    if (t.type==='empty' || t.type==='busStop' || t.level===2) continue;
    const occupied = eightNeighbors(p).filter((n)=>state.board[n.r][n.c].type!=='empty').length;
    if (occupied >= 4) state.board[p.r][p.c] = { ...t, level: 2 };
  }
}

export function isBoardFull(state: GameState): boolean {
  return state.board.every((row)=>row.every((tile)=>tile.type!=='empty'));
}

export function hasPlaceableTilesRemaining(state: GameState): boolean {
  return state.market.length > 0 || state.deck.length > 0;
}

export function applyMove(state: GameState, pos: Coord, marketIndex: number): ScoreBreakdown | null {
  if (state.gameOver) return null;
  if (state.board[pos.r][pos.c].type !== 'empty') return null;
  const picked = state.market[marketIndex];
  if (!picked) return null;

  state.history.push({
    player: state.currentPlayer, position: pos, placedTile: cloneTile(picked), marketIndex,
    pointsGained: 0, previousBoard: cloneBoard(state.board), previousMarket: state.market.map(cloneTile),
    previousDeck: state.deck.map(cloneTile), previousScores: [...state.scores] as [number,number], previousCurrentPlayer: state.currentPlayer,
  });

  const breakdown = previewScore(state, pos, picked);
  state.board[pos.r][pos.c] = cloneTile(picked);
  recalcUpgrades(state, pos);
  state.scores[state.currentPlayer] += breakdown.points;
  const move = state.history[state.history.length - 1];
  move.pointsGained = breakdown.points;

  state.market.splice(marketIndex, 1);
  const refill = drawTiles(state.deck, 1);
  if (refill[0]) state.market.push(refill[0]);

  state.lastGain = breakdown.points;
  state.lastGainPos = pos;
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.selectedMarketIndex = null;
  state.gameOver = isBoardFull(state) || !hasPlaceableTilesRemaining(state);
  return breakdown;
}

export function undoMove(state: GameState): boolean {
  const last = state.history.pop();
  if (!last) return false;
  state.board = cloneBoard(last.previousBoard);
  state.market = last.previousMarket.map(cloneTile);
  state.deck = last.previousDeck.map(cloneTile);
  state.scores = [...last.previousScores] as [number,number];
  state.currentPlayer = last.previousCurrentPlayer;
  state.gameOver = false;
  state.lastGain = 0;
  state.lastGainPos = null;
  return true;
}
