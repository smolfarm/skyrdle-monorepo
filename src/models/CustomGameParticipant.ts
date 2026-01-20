/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Mongo model for custom game participant data.                                  
*/

import mongoose, { type Document, type Model } from 'mongoose'
import type { Guess } from './Game'

export interface CustomGameParticipantAttributes {
  customGameId: string      // Reference to CustomGame
  did: string               // Player's DID
  guesses: Guess[]
  status: 'Playing' | 'Won' | 'Lost'
  completedAt?: Date
}

export type CustomGameParticipantDocument = CustomGameParticipantAttributes & Document

const guessSchema = new mongoose.Schema<Guess>({
  letters: [String],
  evaluation: [String]
}, { _id: false })

const customGameParticipantSchema = new mongoose.Schema<CustomGameParticipantDocument>({
  customGameId: { type: String, required: true, index: true },
  did: { type: String, required: true, index: true },
  guesses: [guessSchema],
  status: { type: String, enum: ['Playing', 'Won', 'Lost'], default: 'Playing' },
  completedAt: { type: Date }
})

// Compound index for customGameId and did to ensure uniqueness per user per custom game
customGameParticipantSchema.index({ customGameId: 1, did: 1 }, { unique: true })

export default mongoose.model<CustomGameParticipantDocument>('CustomGameParticipant', customGameParticipantSchema)
export type CustomGameParticipantModel = Model<CustomGameParticipantDocument>
