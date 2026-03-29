import type { WebSocket } from 'ws';
import { sendJson } from './messages.js';
import { gamesById } from './state.js';
import { allPlayersAnswered, finalizeQuestion, sendCurrentQuestion } from './quizEngine.js';
import { getUserForSocket, sendError } from './wsGameUtils.js';

export const handleStartGame = (ws: WebSocket, data: unknown, id: number): void => {
  const user = getUserForSocket(ws);
  if (!user) {
    sendError(ws, 'Register first', id);
    return;
  }
  if (typeof data !== 'object' || data === null) {
    sendError(ws, 'Invalid payload', id);
    return;
  }
  const gameId = (data as { gameId?: string }).gameId;
  if (typeof gameId !== 'string' || !gameId) {
    sendError(ws, 'gameId is required', id);
    return;
  }
  const game = gamesById.get(gameId);
  if (!game) {
    sendError(ws, 'Game not found', id);
    return;
  }
  if (game.hostId !== user.index) {
    sendError(ws, 'Only the host can start the game', id);
    return;
  }
  if (game.status !== 'waiting') {
    sendError(ws, 'Game already started', id);
    return;
  }
  if (game.players.length < 1) {
    sendError(ws, 'At least one player is required', id);
    return;
  }

  game.status = 'in_progress';
  game.currentQuestion = 0;
  game.playerAnswers = new Map();
  sendCurrentQuestion(game);
};

export const handleAnswer = (ws: WebSocket, data: unknown, id: number): void => {
  const user = getUserForSocket(ws);
  if (!user) {
    sendError(ws, 'Register first', id);
    return;
  }
  if (typeof data !== 'object' || data === null) {
    sendError(ws, 'Invalid payload', id);
    return;
  }
  const { gameId, questionIndex, answerIndex } = data as {
    gameId?: string;
    questionIndex?: number;
    answerIndex?: number;
  };
  if (typeof gameId !== 'string' || typeof questionIndex !== 'number' || typeof answerIndex !== 'number') {
    sendError(ws, 'Invalid answer payload', id);
    return;
  }
  const game = gamesById.get(gameId);
  if (!game || game.status !== 'in_progress') {
    sendError(ws, 'Game is not active', id);
    return;
  }
  if (questionIndex !== game.currentQuestion) {
    sendError(ws, 'Wrong question', id);
    return;
  }
  if (answerIndex < 0 || answerIndex > 3) {
    sendError(ws, 'Invalid option', id);
    return;
  }

  const player = game.players.find((p) => p.index === user.index);
  if (!player) {
    sendError(ws, 'You are not a player in this game', id);
    return;
  }
  if (game.playerAnswers.has(player.index)) {
    sendError(ws, 'Already answered', id);
    return;
  }

  game.playerAnswers.set(player.index, { answerIndex, timestamp: Date.now() });
  sendJson(ws, { type: 'answer_accepted', data: { questionIndex }, id });

  if (allPlayersAnswered(game)) {
    finalizeQuestion(game);
  }
};
