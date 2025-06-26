/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Update stats for each player.                                     
*/

require('dotenv').config()
const mongoose = require('mongoose')
const { Game, Player } = require('../models')

async function updateStats() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected for player stats update')

  const dids = await Game.distinct('did')

  for (const did of dids) {
    const games = await Game.find({ did }).sort({ gameNumber: 1 })
    let gamesWon = 0
    let gamesLost = 0
    let totalGuesses = 0
    let winCount = 0
    let currentStreak = 0
    let currentStreakBroken = false
    let streak = 0
    let maxStreak = 0

    for (const game of games) {
      if (game.status === 'Won') {
        gamesWon++
        winCount++
        totalGuesses += game.guesses.length
        streak++
        maxStreak = Math.max(maxStreak, streak)

        if (!currentStreakBroken) currentStreak++
      } else if (game.status === 'Lost') {
        gamesLost++
        streak = 0
        currentStreakBroken = true
      }
    }

    const avgScore = winCount > 0 ? totalGuesses / winCount : 0

    await Player.findOneAndUpdate(
      { did },
      { gamesWon, gamesLost, avgScore, currentStreak, maxStreak },
      { upsert: true, new: true }
    )

    console.log(`Player ${did}: won=${gamesWon}, lost=${gamesLost}, avgScore=${avgScore}, currentStreak=${currentStreak}, maxStreak=${maxStreak}`)
  }

  console.log('Player stats update complete')
}

module.exports = {
  initJob: (gameModel, playerModel) => {
    return updateStats;
  }
}
