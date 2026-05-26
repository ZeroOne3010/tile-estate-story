import type { Language, TileType } from './model';

export const LANG_KEY = 'tileEstateStory.language';

const dict = {
  en: {
    title: 'Tile Estate Story', currentPlayer: 'Current player', p1: 'Player 1', p2: 'Player 2',
    newGame: 'New Game', undo: 'Undo', market: 'Market', highScores: 'High Scores',
    gameOver: 'Game over', winner: 'Winner', tie: 'Tie', selectTile: 'Select a market tile',
    hoverHint: 'Tap an empty block to place', points: 'pts',
    scoringHintsTitle: 'Scoring hints',
    scoringResidential: '🟩 Residential',
    scoringResidentialBody: '+1 🟩 Residential (max +2), +1 🟦 Commercial (max +2), +2 🟪 Improvement.',
    scoringIndustrial: '🟨 Industrial',
    scoringIndustrialBody: '+1 🟨 Industrial (max +2), +1 🟦 Commercial (max +2), +2 🟪 Improvement.',
    scoringCommercial: '🟦 Commercial',
    scoringCommercialBody: '+1 per unique adjacent type: 🟩 🟦 🟨 🟪 ⬛.',
    scoringImprovement: '🟪 Improvement',
    scoringImprovementBody: '+1 per 2 occupied neighbors (8-neighborhood, rounded up).',
    scoringUpgraded: '⭐ Upgraded tiles',
    scoringUpgradedBody: '+1 extra adjacency value.',
  },
  fi: {
    title: 'Tile Estate Story', currentPlayer: 'Vuorossa', p1: 'Pelaaja 1', p2: 'Pelaaja 2',
    newGame: 'Uusi peli', undo: 'Peru', market: 'Markkinat', highScores: 'Huipputulokset',
    gameOver: 'Peli päättyi', winner: 'Voittaja', tie: 'Tasapeli', selectTile: 'Valitse markkinalaatta',
    hoverHint: 'Napauta tyhjää ruutua sijoittaaksesi', points: 'p',
    scoringHintsTitle: 'Pisteytysvinkit',
    scoringResidential: '🟩 Asuin',
    scoringResidentialBody: '+1 🟩 Asuin (max +2), +1 🟦 Liike (max +2), +2 🟪 Parannus.',
    scoringIndustrial: '🟨 Teollisuus',
    scoringIndustrialBody: '+1 🟨 Teollisuus (max +2), +1 🟦 Liike (max +2), +2 🟪 Parannus.',
    scoringCommercial: '🟦 Liike',
    scoringCommercialBody: '+1 per uniikki viereinen tyyppi: 🟩 🟦 🟨 🟪 ⬛.',
    scoringImprovement: '🟪 Parannus',
    scoringImprovementBody: '+1 per 2 varattua naapuria (8-naapurusto, pyöristys ylöspäin).',
    scoringUpgraded: '⭐ Päivitetyt laatat',
    scoringUpgradedBody: '+1 lisäarvo viereisyydestä.',
  },
} as const;

const tileLabels: Record<Language, Record<TileType, string>> = {
  en: { empty:'EMP', residential:'RES', commercial:'COM', industrial:'IND', improvement:'IMP', busStop:'BUS' },
  fi: { empty:'TYH', residential:'ASU', commercial:'LII', industrial:'TEH', improvement:'PAR', busStop:'BUS' },
};

export function detectLanguage(): Language {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'en' || stored === 'fi') return stored;
  return navigator.language.toLowerCase().startsWith('fi') ? 'fi' : 'en';
}

export function setLanguage(lang: Language): void { localStorage.setItem(LANG_KEY, lang); }
export function t(lang: Language, key: keyof typeof dict.en): string { return dict[lang][key]; }
export function tileLabel(lang: Language, type: TileType): string { return tileLabels[lang][type]; }
