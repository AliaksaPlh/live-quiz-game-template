import { BASE_POINTS } from './config.js';
import { deleteGame, clearGameTimer } from './gameLifecycle.js';
import { broadcastToGame } from './wsGameUtils.js';
import type { Game, Player } from './types.js';

export const buildScoreboard = (players: Player[]): Array<{ name: string; score: number; rank: number }> => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  let rank = 1;
  const scoreboard: Array<{ name: string; score: number; rank: number }> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i]!;
    if (i > 0 && p.score < sorted[i - 1]!.score) {
      rank = i + 1;
    }
    scoreboard.push({ name: p.name, score: p.score, rank });
  }
  return scoreboard;
};

export const allPlayersAnswered = (game: Game): boolean => {
  if (game.players.length === 0) return false;
  return game.players.every((p) => game.playerAnswers.has(p.index));
};

export const finalizeQuestion = (game: Game): void => {
  if (game.status !== 'in_progress') return;

  clearGameTimer(game);
  const q = game.questions[game.currentQuestion];
  if (!q || game.questionStartTime === undefined) return;

  const startMs = game.questionStartTime;
  const timeLimitSec = q.timeLimitSec;

  const playerResults: Array<{
    name: string;
    answered: boolean;
    correct: boolean;
    pointsEarned: number;
    totalScore: number;
  }> = [];

  for (const player of game.players) {
    const recorded = game.playerAnswers.get(player.index);
    if (!recorded) {
      playerResults.push({
        name: player.name,
        answered: false,
        correct: false,
        pointsEarned: 0,
        totalScore: player.score,
      });
      continue;
    }

    const elapsedSec = (recorded.timestamp - startMs) / 1000;
    const timeRemaining = Math.max(0, Math.min(timeLimitSec, timeLimitSec - elapsedSec));
    const isCorrect = recorded.answerIndex === q.correctIndex;
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = Math.round(BASE_POINTS * (timeRemaining / timeLimitSec));
      if (pointsEarned > BASE_POINTS) pointsEarned = BASE_POINTS;
      player.score += pointsEarned;
    }

    playerResults.push({
      name: player.name,
      answered: true,
      correct: isCorrect,
      pointsEarned,
      totalScore: player.score,
    });
  }

  broadcastToGame(game, {
    type: 'question_result',
    data: {
      questionIndex: game.currentQuestion,
      correctIndex: q.correctIndex,
      playerResults,
    },
    id: 0,
  });

  const isLast = game.currentQuestion >= game.questions.length - 1;
  if (isLast) {
    game.status = 'finished';
    broadcastToGame(game, {
      type: 'game_finished',
      data: { scoreboard: buildScoreboard(game.players) },
      id: 0,
    });
    deleteGame(game.id);
    return;
  }

  game.currentQuestion += 1;
  game.playerAnswers = new Map();
  sendCurrentQuestion(game);
};

export const sendCurrentQuestion = (game: Game): void => {
  const q = game.questions[game.currentQuestion];
  if (!q) return;

  game.questionStartTime = Date.now();
  clearGameTimer(game);
  game.questionTimer = setTimeout(() => {
    finalizeQuestion(game);
  }, q.timeLimitSec * 1000);

  broadcastToGame(game, {
    type: 'question',
    data: {
      questionNumber: game.currentQuestion + 1,
      totalQuestions: game.questions.length,
      text: q.text,
      options: q.options,
      timeLimitSec: q.timeLimitSec,
    },
    id: 0,
  });
};
