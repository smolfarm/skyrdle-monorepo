import type { ServerGuess } from '../../src/atproto'

/**
 * Create a mock guess with specified letters and evaluation
 */
export function createMockGuess(
  letters: string[],
  evaluation: ('correct' | 'present' | 'absent')[]
): ServerGuess {
  if (letters.length !== evaluation.length) {
    throw new Error('Letters and evaluation arrays must have the same length')
  }

  return {
    letters,
    evaluation,
  }
}

/**
 * Create a server guess from just an evaluation array (fills letters with 'A')
 */
export function createServerGuess(
  evaluation: ('correct' | 'present' | 'absent')[]
): ServerGuess {
  return {
    letters: Array(evaluation.length).fill('A'),
    evaluation,
  }
}

/**
 * Create a mock game object for testing
 */
export function createMockGame(options: {
  did: string
  targetWord: string
  guesses?: ServerGuess[]
  status?: 'Playing' | 'Won' | 'Lost'
  gameNumber: number
  scoreHash?: string
  completedAt?: Date
}) {
  return {
    did: options.did,
    targetWord: options.targetWord,
    guesses: options.guesses || [],
    status: options.status || 'Playing',
    gameNumber: options.gameNumber,
    scoreHash: options.scoreHash,
    syncedToAtproto: false,
    completedAt: options.completedAt,
    save: async function() { return this },
  }
}
