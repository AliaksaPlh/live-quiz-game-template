import type { WebSocket } from 'ws';
import type { Game, Question, User } from './types.js';

export const usersByIndex = new Map<string, User>();
/** lowercase trimmed name -> user index */
export const indexByName = new Map<string, string>();
export const gamesById = new Map<string, Game>();
export const gameIdByCode = new Map<string, string>();
/** ws -> user index */
export const userIndexByWs = new Map<WebSocket, string>();
/** user index -> gameId (host or player while in a game) */
export const gameIdByUserIndex = new Map<string, string>();

let userIdSeq = 0;

export const createUserIndex = (): string => {
  userIdSeq += 1;
  return `u_${userIdSeq}_${Date.now().toString(36)}`;
};

export const normalizePlayerNameKey = (name: string): string => name.trim().toLowerCase();

export const normalizeRoomCode = (code: string): string => code.trim().toUpperCase();

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateRoomCode = (): string => {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return code;
};

export const generateUniqueRoomCode = (): string => {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const c = generateRoomCode();
    if (!gameIdByCode.has(c)) return c;
  }
  throw new Error('Could not generate a unique 6-character room code');
};

export const validateQuestionsPayload = (questions: unknown): questions is Question[] => {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  for (const q of questions) {
    if (typeof q !== 'object' || q === null) return false;
    const obj = q as Record<string, unknown>;
    if (typeof obj.text !== 'string' || !obj.text.trim()) return false;
    if (!Array.isArray(obj.options) || obj.options.length !== 4) return false;
    if (!obj.options.every((o) => typeof o === 'string' && o.trim())) return false;
    if (typeof obj.correctIndex !== 'number' || obj.correctIndex < 0 || obj.correctIndex > 3) {
      return false;
    }
    if (typeof obj.timeLimitSec !== 'number' || !Number.isFinite(obj.timeLimitSec) || obj.timeLimitSec <= 0) {
      return false;
    }
  }
  return true;
};
