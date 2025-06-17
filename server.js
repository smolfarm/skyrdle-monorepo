const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()
const crypto = require('crypto')
let wordList = []
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')))

const port = process.env.PORT || 4000

const wordSchema = new mongoose.Schema({ 
  gameNumber: { type: Number, required: true },
  word: { type: String, required: true } 
})
const Word = mongoose.model('Word', wordSchema, 'words')

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

// Mongoose Schema for Game State
const guessSchema = new mongoose.Schema({
  letters: [String],
  evaluation: [String]
}, { _id: false })

const gameSchema = new mongoose.Schema({
  did: { type: String, required: true, index: true },
  targetWord: { type: String, required: true },
  guesses: [guessSchema],
  status: { type: String, enum: ['Playing', 'Won', 'Lost'], default: 'Playing' },
  gameNumber: { type: Number, required: true, index: true },
  scoreHash: { type: String },
  syncedToAtproto: { type: Boolean, default: false }
})

// Compound index for did and gameNumber to ensure uniqueness per user per game
gameSchema.index({ did: 1, gameNumber: 1 }, { unique: true })

const Game = mongoose.model('Game', gameSchema)


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
    });
    await game.save();
  }
  // If a game exists for today, it's already up-to-date, or it's an old game (which this function doesn't handle)
  // The old logic for updating an existing game record to the current day is removed
  // because we now store each day's game as a separate document due to the compound index.
  return game;
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
});

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
});

/**
 * POST a new guess
 * @param {string} did - The user's DID
 * @param {string} guess - The user's guess
 * @param {number} gameNumber - The game number
 */
app.post('/api/guess', async (req, res) => {
  const { did, guess, gameNumber } = req.body;
  if (!did || !guess || gameNumber === undefined) return res.status(400).json({ error: 'Missing did, guess, or gameNumber' });

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
      // This is allowed as per memory f24ef6cf-c98d-4359-86d5-a9ab7ceb03fa (for GET) and user request for playability.
      const targetWordForGame = wordList[(parsedGameNumber - 1) % wordList.length];
      game = new Game({
        did,
        targetWord: targetWordForGame,
        guesses: [],
        status: 'Playing',
        gameNumber: parsedGameNumber
      });
      // Game will be saved after guess processing
    }

    if (game.status !== 'Playing') return res.status(400).json({ error: 'Game is already over (Won or Lost)' });

    // Evaluate guess with duplicate handling
    const guessChars = guess.toUpperCase().split('');
    const targetChars = game.targetWord.toUpperCase().split('');
    const evals = Array(guessChars.length).fill(null);
    // First pass: correct positions
    for (let i = 0; i < guessChars.length; i++) {
      if (guessChars[i] === targetChars[i]) {
        evals[i] = 'correct';
        targetChars[i] = null;
      }
    }
    // Second pass: present or absent
    for (let i = 0; i < guessChars.length; i++) {
      if (evals[i]) continue;
      const idx = targetChars.indexOf(guessChars[i]);
      if (idx !== -1) {
        evals[i] = 'present';
        targetChars[idx] = null;
      } else {
        evals[i] = 'absent';
      }
    }

    game.guesses.push({ letters: guess.toUpperCase().split(''), evaluation: evals });

    // Update status
    if (evals.every(e => e === 'correct')) game.status = 'Won';
    else if (game.guesses.length >= 6) game.status = 'Lost';

    await game.save();

    if (game.status !== 'Playing') {
      const scoreVal = game.status === 'Won' ? game.guesses.length : -1;
      const hash = crypto.createHash('sha256').update(`${did}|${parsedGameNumber}|${scoreVal}`).digest('hex');
      game.scoreHash = hash;
      await game.save();
    }

    res.json({ guesses: game.guesses, status: game.status, gameNumber: game.gameNumber });
  } catch (error) {
    console.error('Error processing guess:', error);
    res.status(500).json({ error: 'Failed to process guess' });
  }
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// Initialize the AT Protocol sync service
const syncService = require('./cron/syncMongoToAtproto')
const syncMongoToAtproto = syncService.initSync(Game)

// Set up interval for periodic sync
const SYNC_INTERVAL_MS = syncService.SYNC_INTERVAL_MS
setInterval(syncMongoToAtproto, SYNC_INTERVAL_MS)

// Run initial sync after server starts
app.listen(port, () => {
  console.log(`Skyrdle API listening on http://localhost:${port}`)
  
  // Run initial sync after a short delay to ensure MongoDB connection is established
  setTimeout(() => {
    console.log('Running initial MongoDB to AT Protocol sync...')
    syncMongoToAtproto()
  }, 5000)
})
