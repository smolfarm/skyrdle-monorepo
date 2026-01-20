/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Mongo model for custom game data.                                  
*/

import mongoose, { type Document, type Model } from 'mongoose'

export interface CustomGameAttributes {
  customGameId: string      // nanoid "A1b2C3d4"
  creatorDid: string        // Creator's DID
  targetWord: string        // The 5-letter word
  createdAt: Date
}

export type CustomGameDocument = CustomGameAttributes & Document

const customGameSchema = new mongoose.Schema<CustomGameDocument>({
  customGameId: { type: String, required: true, unique: true, index: true },
  creatorDid: { type: String, required: true, index: true },
  targetWord: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model<CustomGameDocument>('CustomGame', customGameSchema)
export type CustomGameModel = Model<CustomGameDocument>
