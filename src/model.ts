export type Language = 'en' | 'fi';
export type PlayerId = 0 | 1;
export type TileType = 'empty' | 'residential' | 'commercial' | 'industrial' | 'improvement' | 'busStop';

export interface Tile {
  type: TileType;
  level: 1 | 2;
  fixed?: boolean;
}

export interface Coord {
  r: number;
  c: number;
}

export interface MoveRecord {
  player: PlayerId;
  position: Coord;
  placedTile: Tile;
  marketIndex: number;
  pointsGained: number;
  previousBoard: Tile[][];
  previousMarket: Tile[];
  previousDeck: Tile[];
  previousScores: [number, number];
  previousCurrentPlayer: PlayerId;
}

export interface GameState {
  board: Tile[][];
  currentPlayer: PlayerId;
  scores: [number, number];
  market: Tile[];
  deck: Tile[];
  selectedMarketIndex: number | null;
  lastGain: number;
  lastGainPos: Coord | null;
  gameOver: boolean;
  busStops: [Coord, Coord];
  history: MoveRecord[];
  playerNames: [string, string];
}

export interface ScoreBreakdown {
  points: number;
  reasons: string[];
}

export const BOARD_SIZE = 8;

export function cloneTile(t: Tile): Tile {
  return { ...t };
}

export function cloneBoard(board: Tile[][]): Tile[][] {
  return board.map((row) => row.map(cloneTile));
}
