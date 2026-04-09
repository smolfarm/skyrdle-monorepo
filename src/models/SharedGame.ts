import mongoose, { type Document, type Model } from 'mongoose'

export interface SharedGameAttributes {
  shareCode: string
  creatorDid: string
  targetWord: string
  title?: string
  createdAt: Date
}

export type SharedGameDocument = SharedGameAttributes & Document

const sharedGameSchema = new mongoose.Schema<SharedGameDocument>({
  shareCode: { type: String, required: true, unique: true, index: true },
  creatorDid: { type: String, required: true, index: true },
  targetWord: { type: String, required: true },
  title: { type: String },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model<SharedGameDocument>('SharedGame', sharedGameSchema)
export type SharedGameModel = Model<SharedGameDocument>
