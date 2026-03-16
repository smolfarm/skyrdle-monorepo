import type { ServerGuess } from '../atproto'

export enum GameStatus {
  Playing,
  Won,
  Lost,
}

export const generateEmojiGrid = (gameNum: number | null, gameGuesses: ServerGuess[], gameStatus: GameStatus): string => {
  if (gameNum === null) return '';
  const title = `Skyrdle ${gameNum} ${gameStatus === GameStatus.Won ? gameGuesses.length : 'X'}/6\n\n`;
  const EMOJI_MAP: Record<'correct' | 'present' | 'absent', string> = {
    correct: '🟩',
    present: '🟨',
    absent: '⬛',
  }

  const grid = gameGuesses.map(guess =>
    guess.evaluation.map(evalType => EMOJI_MAP[evalType]).join('')
  ).join('\n')

  return title + grid
}
