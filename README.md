# Tile Estate Story

Tile Estate Story is a browser-only, local 2-player turn-based tile placement game built with Vite + TypeScript and plain DOM/CSS Grid.

## Game overview
- 8x8 city block board.
- 2 local players alternate turns.
- Choose one of 3 market tiles and place on an empty block.
- Score immediately based on neighbors and upgrades.
- Game ends when board is full; higher score wins.
- Game also ends if no placeable market/deck tiles remain.

## Current rules
- Tile types: residential, commercial, industrial, improvement, bus stop.
- Market deck: residential 18, commercial 16, industrial 14, improvement 8.
- Seeded board includes 2 linked bus stops and two starter development tiles.
- Orthogonal adjacency for scoring; 8-neighborhood for upgrades.
- Upgrade triggers at 4+ occupied 8-neighbors.
- Upgraded neighbors add +1 bonus when contributing score.
- Bus stop pair extends positive orthogonal neighbors across the linked stop.

## Run locally
```bash
npm install
npm run dev
```

Build and preview:
```bash
npm run build
npm run preview
```

## GitHub Pages deploy
- Workflow: `.github/workflows/deploy.yml`.
- `vite.config.ts` sets base to `/tile-estate-story/` on GitHub Actions and `/` locally.
- Push to `main` to trigger deployment.

## PNG tile art
Place optional PNG assets under `public/assets/tiles/`:
- residential-1.png / residential-2.png
- commercial-1.png / commercial-2.png
- industrial-1.png / industrial-2.png
- improvement-1.png / improvement-2.png
- bus-stop.png
- empty.png

If files are missing, fallback colored tiles and short labels render automatically.

## localStorage usage
- `tileEstateStory.state`: full game state persistence (board, market, scores, turn, history).
- `tileEstateStory.language`: selected UI language (`en` or `fi`).
- `tileEstateStory.highScores`: top 10 completed game results.

## Known TODOs
- Add unit tests for `rules.ts` scoring and bus-stop transfer logic.
- Improve scoring breakdown text localization and clarity.
- Add animation/sound polish and accessibility improvements.
- Add richer high-score metadata (duration, move count).
