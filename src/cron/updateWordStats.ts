import type { GameModel } from '../models/Game'
import type { WordModel } from '../models/Word'

type WordStats = {
  _id: number
  gamesWon: number
  gamesLost: number
  avgScore: number | null
}

async function updateStats(Game: GameModel, Word: WordModel) {
  const stats = await Game.aggregate<WordStats>([
    { $project: { gameNumber: 1, status: 1, numGuesses: { $size: '$guesses' } } },
    {
      $group: {
        _id: '$gameNumber',
        gamesWon: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
        gamesLost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        avgScore: { $avg: { $cond: [{ $eq: ['$status', 'Won'] }, '$numGuesses', null] } },
      },
    },
  ])

  for (const { _id: gameNumber, gamesWon, gamesLost, avgScore } of stats) {
    await Word.findOneAndUpdate(
      { gameNumber },
      { gamesWon, gamesLost, avgScore: avgScore || 0 },
      { new: true },
    )
    console.log(`Game ${gameNumber}: won=${gamesWon}, lost=${gamesLost}, avgScore=${avgScore}`)
  }

  console.log('Stats update complete')
}

export function initJob(gameModel: GameModel, wordModel: WordModel) {
  return () => updateStats(gameModel, wordModel)
}

export default { initJob }
