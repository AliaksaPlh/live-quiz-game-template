import type { WebSocket } from 'ws';
import { sendJson } from './messages.js';
import {
  createUserIndex,
  indexByName,
  normalizePlayerNameKey,
  userIndexByWs,
  usersByIndex,
} from './state.js';
import type { User } from './types.js';

export const handleReg = (ws: WebSocket, data: unknown, id: number): void => {
  if (typeof data !== 'object' || data === null) {
    sendJson(ws, {
      type: 'reg',
      data: { name: '', index: '', error: true, errorText: 'Invalid payload' },
      id,
    });
    return;
  }
  const d = data as { name?: string; password?: string };
  const name = typeof d.name === 'string' ? d.name.trim() : '';
  const password = typeof d.password === 'string' ? d.password : '';
  if (!name || !password) {
    sendJson(ws, {
      type: 'reg',
      data: { name: name || '', index: '', error: true, errorText: 'Name and password are required' },
      id,
    });
    return;
  }

  const key = normalizePlayerNameKey(name);
  const existingIndex = indexByName.get(key);

  if (existingIndex) {
    const user = usersByIndex.get(existingIndex);
    if (!user || user.password !== password) {
      sendJson(ws, {
        type: 'reg',
        data: { name, index: '', error: true, errorText: 'Invalid credentials' },
        id,
      });
      return;
    }
    if (user.ws && user.ws !== ws) {
      userIndexByWs.delete(user.ws);
    }
    user.ws = ws;
    userIndexByWs.set(ws, user.index);
    sendJson(ws, {
      type: 'reg',
      data: { name: user.name, index: user.index, error: false, errorText: '' },
      id,
    });
    return;
  }

  const index = createUserIndex();
  const user: User = { name, password, index, ws };
  usersByIndex.set(index, user);
  indexByName.set(key, index);
  userIndexByWs.set(ws, index);
  sendJson(ws, {
    type: 'reg',
    data: { name, index, error: false, errorText: '' },
    id,
  });
};
