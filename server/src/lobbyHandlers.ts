import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { sendJson } from './messages.js';
import {
  gameIdByCode,
  gameIdByUserIndex,
  gamesById,
  generateUniqueRoomCode,
  normalizeRoomCode,
  validateQuestionsPayload,
} from './state.js';
import { broadcastToGame, getUserForSocket, playersPayload, sendError } from './wsGameUtils.js';
import type { Game, Question } from './types.js';

export const handleCreateGame = (ws: WebSocket, data: unknown, id: number): void => {
  const user = getUserForSocket(ws);
  if (!user) {
    sendError(ws, 'Register first', id);
    return;
  }

  const existingGid = gameIdByUserIndex.get(user.index);
  if (existingGid) {
    const gExisting = gamesById.get(existingGid);
    if (gExisting) {
      if (gExisting.hostId === user.index) {
        sendError(ws, 'You already have an active game', id);
        return;
      }
      sendError(ws, 'Leave your current game before creating one', id);
      return;
    }
    gameIdByUserIndex.delete(user.index);
  }

  if (typeof data !== 'object' || data === null) {
    sendError(ws, 'Invalid payload', id);
    return;
  }
  const questions = (data as { questions?: unknown }).questions;
  if (!validateQuestionsPayload(questions)) {
    sendError(ws, 'Invalid questions: need at least one with 4 options, correctIndex 0–3, timeLimitSec > 0', id);
    return;
  }

  const gameId = randomUUID();
  const code = generateUniqueRoomCode();
  const game: Game = {
    id: gameId,
    code,
    hostId: user.index,
    questions: questions as Question[],
    players: [],
    currentQuestion: -1,
    status: 'waiting',
    playerAnswers: new Map(),
  };
  gamesById.set(gameId, game);
  gameIdByCode.set(code, gameId);
  gameIdByUserIndex.set(user.index, gameId);

  sendJson(ws, { type: 'game_created', data: { gameId, code }, id });
};

export const handleJoinGame = (ws: WebSocket, data: unknown, id: number): void => {
  const user = getUserForSocket(ws);
  if (!user) {
    sendError(ws, 'Register first', id);
    return;
  }

  if (typeof data !== 'object' || data === null) {
    sendError(ws, 'Invalid payload', id);
    return;
  }
  const codeRaw = (data as { code?: string }).code;
  if (typeof codeRaw !== 'string' || !codeRaw.trim()) {
    sendError(ws, 'Room code is required', id);
    return;
  }
  const code = normalizeRoomCode(codeRaw);
  const gameId = gameIdByCode.get(code);
  if (!gameId) {
    sendError(ws, 'Game not found', id);
    return;
  }
  const game = gamesById.get(gameId);
  if (!game) {
    sendError(ws, 'Game not found', id);
    return;
  }
  if (game.status !== 'waiting') {
    sendError(ws, 'Game already started or finished', id);
    return;
  }
  if (user.index === game.hostId) {
    sendError(ws, 'Host cannot join as a player', id);
    return;
  }

  const alreadyOther = gameIdByUserIndex.get(user.index);
  if (alreadyOther && alreadyOther !== gameId) {
    sendError(ws, 'Already in another game', id);
    return;
  }

  const existingIdx = game.players.findIndex((p) => p.index === user.index);
  if (existingIdx >= 0) {
    const p = game.players[existingIdx]!;
    p.ws = ws;
    p.name = user.name;
  } else {
    game.players.push({ name: user.name, index: user.index, score: 0, ws });
    gameIdByUserIndex.set(user.index, gameId);
  }

  sendJson(ws, { type: 'game_joined', data: { gameId }, id });

  broadcastToGame(game, {
    type: 'player_joined',
    data: { playerName: user.name, playerCount: game.players.length },
    id: 0,
  });
  broadcastToGame(game, { type: 'update_players', data: playersPayload(game), id: 0 });
};
