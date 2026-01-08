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

import mongoose, { type Document, type Model } from 'mongoose'

export interface PlayerAttributes {
  did: string
  handle?: string
  displayName?: string
  gamesWon: number
  gamesLost: number
  avgScore: number
  currentStreak: number
  maxStreak: number
  createdAt?: Date
  updatedAt?: Date
}

export type PlayerDocument = PlayerAttributes & Document

const playerSchema = new mongoose.Schema<PlayerDocument>({
  did: { type: String, required: true, index: true },
  handle: { type: String },
  displayName: { type: String },

  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model<PlayerDocument>('Player', playerSchema)
export type PlayerModel = Model<PlayerDocument>