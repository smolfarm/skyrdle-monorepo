// Epoch at June 13th, 2025 midnight Eastern (UTC-5)
// This marks Game #1
export const epochEastern = new Date('2025-06-13T00:00:00-05:00')

/**
 * Get the current date in Eastern timezone
 * @returns Current date in Eastern timezone
 */
export function getEasternDate(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  )
}

/**
 * Calculate the current game number based on the epoch
 * @param currentDate - The current date in Eastern timezone
 * @returns The current game number (1-indexed)
 */
export function calculateGameNumber(currentDate: Date = getEasternDate()): number {
  const diff = Math.floor(
    (currentDate.getTime() - epochEastern.getTime()) / 86400000
  )
  return diff + 1
}

/**
 * Get the target word for a specific game number
 * @param gameNumber - The game number (1-indexed)
 * @param wordList - The list of words
 * @returns The target word for this game number
 */
export function getTargetWordForGameNumber(
  gameNumber: number,
  wordList: string[]
): string {
  if (wordList.length === 0) {
    throw new Error('Word list is empty')
  }
  // gameNumber is 1-indexed, so we subtract 1 for the array index
  return wordList[(gameNumber - 1) % wordList.length]
}
