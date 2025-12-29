import type { ServerGuess } from '../atproto'

/**
 * Calculate keyboard key statuses with priority: correct > present > default > absent
 *
 * This function processes all guesses to determine the color/status of each letter
 * on the keyboard. Letters can be:
 * - correct: Letter is in the word and in the correct position
 * - present: Letter is in the word but in the wrong position
 * - absent: Letter is not in the word at all
 * - null: Letter has not been guessed yet
 *
 * Priority rules ensure that once a letter is marked as correct, it stays correct
 * even if later guesses show it as present or absent in other positions.
 *
 * @param guesses - Array of server guesses containing letters and evaluations
 * @returns Record mapping each letter to its status
 */
export function calculateKeyboardStatus(
  guesses: ServerGuess[]
): Record<string, 'correct' | 'present' | 'absent' | null> {
  const keyboardStatus: Record<string, 'correct' | 'present' | 'absent' | null> = {}

  // Process all guesses to determine the status of each letter
  guesses.forEach(({ letters, evaluation }) => {
    letters.forEach((letter, i) => {
      const currentStatus = keyboardStatus[letter]
      const newStatus = evaluation[i]

      // Apply priority rules: correct > present > default > absent
      if (newStatus === 'correct') {
        // Correct always takes priority
        keyboardStatus[letter] = 'correct'
      } else if (newStatus === 'present' && currentStatus !== 'correct') {
        // Present takes priority unless the letter is already marked correct
        keyboardStatus[letter] = 'present'
      } else if (newStatus === 'absent' && currentStatus !== 'correct' && currentStatus !== 'present') {
        // Absent only applies if the letter isn't already marked correct or present
        keyboardStatus[letter] = 'absent'
      }
    })
  })

  return keyboardStatus
}
