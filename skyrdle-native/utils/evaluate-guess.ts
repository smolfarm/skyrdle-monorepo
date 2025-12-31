export type Evaluation = 'correct' | 'present' | 'absent'

/**
 * Evaluate a guess against the target word using Wordle rules
 * Handles duplicate letters correctly with a two-pass algorithm
 *
 * @param guess - The guessed word (will be converted to uppercase)
 * @param targetWord - The target word (will be converted to uppercase)
 * @returns Evaluation array for each letter position
 */
export function evaluateGuess(guess: string, targetWord: string): Evaluation[] {
  const guessChars = guess.toUpperCase().split('')
  const targetChars = targetWord.toUpperCase().split('')
  const evals: (Evaluation | null)[] = Array(guessChars.length).fill(null)

  // First pass: mark correct positions
  for (let i = 0; i < guessChars.length; i++) {
    if (guessChars[i] === targetChars[i]) {
      evals[i] = 'correct'
      targetChars[i] = '' // Mark as used
    }
  }

  // Second pass: mark present or absent
  for (let i = 0; i < guessChars.length; i++) {
    if (evals[i]) continue // Skip already marked as correct
    const idx = targetChars.indexOf(guessChars[i])
    if (idx !== -1) {
      evals[i] = 'present'
      targetChars[idx] = '' // Mark as used
    } else {
      evals[i] = 'absent'
    }
  }

  return evals as Evaluation[]
}
