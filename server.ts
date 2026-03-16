import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createApp } from './src/server-app'
import { Word, Game, Player } from './src/models'
import syncMongoToAtprotoService from './src/cron/syncMongoToAtproto'
import updateWordStatsService from './src/cron/updateWordStats'
import updatePlayerStatsService from './src/cron/updatePlayerStats'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let wordList: string[] = []
let validationWordList = new Set<string>()

const explicitOrigin = process.env.PUBLIC_ORIGIN || process.env.APP_ORIGIN
function getPublicOrigin(req: import('express').Request) {
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '')
  return `${req.protocol}://${req.get('host')}`
}

// Load validation word list from words.json
try {
  const wordsData = fs.readFileSync(path.join(__dirname, 'src', 'words.json'), 'utf8')
  const wordsFromFile = JSON.parse(wordsData).words
  validationWordList = new Set(wordsFromFile.map((w: string) => w.toUpperCase()))
  console.log(`Loaded ${validationWordList.size} words for validation.`)
} catch (err) {
  console.error('Error loading validation word list from words.json:', err)
  process.exit(1)
}

const app = createApp({
  wordList,
  validationWordList,
  Game,
  Word,
  Player,
  getPublicOrigin,
  staticDir: path.join(__dirname, 'dist'),
})

const port = process.env.PORT || 4000

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI as string)
  .then(async () => {
    console.log('MongoDB connected successfully')
    try {
      const docs = await Word.find({}).sort({ gameNumber: 1 })
      wordList.length = 0
      wordList.push(...docs.map(d => d.word))
      console.log(`Loaded ${wordList.length} words`)
    } catch (err) {
      console.error('Error loading word list:', err)
    }
  })
  .catch(err => console.error('MongoDB connection error:', err))

// cron
const syncMongoToAtproto = syncMongoToAtprotoService.initSync(Game)
const updateWordStats = updateWordStatsService.initJob(Game, Word)
const updatePlayerStats = updatePlayerStatsService.initJob(Game, Player)

// Set up interval for periodic sync
const SYNC_INTERVAL_MS = syncMongoToAtprotoService.SYNC_INTERVAL_MS
setInterval(syncMongoToAtproto, SYNC_INTERVAL_MS)
setInterval(updateWordStats, SYNC_INTERVAL_MS)
setInterval(updatePlayerStats, SYNC_INTERVAL_MS)

// Run initial sync after server starts
app.listen(port, () => {
  console.log(`Skyrdle API listening on http://localhost:${port}`)

  setTimeout(() => {
    console.log('Running initial MongoDB to AT Protocol sync...')
    syncMongoToAtproto()
    console.log('Running initial word stats update...')
    updateWordStats()
    console.log('Running initial player stats update...')
    updatePlayerStats()
  }, 2000)
})
