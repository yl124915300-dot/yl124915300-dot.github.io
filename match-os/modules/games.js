import { compareGroups, rank, readGameQuery } from '../decision.js?v=4';

export const games = {
  id: 'games', label: 'Digital PC games',
  schema: ['catalogGameId', 'edition', 'activation', 'market', 'license', 'claimExpiry'],
  horizontal: 'CheapShark game ID and edition title',
  requirements(brief, item) {
    const title = readGameQuery(item);
    return { title, browseFreeGames: !title || /^(?:games?|any games?|free games?|免费游戏)$/iu.test(title) };
  },
  evaluate(offers, intent, preference, now) {
    const rows = rank(offers, intent.brief, intent, preference, now);
    return { rows, groups: compareGroups(rows, intent) };
  },
};
