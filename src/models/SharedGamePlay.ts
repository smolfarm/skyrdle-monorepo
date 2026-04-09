import mongoose, { type Document, type Model } from 'mongoose'

export interface SharedGuess {
  letters: string[]
  evaluation: string[]
}

export interface SharedGamePlayAttributes {
  shareCode: string
  did: string
  guesses: SharedGuess[]
  status: 'Playing' | 'Won' | 'Lost'
  completedAt?: Date
}

export type SharedGamePlayDocument = SharedGamePlayAttributes & Document

const sharedGuessSchema = new mongoose.Schema<SharedGuess>({
  letters: [String],
  evaluation: [String],
}, { _id: false })

const sharedGamePlaySchema = new mongoose.Schema<SharedGamePlayDocument>({
  shareCode: { type: String, required: true, index: true },
  did: { type: String, required: true, index: true },
  guesses: [sharedGuessSchema],
  status: { type: String, enum: ['Playing', 'Won', 'Lost'], default: 'Playing' },
  completedAt: { type: Date },
})

sharedGamePlaySchema.index({ shareCode: 1, did: 1 }, { unique: true })

export default mongoose.model<SharedGamePlayDocument>('SharedGamePlay', sharedGamePlaySchema)
export type SharedGamePlayModel = Model<SharedGamePlayDocument>
