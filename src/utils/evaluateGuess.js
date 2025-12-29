/**
 * Evaluate a guess against the target word using Wordle rules
 * Handles duplicate letters correctly with a two-pass algorithm
 *
 * @param {string} guess - The guessed word (will be converted to uppercase)
 * @param {string} targetWord - The target word (will be converted to uppercase)
 * @returns {Array<'correct'|'present'|'absent'>} Evaluation array
 */
function evaluateGuess(guess, targetWord) {
  const guessChars = guess.toUpperCase().split('')
  const targetChars = targetWord.toUpperCase().split('')
  const evals = Array(guessChars.length).fill(null)

  // First pass: mark correct positions
  for (let i = 0; i < guessChars.length; i++) {
    if (guessChars[i] === targetChars[i]) {
      evals[i] = 'correct'
      targetChars[i] = null // Mark as used
    }
  }

  // Second pass: mark present or absent
  for (let i = 0; i < guessChars.length; i++) {
    if (evals[i]) continue // Skip already marked as correct
    const idx = targetChars.indexOf(guessChars[i])
    if (idx !== -1) {
      evals[i] = 'present'
      targetChars[idx] = null // Mark as used
    } else {
      evals[i] = 'absent'
    }
  }

  return evals
}

module.exports = { evaluateGuess }
