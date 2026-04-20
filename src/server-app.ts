import express from 'express'
import path from 'path'
import cors from 'cors'
import crypto from 'crypto'
import { evaluateGuess } from './utils/evaluateGuess'
import { calculateGameNumber, getTargetWordForGameNumber } from './utils/dateUtils'
import api from './api'
import type { Model } from 'mongoose'
import type { GameDocument } from './models/Game'
import type { WordDocument } from './models/Word'
import type { PlayerDocument } from './models/Player'
import type { SharedGameDocument } from './models/SharedGame'
import type { SharedGamePlayDocument } from './models/SharedGamePlay'

interface AppDependencies {
  wordList: string[]
  validationWordList: Set<string>
  Game: Model<GameDocument>
  Word: Model<WordDocument>
  Player: Model<PlayerDocument>
  SharedGame: Model<SharedGameDocument>
  SharedGamePlay: Model<SharedGamePlayDocument>
  getPublicOrigin: (req: express.Request) => string
  staticDir?: string
}

export function createApp(deps: AppDependencies) {
  const {
    wordList,
    validationWordList,
    Game,
    Word,
    Player,
    SharedGame,
    SharedGamePlay,
    getPublicOrigin,
    staticDir,
  } = deps

  const app = express()
  app.set('trust proxy', true)
  app.use(cors())
  app.use(express.json())

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

  // Static files registered after client-metadata, before API routes (matches original order)
  if (staticDir) {
    app.use(express.static(staticDir))
  }

  async function getGame(did: string) {
    const currentGameNumber = calculateGameNumber()
    if (wordList.length === 0) throw new Error('Word list not loaded')
    const currentTargetWord = getTargetWordForGameNumber(currentGameNumber, wordList)

    let game = await Game.findOne({ did, gameNumber: currentGameNumber })

    if (!game) {
      game = new Game({
        did,
        targetWord: currentTargetWord,
        guesses: [],
        status: 'Playing',
        gameNumber: currentGameNumber
      })
      await game.save()
    }
    return game
  }

  function normalizeGuessWord(value: unknown) {
    return String(value || '').trim().toUpperCase()
  }

  function normalizeSharedGameTitle(value: unknown) {
    const title = String(value || '').trim()
    return title.slice(0, 80)
  }

  function normalizeSharedGameCode(value: unknown) {
    return String(value || '').trim().toLowerCase()
  }

  function buildSharedGameResponse(req: express.Request, sharedGame: SharedGameDocument) {
    return {
      shareCode: sharedGame.shareCode,
      title: sharedGame.title || '',
      creatorDid: sharedGame.creatorDid,
      shareUrl: `${getPublicOrigin(req)}/shared/${sharedGame.shareCode}`,
    }
  }

  async function generateShareCode() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const shareCode = crypto.randomBytes(5).toString('hex')
      const existing = await SharedGame.findOne({ shareCode })
      if (!existing) return shareCode
    }
    throw new Error('Failed to generate a unique share code')
  }

  async function getOrCreateSharedGamePlay(did: string, shareCode: string) {
    let play = await SharedGamePlay.findOne({ did, shareCode })

    if (!play) {
      play = new SharedGamePlay({
        did,
        shareCode,
        guesses: [],
        status: 'Playing',
      })
      await play.save()
    }

    return play
  }

  app.get('/api/game', async (req, res) => {
    const { did } = req.query
    if (!did) return res.status(400).json({ error: 'Missing did' })
    try {
      const game = await getGame(did as string)
      res.json({ guesses: game.guesses, status: game.status, gameNumber: game.gameNumber })
    } catch (error) {
      console.error('Error fetching game state:', error)
      res.status(500).json({ error: 'Failed to fetch game state' })
    }
  })

  app.get('/api/game/:gameNumber', async (req, res) => {
    const { did } = req.query
    const { gameNumber } = req.params

    if (!did) return res.status(400).json({ error: 'Missing did' })
    if (!gameNumber) return res.status(400).json({ error: 'Missing gameNumber' })

    try {
      const parsedGameNumber = parseInt(gameNumber, 10)
      if (isNaN(parsedGameNumber) || parsedGameNumber <= 0) {
        return res.status(400).json({ error: 'Invalid gameNumber format or value' })
      }

      const maxPossibleGameNumber = calculateGameNumber()

      if (parsedGameNumber > maxPossibleGameNumber) {
        return res.status(400).json({ error: 'Cannot access future games' })
      }

      let game = await Game.findOne({ did, gameNumber: parsedGameNumber })

      if (!game) {
        const targetWordForGame = getTargetWordForGameNumber(parsedGameNumber, wordList)
        game = new Game({
          did,
          targetWord: targetWordForGame,
          guesses: [],
          status: 'Playing',
          gameNumber: parsedGameNumber
        })
        await game.save()
      }
      res.json({ guesses: game.guesses, status: game.status, gameNumber: game.gameNumber, targetWord: game.targetWord })
    } catch (error) {
      console.error('Error fetching or creating specific game state:', error)
      res.status(500).json({ error: 'Failed to fetch or create specific game state' })
    }
  })

  app.post('/api/guess', async (req, res) => {
    const { did, guess, gameNumber } = req.body
    if (!did || !guess || gameNumber === undefined) return res.status(400).json({ error: 'Missing did, guess, or gameNumber' })

    if (!validationWordList.has(guess.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid word' })
    }

    try {
      const parsedGameNumber = parseInt(gameNumber, 10)
      if (isNaN(parsedGameNumber) || parsedGameNumber <= 0) {
        return res.status(400).json({ error: 'Invalid gameNumber format or value' })
      }

      const maxPossibleGameNumber = calculateGameNumber()

      if (parsedGameNumber > maxPossibleGameNumber) {
        return res.status(400).json({ error: 'Cannot make guesses for future games' })
      }

      let game = await Game.findOne({ did, gameNumber: parsedGameNumber })

      if (!game) {
        const targetWordForGame = getTargetWordForGameNumber(parsedGameNumber, wordList)
        game = new Game({
          did,
          targetWord: targetWordForGame,
          guesses: [],
          status: 'Playing',
          gameNumber: parsedGameNumber
        })
      }

      if (game.status !== 'Playing') return res.status(400).json({ error: 'Game is already over (Won or Lost)' })

      const evals = evaluateGuess(guess, game.targetWord)

      game.guesses.push({ letters: guess.toUpperCase().split(''), evaluation: evals })

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

  // --- Infinite mode (in-memory, ephemeral) ---

  type InfiniteGameState = {
    targetWord: string
    guesses: { letters: string[]; evaluation: string[] }[]
    status: 'Playing' | 'Won' | 'Lost'
    createdAt: number
  }

  const infiniteGames = new Map<string, InfiniteGameState>()

  // Clean up old infinite games every hour
  setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [key, game] of infiniteGames) {
      if (game.createdAt < cutoff) infiniteGames.delete(key)
    }
  }, 60 * 60 * 1000)

  const validationWordsArray = Array.from(validationWordList)

  app.get('/api/infinite/current', (req, res) => {
    const did = typeof req.query.did === 'string' ? req.query.did : null
    if (!did) return res.status(400).json({ error: 'Missing did' })

    const game = infiniteGames.get(did)
    if (!game) return res.status(404).json({ error: 'No active infinite game' })

    const response: Record<string, unknown> = {
      guesses: game.guesses,
      status: game.status,
    }
    if (game.status !== 'Playing') {
      response.targetWord = game.targetWord
    }
    res.json(response)
  })

  app.post('/api/infinite/start', (req, res) => {
    const { did } = req.body
    if (!did) return res.status(400).json({ error: 'Missing did' })

    const targetWord = validationWordsArray[Math.floor(Math.random() * validationWordsArray.length)]

    infiniteGames.set(String(did), {
      targetWord,
      guesses: [],
      status: 'Playing',
      createdAt: Date.now(),
    })

    res.json({ status: 'Playing', guesses: [] })
  })

  app.post('/api/infinite/guess', (req, res) => {
    const { did, guess } = req.body
    if (!did || !guess) return res.status(400).json({ error: 'Missing did or guess' })

    const normalizedGuess = normalizeGuessWord(guess)
    if (!validationWordList.has(normalizedGuess)) {
      return res.status(400).json({ error: 'Invalid word' })
    }

    const game = infiniteGames.get(String(did))
    if (!game) return res.status(404).json({ error: 'No active infinite game' })
    if (game.status !== 'Playing') return res.status(400).json({ error: 'Game is already over' })

    const evals = evaluateGuess(normalizedGuess, game.targetWord)
    game.guesses.push({ letters: normalizedGuess.split(''), evaluation: evals })

    if (evals.every(e => e === 'correct')) {
      game.status = 'Won'
    } else if (game.guesses.length >= 6) {
      game.status = 'Lost'
    }

    const response: Record<string, unknown> = {
      guesses: game.guesses,
      status: game.status,
    }
    if (game.status !== 'Playing') {
      response.targetWord = game.targetWord
    }

    res.json(response)
  })

  // --- Shared games ---

  app.post('/api/shared-games', async (req, res) => {
    const { did, targetWord, title } = req.body

    if (!did || !targetWord) {
      return res.status(400).json({ error: 'Missing did or targetWord' })
    }

    const normalizedWord = normalizeGuessWord(targetWord)
    if (normalizedWord.length !== 5 || !validationWordList.has(normalizedWord)) {
      return res.status(400).json({ error: 'Invalid word' })
    }

    try {
      const shareCode = await generateShareCode()
      const createdGame = new SharedGame({
        shareCode,
        creatorDid: String(did),
        targetWord: normalizedWord,
        title: normalizeSharedGameTitle(title),
      })
      await createdGame.save()

      res.status(201).json({
        ...buildSharedGameResponse(req, createdGame),
        targetWord: normalizedWord,
      })
    } catch (error) {
      console.error('Error creating shared game:', error)
      res.status(500).json({ error: 'Failed to create shared game' })
    }
  })

  app.get('/api/my-shared-games', async (req, res) => {
    const did = typeof req.query.did === 'string' ? req.query.did : null
    if (!did) return res.status(400).json({ error: 'Missing did' })

    try {
      const games = await SharedGame.find({ creatorDid: did }).sort({ createdAt: -1 })
      res.json(
        games.map((g) => ({
          ...buildSharedGameResponse(req, g),
          createdAt: g.createdAt,
        })),
      )
    } catch (error) {
      console.error('Error fetching user shared games:', error)
      res.status(500).json({ error: 'Failed to fetch shared games' })
    }
  })

  app.patch('/api/shared-games/:shareCode', async (req, res) => {
    const shareCode = normalizeSharedGameCode(req.params.shareCode)
    const { did, title } = req.body

    if (!did) return res.status(400).json({ error: 'Missing did' })
    if (typeof title !== 'string') return res.status(400).json({ error: 'Missing title' })

    try {
      const sharedGame = await SharedGame.findOne({ shareCode })
      if (!sharedGame) return res.status(404).json({ error: 'Shared game not found' })
      if (sharedGame.creatorDid !== String(did)) return res.status(403).json({ error: 'Not the creator of this game' })

      sharedGame.title = normalizeSharedGameTitle(title)
      await sharedGame.save()

      res.json(buildSharedGameResponse(req, sharedGame))
    } catch (error) {
      console.error('Error renaming shared game:', error)
      res.status(500).json({ error: 'Failed to rename shared game' })
    }
  })

  app.get('/api/shared-games/:shareCode', async (req, res) => {
    const shareCode = normalizeSharedGameCode(req.params.shareCode)
    const did = typeof req.query.did === 'string' ? req.query.did : null

    if (!shareCode) {
      return res.status(400).json({ error: 'Missing shareCode' })
    }

    try {
      const sharedGame = await SharedGame.findOne({ shareCode })
      if (!sharedGame) {
        return res.status(404).json({ error: 'Shared game not found' })
      }

      const baseResponse = buildSharedGameResponse(req, sharedGame)

      if (!did) {
        return res.json(baseResponse)
      }

      const play = await getOrCreateSharedGamePlay(did, shareCode)

      res.json({
        ...baseResponse,
        guesses: play.guesses,
        status: play.status,
      })
    } catch (error) {
      console.error('Error fetching shared game:', error)
      res.status(500).json({ error: 'Failed to fetch shared game' })
    }
  })

  app.post('/api/shared-games/:shareCode/guess', async (req, res) => {
    const { did, guess } = req.body
    const shareCode = normalizeSharedGameCode(req.params.shareCode)

    if (!did || !guess) {
      return res.status(400).json({ error: 'Missing did or guess' })
    }

    const normalizedGuess = normalizeGuessWord(guess)
    if (!validationWordList.has(normalizedGuess)) {
      return res.status(400).json({ error: 'Invalid word' })
    }

    try {
      const sharedGame = await SharedGame.findOne({ shareCode })
      if (!sharedGame) {
        return res.status(404).json({ error: 'Shared game not found' })
      }

      const play = await getOrCreateSharedGamePlay(String(did), shareCode)

      if (play.status !== 'Playing') {
        return res.status(400).json({ error: 'Game is already over (Won or Lost)' })
      }

      const evals = evaluateGuess(normalizedGuess, sharedGame.targetWord)
      play.guesses.push({ letters: normalizedGuess.split(''), evaluation: evals })

      if (evals.every(e => e === 'correct')) {
        play.status = 'Won'
        play.completedAt = new Date()
      } else if (play.guesses.length >= 6) {
        play.status = 'Lost'
        play.completedAt = new Date()
      }

      await play.save()

      res.json({
        ...buildSharedGameResponse(req, sharedGame),
        guesses: play.guesses,
        status: play.status,
      })
    } catch (error) {
      console.error('Error processing shared game guess:', error)
      res.status(500).json({ error: 'Failed to process guess' })
    }
  })

  api(app, Game, Word, Player)

  // Catch-all must be last — serves index.html for client-side routing
  if (staticDir) {
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  return app
}
