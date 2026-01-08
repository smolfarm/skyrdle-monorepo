import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { evaluateGuess } from './src/utils/evaluateGuess'
import { calculateGameNumber, getTargetWordForGameNumber } from './src/utils/dateUtils'
import api from './src/api'
import { Word, Game, Player } from './src/models'
import syncMongoToAtprotoService from './src/cron/syncMongoToAtproto'
import updateWordStatsService from './src/cron/updateWordStats'
import updatePlayerStatsService from './src/cron/updatePlayerStats'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let wordList: string[] = []
let validationWordList = new Set<string>()

const app = express()
// Respect proxy headers (Render, etc.) so req.protocol reflects HTTPS
app.set('trust proxy', true)
app.use(cors())
app.use(express.json())

const explicitOrigin = process.env.PUBLIC_ORIGIN || process.env.APP_ORIGIN
function getPublicOrigin(req) {
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '')
  return `${req.protocol}://${req.get('host')}`
}

app.get('/.well-known/client-metadata.json', (req, res) => {
  const origin = getPublicOrigin(req)
  const clientId = `${origin}/.well-known/client-metadata.json`
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.json({
    client_id: clientId,
    client_name: 'Skyrdle',
    application_type: 'web',
    redirect_uris: [
      `${origin}/`,
      `${origin}`,
    ],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope:
      'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  })
})

app.get('/.well-known/client-metadata-native.json', (req, res) => {
  const origin = getPublicOrigin(req)
  const clientId = `${origin}/.well-known/client-metadata-native.json`
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.json({
    client_id: clientId,
    client_name: 'Skyrdle',
    application_type: 'native',
    redirect_uris: [
      'com.skyrdle:/callback',
    ],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope:
      'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  })
})

// Load validation word list from words.json
try {
  const wordsData = fs.readFileSync(path.join(__dirname, 'src', 'words.json'), 'utf8')
  const wordsFromFile = JSON.parse(wordsData).words
  validationWordList = new Set(wordsFromFile.map(w => w.toUpperCase()))
  console.log(`Loaded ${validationWordList.size} words for validation.`)
} catch (err) {
  console.error('Error loading validation word list from words.json:', err)
  process.exit(1) // Exit if the validation list can't be loaded.
}

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')))

const port = process.env.PORT || 4000

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected successfully')
    try {
      const docs = await Word.find({}).sort({ gameNumber: 1 })
      wordList = docs.map(d => d.word)
      console.log(`Loaded ${wordList.length} words`)
    } catch (err) {
      console.error('Error loading word list:', err)
    }
  })
  .catch(err => console.error('MongoDB connection error:', err))

// Helper to get or init game for did
async function getGame(did) {
  const currentGameNumber = calculateGameNumber();
  if (wordList.length === 0) throw new Error('Word list not loaded')
  const currentTargetWord = getTargetWordForGameNumber(currentGameNumber, wordList);

  // Find game for the current day for this DID
  let game = await Game.findOne({ did, gameNumber: currentGameNumber });

  if (!game) {
    // If no game exists for this DID for the current day, create a new one
    game = new Game({
      did,
      targetWord: currentTargetWord,
      guesses: [],
      status: 'Playing',
      gameNumber: currentGameNumber
    })
    await game.save()
  }
  // If a game exists for today, it's already up-to-date, or it's an old game (which this function doesn't handle)
  // The old logic for updating an existing game record to the current day is removed
  // because we now store each day's game as a separate document due to the compound index.
  return game
}

/**
 * GET current game state
 * @param {string} did - The user's DID
 */
app.get('/api/game', async (req, res) => {
  const { did } = req.query;
  if (!did) return res.status(400).json({ error: 'Missing did' });
  try {
    const game = await getGame(did);
    res.json({ guesses: game.guesses, status: game.status, gameNumber: game.gameNumber });
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({ error: 'Failed to fetch game state' });
  }
})

/**
 * GET specific past game state
 * @param {string} did - The user's DID
 * @param {number} gameNumber - The game number
 */
app.get('/api/game/:gameNumber', async (req, res) => {
  const { did } = req.query;
  const { gameNumber } = req.params;

  if (!did) return res.status(400).json({ error: 'Missing did' });
  if (!gameNumber) return res.status(400).json({ error: 'Missing gameNumber' });

  try {
    const parsedGameNumber = parseInt(gameNumber, 10);
    if (isNaN(parsedGameNumber) || parsedGameNumber <= 0) {
      return res.status(400).json({ error: 'Invalid gameNumber format or value' });
    }

    // Determine the maximum possible game number (current day's game number)
    const maxPossibleGameNumber = calculateGameNumber();

    if (parsedGameNumber > maxPossibleGameNumber) {
      return res.status(400).json({ error: 'Cannot access future games' });
    }

    let game = await Game.findOne({ did, gameNumber: parsedGameNumber });

    if (!game) {
      // Game doesn't exist, create it if it's a valid past or current game number
      const targetWordForGame = getTargetWordForGameNumber(parsedGameNumber, wordList);
      game = new Game({
        did,
        targetWord: targetWordForGame,
        guesses: [],
        status: 'Playing',
        gameNumber: parsedGameNumber
      });
      await game.save();
    }
    // Return the found or newly created game's details
    res.json({ guesses: game.guesses, status: game.status, gameNumber: game.gameNumber, targetWord: game.targetWord });
  } catch (error) {
    console.error('Error fetching or creating specific game state:', error);
    res.status(500).json({ error: 'Failed to fetch or create specific game state' });
  }
})

/**
 * POST a new guess
 * @param {string} did - The user's DID
 * @param {string} guess - The user's guess
 * @param {number} gameNumber - The game number
 */
app.post('/api/guess', async (req, res) => {
  const { did, guess, gameNumber } = req.body;
  if (!did || !guess || gameNumber === undefined) return res.status(400).json({ error: 'Missing did, guess, or gameNumber' });

    if (!validationWordList.has(guess.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid word' });
    }

  try {
    const parsedGameNumber = parseInt(gameNumber, 10);
    if (isNaN(parsedGameNumber) || parsedGameNumber <= 0) {
      return res.status(400).json({ error: 'Invalid gameNumber format or value' });
    }

    // Determine the maximum possible game number (current day's game number)
    const maxPossibleGameNumber = calculateGameNumber();

    if (parsedGameNumber > maxPossibleGameNumber) {
      return res.status(400).json({ error: 'Cannot make guesses for future games' });
    }

    let game = await Game.findOne({ did, gameNumber: parsedGameNumber });

    if (!game) {
      // Game doesn't exist for this did and gameNumber, create it.
      const targetWordForGame = getTargetWordForGameNumber(parsedGameNumber, wordList)
      game = new Game({
        did,
        targetWord: targetWordForGame,
        guesses: [],
        status: 'Playing',
        gameNumber: parsedGameNumber
      })

      // Game will be saved after guess processing
    }

    if (game.status !== 'Playing') return res.status(400).json({ error: 'Game is already over (Won or Lost)' });

    // Evaluate guess with duplicate handling using extracted utility
    const evals = evaluateGuess(guess, game.targetWord)

    game.guesses.push({ letters: guess.toUpperCase().split(''), evaluation: evals });

    if (evals.every(e => e === 'correct')) {
      game.status = 'Won'
      game.completedAt = new Date()
    } else if (game.guesses.length >= 6) {
      game.status = 'Lost'
      game.completedAt = new Date()
    }
    await game.save()

    if (game.status !== 'Playing') {
      const scoreVal = game.status === 'Won' ? game.guesses.length : -1
      const hash = crypto.createHash('sha256').update(`${did}|${parsedGameNumber}|${scoreVal}`).digest('hex')
      game.scoreHash = hash
      await game.save()
    }

    res.json({ guesses: game.guesses, status: game.status, gameNumber: game.gameNumber })
  } catch (error) {
    console.error('Error processing guess:', error)
    res.status(500).json({ error: 'Failed to process guess' })
  }
})

api(app, Game, Word, Player)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

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
