import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createApp } from './src/server-app'
import { Word, Game, Player, SharedGame, SharedGamePlay } from './src/models'
import syncMongoToAtprotoService from './src/cron/syncMongoToAtproto'
import updateWordStatsService from './src/cron/updateWordStats'
import updatePlayerStatsService from './src/cron/updatePlayerStats'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let wordList: string[] = []
let validationWordList = new Set<string>()
let ready = false

const explicitOrigin = process.env.PUBLIC_ORIGIN || process.env.APP_ORIGIN
function getPublicOrigin(req: import('express').Request) {
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '')
  return `${req.protocol}://${req.get('host')}`
}

function loadValidationWordList() {
  const wordsData = fs.readFileSync(path.join(__dirname, 'src', 'words.json'), 'utf8')
  const wordsFromFile = JSON.parse(wordsData).words
  if (!Array.isArray(wordsFromFile) || wordsFromFile.length === 0) {
    throw new Error('words.json does not contain a non-empty words array')
  }

  validationWordList = new Set(wordsFromFile.map((w: string) => w.toUpperCase()))
  console.log(`Loaded ${validationWordList.size} words for validation.`)
}

async function loadScheduledWordList() {
  const docs = await Word.find({}).sort({ gameNumber: 1 })
  const words = docs.map(d => d.word)
  if (words.length === 0) {
    throw new Error('No scheduled words found in MongoDB')
  }

  wordList.length = 0
  wordList.push(...words)
  console.log(`Loaded ${wordList.length} scheduled words`)
}

async function start() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required')
  }

  loadValidationWordList()
  await mongoose.connect(mongoUri)
  console.log('MongoDB connected successfully')
  await loadScheduledWordList()

  const app = createApp({
    wordList,
    validationWordList,
    Game,
    Word,
    Player,
    SharedGame,
    SharedGamePlay,
    getPublicOrigin,
    staticDir: path.join(__dirname, 'dist'),
    isReady: () => ready && mongoose.connection.readyState === 1 && wordList.length > 0,
  })

  const syncMongoToAtproto = syncMongoToAtprotoService.initSync(Game)
  const updateWordStats = updateWordStatsService.initJob(Game, Word)
  const updatePlayerStats = updatePlayerStatsService.initJob(Game, Player)
  const syncIntervalMs = syncMongoToAtprotoService.SYNC_INTERVAL_MS

  setInterval(syncMongoToAtproto, syncIntervalMs)
  setInterval(updateWordStats, syncIntervalMs)
  setInterval(updatePlayerStats, syncIntervalMs)

  const port = process.env.PORT || 4000
  app.listen(port, () => {
    ready = true
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
}

start().catch(err => {
  console.error('Failed to start Skyrdle API:', err)
  process.exit(1)
})
