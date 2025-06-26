/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Update stats for each word.                                     
*/

require('dotenv').config()
const mongoose = require('mongoose')
const [Word, Game] = require('../models')

async function updateStats(gameModel, wordModel) {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected for stats update');

  const stats = await Game.aggregate([
    { $project: { gameNumber: 1, status: 1, numGuesses: { $size: '$guesses' } } },
    { $group: {
        _id: '$gameNumber',
        gamesWon: { $sum: { $cond: [ { $eq: [ '$status', 'Won' ] }, 1, 0 ] } },
        gamesLost: { $sum: { $cond: [ { $eq: [ '$status', 'Lost' ] }, 1, 0 ] } },
        avgScore: { $avg: { $cond: [ { $eq: [ '$status', 'Won' ] }, '$numGuesses', null ] } }
      }
    }
  ])

  for (const { _id: gameNumber, gamesWon, gamesLost, avgScore } of stats) {
    await Word.findOneAndUpdate(
      { gameNumber },
      { gamesWon, gamesLost, avgScore: avgScore || 0 },
      { new: true }
    )
    console.log(`Game ${gameNumber}: won=${gamesWon}, lost=${gamesLost}, avgScore=${avgScore}`)
  }

  
  console.log('Stats update complete')
}

module.exports = {
    initJob: (gameModel, wordModel) => {
        return updateStats
    }
}

