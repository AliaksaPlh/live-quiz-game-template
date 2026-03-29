import { gameIdByCode, gameIdByUserIndex, gamesById } from './state.js';
import type { Game } from './types.js';

export const clearGameTimer = (game: Game): void => {
  if (game.questionTimer !== undefined) {
    clearTimeout(game.questionTimer);
    game.questionTimer = undefined;
  }
};

export const deleteGame = (gameId: string): void => {
  const game = gamesById.get(gameId);
  if (!game) return;
  clearGameTimer(game);
  gameIdByCode.delete(game.code);
  gamesById.delete(gameId);
  gameIdByUserIndex.delete(game.hostId);
  for (const p of game.players) {
    gameIdByUserIndex.delete(p.index);
  }
};

export const removePlayerFromGame = (game: Game, playerIndex: string): void => {
  game.players = game.players.filter((p) => p.index !== playerIndex);
  gameIdByUserIndex.delete(playerIndex);
};
