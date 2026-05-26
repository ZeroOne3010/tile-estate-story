import type { Tile, TileType } from './model';

const DECK_COUNTS: Record<Exclude<TileType, 'empty' | 'busStop'>, number> = {
  residential: 18,
  commercial: 16,
  industrial: 14,
  improvement: 8,
};

export function createDeck(rng: () => number = Math.random): Tile[] {
  const deck: Tile[] = [];
  for (const [type, count] of Object.entries(DECK_COUNTS)) {
    for (let i = 0; i < count; i += 1) {
      deck.push({ type: type as Tile['type'], level: 1 });
    }
  }
  shuffle(deck, rng);
  return deck;
}

export function shuffle<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function drawTiles(deck: Tile[], n: number): Tile[] {
  const drawn: Tile[] = [];
  for (let i = 0; i < n; i += 1) {
    const next = deck.shift();
    if (!next) break;
    drawn.push(next);
  }
  return drawn;
}
