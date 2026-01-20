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
import { Word, Game, Player, CustomGame, CustomGameParticipant } from './src/models'
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

// ============================================
// Custom Game Endpoints
// ============================================

// Generate a short random ID (8 chars, alphanumeric)
function generateCustomGameId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomBytes = crypto.randomBytes(8)
  for (let i = 0; i < 8; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  return result
}

/**
 * GET validate if a word is valid for custom game creation
 * @param {string} word - The word to validate
 */
app.get('/api/validate-word', (req, res) => {
  const { word } = req.query
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Missing word parameter' })
  }
  const upperWord = word.toUpperCase()
  if (upperWord.length !== 5) {
    return res.json({ valid: false, reason: 'Word must be exactly 5 letters' })
  }
  const isValid = validationWordList.has(upperWord)
  res.json({ valid: isValid, reason: isValid ? null : 'Word not in valid word list' })
})

/**
 * POST create a new custom game
 * @param {string} did - Creator's DID
 * @param {string} word - The target word
 */
app.post('/api/custom-game', async (req, res) => {
  const { did, word } = req.body
  if (!did || !word) {
    return res.status(400).json({ error: 'Missing did or word' })
  }

  const upperWord = word.toUpperCase()
  if (upperWord.length !== 5) {
    return res.status(400).json({ error: 'Word must be exactly 5 letters' })
  }
  if (!validationWordList.has(upperWord)) {
    return res.status(400).json({ error: 'Word not in valid word list' })
  }

  try {
    // Generate unique ID (retry on collision)
    let customGameId: string
    let attempts = 0
    do {
      customGameId = generateCustomGameId()
      const existing = await CustomGame.findOne({ customGameId })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique game ID' })
    }

    const customGame = new CustomGame({
      customGameId,
      creatorDid: did,
      targetWord: upperWord,
      createdAt: new Date()
    })
    await customGame.save()

    const origin = getPublicOrigin(req)
    const shareUrl = `${origin}/c/${customGameId}`

    res.json({ customGameId, shareUrl })
  } catch (error) {
    console.error('Error creating custom game:', error)
    res.status(500).json({ error: 'Failed to create custom game' })
  }
})

/**
 * GET custom game state for a participant
 * @param {string} id - Custom game ID
 * @param {string} did - Player's DID
 */
app.get('/api/custom-game/:id', async (req, res) => {
  const { id } = req.params
  const { did } = req.query

  if (!did) {
    return res.status(400).json({ error: 'Missing did' })
  }

  try {
    const customGame = await CustomGame.findOne({ customGameId: id })
    if (!customGame) {
      return res.status(404).json({ error: 'Custom game not found' })
    }

    // Get or create participant record
    let participant = await CustomGameParticipant.findOne({ customGameId: id, did })
    if (!participant) {
      participant = new CustomGameParticipant({
        customGameId: id,
        did,
        guesses: [],
        status: 'Playing'
      })
      await participant.save()
    }

    res.json({
      customGameId: id,
      creatorDid: customGame.creatorDid,
      guesses: participant.guesses,
      status: participant.status,
      // Only include target word if game is over (so they can see the answer)
      targetWord: participant.status !== 'Playing' ? customGame.targetWord : undefined
    })
  } catch (error) {
    console.error('Error fetching custom game:', error)
    res.status(500).json({ error: 'Failed to fetch custom game' })
  }
})

/**
 * POST submit a guess for a custom game
 * @param {string} id - Custom game ID
 * @param {string} did - Player's DID
 * @param {string} guess - The guess
 */
app.post('/api/custom-game/:id/guess', async (req, res) => {
  const { id } = req.params
  const { did, guess } = req.body

  if (!did || !guess) {
    return res.status(400).json({ error: 'Missing did or guess' })
  }

  const upperGuess = guess.toUpperCase()
  if (!validationWordList.has(upperGuess)) {
    return res.status(400).json({ error: 'Invalid word' })
  }

  try {
    const customGame = await CustomGame.findOne({ customGameId: id })
    if (!customGame) {
      return res.status(404).json({ error: 'Custom game not found' })
    }

    // Get or create participant record
    let participant = await CustomGameParticipant.findOne({ customGameId: id, did })
    if (!participant) {
      participant = new CustomGameParticipant({
        customGameId: id,
        did,
        guesses: [],
        status: 'Playing'
      })
    }

    if (participant.status !== 'Playing') {
      return res.status(400).json({ error: 'Game is already over' })
    }

    // Evaluate guess
    const evals = evaluateGuess(upperGuess, customGame.targetWord)
    participant.guesses.push({ letters: upperGuess.split(''), evaluation: evals })

    if (evals.every(e => e === 'correct')) {
      participant.status = 'Won'
      participant.completedAt = new Date()
    } else if (participant.guesses.length >= 6) {
      participant.status = 'Lost'
      participant.completedAt = new Date()
    }

    await participant.save()

    res.json({
      customGameId: id,
      guesses: participant.guesses,
      status: participant.status,
      targetWord: participant.status !== 'Playing' ? customGame.targetWord : undefined
    })
  } catch (error) {
    console.error('Error processing custom game guess:', error)
    res.status(500).json({ error: 'Failed to process guess' })
  }
})

/**
 * GET web redirect for custom game deep link
 * Redirects to app scheme, with fallback for browsers
 */
app.get('/c/:id', async (req, res) => {
  const { id } = req.params
  
  // Check if game exists
  const customGame = await CustomGame.findOne({ customGameId: id })
  if (!customGame) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Game Not Found - Skyrdle</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>Game Not Found</h1>
          <p>This custom Skyrdle game doesn't exist or has been removed.</p>
          <a href="/">Play daily Skyrdle instead</a>
        </body>
      </html>
    `)
  }

  // Send HTML that attempts app deep link with web fallback
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Custom Skyrdle Game</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; text-align: center; padding: 50px; }
          .button { display: inline-block; padding: 12px 24px; background: #538d4e; color: white; text-decoration: none; border-radius: 8px; margin: 10px; }
        </style>
      </head>
      <body>
        <h1>Custom Skyrdle Game</h1>
        <p>Opening in the Skyrdle app...</p>
        <p><a class="button" href="com.skyrdle://c/${id}">Open in App</a></p>
        <p style="margin-top: 30px; color: #666;">Don't have the app? <a href="/">Play on web</a></p>
        <script>
          // Attempt to open app automatically
          window.location.href = 'com.skyrdle://c/${id}';
        </script>
      </body>
    </html>
  `)
})

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
