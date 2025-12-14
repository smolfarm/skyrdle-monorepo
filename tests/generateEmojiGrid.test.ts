import { describe, it, expect } from 'vitest'
import { generateEmojiGrid, GameStatus } from '../src/App'
import type { ServerGuess as AtProtoServerGuess } from '../src/atproto'

const makeGuess = (evaluation: ('correct' | 'present' | 'absent')[]): AtProtoServerGuess => ({
  letters: Array(evaluation.length).fill('A'),
  evaluation,
})

describe('generateEmojiGrid', () => {
  it('returns empty string when game number is null', () => {
    const result = generateEmojiGrid(null, [], GameStatus.Playing)
    expect(result).toBe('')
  })

  it('renders a winning grid with correct guess count', () => {
    const guesses: AtProtoServerGuess[] = [
      makeGuess(['correct', 'present', 'absent', 'absent', 'present']),
      makeGuess(['correct', 'correct', 'correct', 'correct', 'correct']),
    ]

    const result = generateEmojiGrid(3, guesses, GameStatus.Won)

    expect(result).toBe([
      'Skyrdle 3 2/6',
      '',
      '🟩🟨⬛⬛🟨',
      '🟩🟩🟩🟩🟩',
    ].join('\n'))
  })

  it('renders a losing grid with X marker', () => {
    const guesses: AtProtoServerGuess[] = [
      makeGuess(['absent', 'absent', 'absent', 'absent', 'absent']),
      makeGuess(['present', 'present', 'present', 'present', 'present']),
    ]

    const result = generateEmojiGrid(5, guesses, GameStatus.Lost)

    expect(result).toBe([
      'Skyrdle 5 X/6',
      '',
      '⬛⬛⬛⬛⬛',
      '🟨🟨🟨🟨🟨',
    ].join('\n'))
  })
})
