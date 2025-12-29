// Epoch at June 13th, 2025 midnight Eastern (UTC-5)
// This marks Game #1
const epochEastern = new Date('2025-06-13T00:00:00-05:00')

/**
 * Get the current date in Eastern timezone
 * @returns {Date} Current date in Eastern timezone
 */
function getEasternDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

/**
 * Calculate the current game number based on the epoch
 * @param {Date} currentDate - The current date in Eastern timezone
 * @returns {number} The current game number (1-indexed)
 */
function calculateGameNumber(currentDate = getEasternDate()) {
  const diff = Math.floor((currentDate - epochEastern) / 86400000)
  return diff + 1
}

/**
 * Get the target word for a specific game number
 * @param {number} gameNumber - The game number (1-indexed)
 * @param {Array<string>} wordList - The list of words
 * @returns {string} The target word for this game number
 */
function getTargetWordForGameNumber(gameNumber, wordList) {
  if (wordList.length === 0) {
    throw new Error('Word list is empty')
  }
  // gameNumber is 1-indexed, so we subtract 1 for the array index
  return wordList[(gameNumber - 1) % wordList.length]
}

module.exports = {
  epochEastern,
  getEasternDate,
  calculateGameNumber,
  getTargetWordForGameNumber,
}
