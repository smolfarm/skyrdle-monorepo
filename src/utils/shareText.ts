import type { ServerGuess } from '../atproto'
import { GameStatus } from './emojiGrid'

const EMOJI_MAP: Record<'correct' | 'present' | 'absent', string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
}

function renderEmojiRows(gameGuesses: ServerGuess[]) {
  return gameGuesses.map((guess) =>
    guess.evaluation.map((evalType) => EMOJI_MAP[evalType]).join('')
  ).join('\n')
}

export function buildSharedGameShareText(
  title: string,
  shareUrl: string,
  gameGuesses: ServerGuess[],
  gameStatus: GameStatus,
) {
  const safeTitle = title.trim() || 'Shared Game'
  const score = gameStatus === GameStatus.Won ? gameGuesses.length : 'X'
  const grid = renderEmojiRows(gameGuesses)

  return `Skyrdle Shared: ${safeTitle} ${score}/6\n\n${grid}\n\nPlay: ${shareUrl}`
}

export function buildInfiniteShareText(
  gameGuesses: ServerGuess[],
  gameStatus: GameStatus,
) {
  const score = gameStatus === GameStatus.Won ? gameGuesses.length : 'X'
  const grid = renderEmojiRows(gameGuesses)

  return `Skyrdle ∞ ${score}/6\n\n${grid}`
}
