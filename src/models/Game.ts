/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Mongo model for game data.                                  
*/

import mongoose, { type Document, type Model } from 'mongoose'

export interface Guess {
  letters: string[]
  evaluation: string[]
}

export interface GameAttributes {
  did: string
  targetWord: string
  guesses: Guess[]
  status: 'Playing' | 'Won' | 'Lost'
  gameNumber: number
  scoreHash?: string
  syncedToAtproto?: boolean
  completedAt?: Date
}

export type GameDocument = GameAttributes & Document

const guessSchema = new mongoose.Schema<Guess>({
  letters: [String],
  evaluation: [String]
}, { _id: false })

const gameSchema = new mongoose.Schema<GameDocument>({
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

export default mongoose.model<GameDocument>('Game', gameSchema)
export type GameModel = Model<GameDocument>
