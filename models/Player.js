/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Mongo model for player data.                                     
*/

const mongoose = require('mongoose')

const playerSchema = new mongoose.Schema({
  did: { type: String, required: true, index: true },
  handle: String,

  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

playerSchema.index({ did: 1 }, { unique: true })

module.exports = mongoose.model('Player', playerSchema)