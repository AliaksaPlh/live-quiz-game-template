import type { WebSocket } from 'ws';
import { handleReg } from './authHandlers.js';
import { handleDisconnect } from './disconnectHandler.js';
import { handleCreateGame, handleJoinGame } from './lobbyHandlers.js';
import { handleAnswer, handleStartGame } from './quizHandlers.js';
import type { WSMessage } from './types.js';

export const handleMessage = (ws: WebSocket, raw: unknown): void => {
  let msg: WSMessage;
  try {
    if (typeof raw !== 'string') return;
    msg = JSON.parse(raw) as WSMessage;
  } catch {
    return;
  }
  if (typeof msg.type !== 'string') return;
  const id = typeof msg.id === 'number' ? msg.id : 0;

  switch (msg.type) {
    case 'reg':
      handleReg(ws, msg.data, id);
      break;
    case 'create_game':
      handleCreateGame(ws, msg.data, id);
      break;
    case 'join_game':
      handleJoinGame(ws, msg.data, id);
      break;
    case 'start_game':
      handleStartGame(ws, msg.data, id);
      break;
    case 'answer':
      handleAnswer(ws, msg.data, id);
      break;
    default:
      break;
  }
};

export const handleConnectionClose = (ws: WebSocket): void => {
  handleDisconnect(ws);
};
