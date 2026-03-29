import { WebSocket } from 'ws';
import type { WSMessage } from './types.js';

export const sendJson = (socket: WebSocket, message: WSMessage): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const broadcastJson = (sockets: Iterable<WebSocket>, message: WSMessage): void => {
  const payload = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
};
