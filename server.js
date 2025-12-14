const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()
const crypto = require('crypto')
const fs = require('fs')
let wordList = []
let validationWordList = new Set()
const path = require('path')

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
    redirect_uris: [`${origin}/`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope:
      'atproto repo:farm.smol.games.skyrdle.score?action=read&action=create&action=update repo:app.bsky.feed.post?action=create',
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

const { Word, Game, Player } = require('./src/models')

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

// Epoch at June 13th, 2025 midnight Eastern (UTC-5)
// This marks Game #1
const epochEastern = new Date('2025-06-13T00:00:00-05:00')
function getEasternDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

// Helper to get or init game for did
async function getGame(did) {
  const nowE = getEasternDate();
  const diff = Math.floor((nowE - epochEastern) / 86400000);
  const currentGameNumber = diff + 1;
  if (wordList.length === 0) throw new Error('Word list not loaded')
  const currentTargetWord = wordList[diff % wordList.length];

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
    const nowE = getEasternDate();
    const currentEpochDiff = Math.floor((nowE - epochEastern) / 86400000);
    const maxPossibleGameNumber = currentEpochDiff + 1;

    if (parsedGameNumber > maxPossibleGameNumber) {
      return res.status(400).json({ error: 'Cannot access future games' });
    }

    let game = await Game.findOne({ did, gameNumber: parsedGameNumber });

    if (!game) {
      // Game doesn't exist, create it if it's a valid past or current game number
      const targetWordForGame = wordList[(parsedGameNumber - 1) % wordList.length];
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
    const nowE = getEasternDate();
    const currentEpochDiff = Math.floor((nowE - epochEastern) / 86400000);
    const maxPossibleGameNumber = currentEpochDiff + 1;

    if (parsedGameNumber > maxPossibleGameNumber) {
      return res.status(400).json({ error: 'Cannot make guesses for future games' });
    }

    let game = await Game.findOne({ did, gameNumber: parsedGameNumber });

    if (!game) {
      // Game doesn't exist for this did and gameNumber, create it.
      const targetWordForGame = wordList[(parsedGameNumber - 1) % wordList.length]
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

    // Evaluate guess with duplicate handling
    const guessChars = guess.toUpperCase().split('')
    const targetChars = game.targetWord.toUpperCase().split('')
    const evals = Array(guessChars.length).fill(null)
    
    // First pass: correct positions
    for (let i = 0; i < guessChars.length; i++) {
      if (guessChars[i] === targetChars[i]) {
        evals[i] = 'correct'
        targetChars[i] = null
      }
    }
    // Second pass: present or absent
    for (let i = 0; i < guessChars.length; i++) {
      if (evals[i]) continue
      const idx = targetChars.indexOf(guessChars[i])
      if (idx !== -1) {
        evals[i] = 'present'
        targetChars[idx] = null
      } else {
        evals[i] = 'absent'
      }
    }

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

const api = require('./src/api')
api(app, Game, Word, Player)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// cron
const syncMongoToAtprotoService = require('./src/cron/syncMongoToAtproto')
const syncMongoToAtproto = syncMongoToAtprotoService.initSync(Game)
const updateWordStatsService = require('./src/cron/updateWordStats')
const updateWordStats = updateWordStatsService.initJob(Game, Word)
const updatePlayerStatsService = require('./src/cron/updatePlayerStats')
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
