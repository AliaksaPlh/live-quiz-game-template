import type { WebSocket } from 'ws';
import { sendJson } from './messages.js';
import { deleteGame, removePlayerFromGame } from './gameLifecycle.js';
import { allPlayersAnswered, finalizeQuestion } from './quizEngine.js';
import { gameIdByUserIndex, gamesById, userIndexByWs, usersByIndex } from './state.js';
import type { Game, WSMessage } from './types.js';
import { broadcastToGame, playersPayload } from './wsGameUtils.js';

const notifyHostDisconnected = (game: Game): void => {
  const msg: WSMessage = { type: 'error', data: { message: 'Host disconnected' }, id: 0 };
  for (const p of game.players) {
    if (p.ws) sendJson(p.ws, msg);
  }
};

export const handleDisconnect = (ws: WebSocket): void => {
  const userIndex = userIndexByWs.get(ws);
  userIndexByWs.delete(ws);
  if (!userIndex) return;

  const user = usersByIndex.get(userIndex);
  if (user) {
    if (user.ws === ws) user.ws = undefined;
  }

  const gid = gameIdByUserIndex.get(userIndex);
  if (!gid) return;

  const game = gamesById.get(gid);
  if (!game) {
    gameIdByUserIndex.delete(userIndex);
    return;
  }

  if (game.hostId === userIndex) {
    notifyHostDisconnected(game);
    deleteGame(game.id);
    return;
  }

  if (game.status === 'waiting') {
    removePlayerFromGame(game, userIndex);
    broadcastToGame(game, { type: 'update_players', data: playersPayload(game), id: 0 });
    return;
  }

  if (game.status === 'in_progress') {
    removePlayerFromGame(game, userIndex);
    broadcastToGame(game, { type: 'update_players', data: playersPayload(game), id: 0 });
    if (allPlayersAnswered(game)) {
      finalizeQuestion(game);
    }
  }
};
