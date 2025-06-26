const mongoose = require('mongoose')

const guessSchema = new mongoose.Schema({
  letters: [String],
  evaluation: [String]
}, { _id: false })

const gameSchema = new mongoose.Schema({
  did: { type: String, required: true, index: true },
  targetWord: { type: String, required: true },
  guesses: [guessSchema],
  status: { type: String, enum: ['Playing', 'Won', 'Lost'], default: 'Playing' },
  gameNumber: { type: Number, required: true, index: true },
  scoreHash: { type: String },
  syncedToAtproto: { type: Boolean, default: false },
  completedAt: { type: Date }
})

// Compound index for did and gameNumber to ensure uniqueness per user per game
gameSchema.index({ did: 1, gameNumber: 1 }, { unique: true })

module.exports = mongoose.model('Game', gameSchema)
