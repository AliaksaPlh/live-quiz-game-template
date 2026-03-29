import { WebSocket } from 'ws';
import { broadcastJson, sendJson } from './messages.js';
import { userIndexByWs, usersByIndex } from './state.js';
import type { Game, User, WSMessage } from './types.js';

export const sendError = (ws: WebSocket, message: string, id: number): void => {
  sendJson(ws, { type: 'error', data: { message }, id });
};

export const getUserForSocket = (ws: WebSocket): User | undefined => {
  const idx = userIndexByWs.get(ws);
  if (!idx) return undefined;
  return usersByIndex.get(idx);
};

export const collectGameSockets = (game: Game): WebSocket[] => {
  const host = usersByIndex.get(game.hostId);
  const out: WebSocket[] = [];
  if (host?.ws && host.ws.readyState === WebSocket.OPEN) out.push(host.ws);
  for (const p of game.players) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) out.push(p.ws);
  }
  return out;
};

export const broadcastToGame = (game: Game, message: WSMessage): void => {
  broadcastJson(collectGameSockets(game), message);
};

export const playersPayload = (game: Game): Array<{ name: string; index: string; score: number }> =>
  game.players.map((p) => ({ name: p.name, index: p.index, score: p.score }));
