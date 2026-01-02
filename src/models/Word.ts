/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Mongo model for word data.                                     
*/

import mongoose, { type Document, type Model } from 'mongoose'

export interface WordAttributes {
  gameNumber: number
  word: string
  gamesWon: number
  gamesLost: number
  avgScore: number
}

export type WordDocument = WordAttributes & Document

const wordSchema = new mongoose.Schema<WordDocument>({
  gameNumber: { type: Number, required: true },
  word: { type: String, required: true },

  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
})

wordSchema.index({ gameNumber: 1 }, { unique: true })

export default mongoose.model<WordDocument>('Word', wordSchema, 'words')
export type WordModel = Model<WordDocument>
