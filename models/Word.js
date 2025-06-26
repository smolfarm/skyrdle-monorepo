const mongoose = require('mongoose')

const wordSchema = new mongoose.Schema({
  gameNumber: { type: Number, required: true },
  word: { type: String, required: true },

  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
})

module.exports = mongoose.model('Word', wordSchema, 'words')
