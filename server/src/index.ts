import { WebSocketServer, WebSocket } from 'ws';
import { getPort } from './config.js';
import { handleConnectionClose, handleMessage } from './handlers.js';

const PORT = getPort();
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    handleMessage(ws, data.toString());
  });
  ws.on('close', () => {
    handleConnectionClose(ws);
  });
});

const displayHost = process.env.HOST ?? 'localhost';
console.log(`WebSocket server address: ws://${displayHost}:${PORT}`);
