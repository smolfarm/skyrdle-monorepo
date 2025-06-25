const mongoose = require('mongoose')

const wordSchema = new mongoose.Schema({
  gameNumber: { type: Number, required: true },
  word: { type: String, required: true }
})

module.exports = mongoose.model('Word', wordSchema, 'words')
