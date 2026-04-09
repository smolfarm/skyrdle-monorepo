// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/server-app'
import {
  createMockGameModel,
  createMockPlayerModel,
  createMockSharedGameModel,
  createMockSharedGamePlayModel,
  createMockWordModel,
  mockGameDoc,
} from '../mocks/models'
import { calculateGameNumber } from '../../src/utils/dateUtils'

// Pin time to avoid flakiness across midnight rollover
const PINNED_TIME = new Date('2025-12-15T12:00:00-05:00')

describe('GET /api/game', () => {
  let app: ReturnType<typeof createApp>
  let Game: ReturnType<typeof createMockGameModel>
  const wordList = ['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE']
  const validationWordList = new Set(['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE'])
  let currentGameNumber: number

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_TIME)
    currentGameNumber = calculateGameNumber()
    Game = createMockGameModel()
    const Word = createMockWordModel()
    const Player = createMockPlayerModel()
    const SharedGame = createMockSharedGameModel()
    const SharedGamePlay = createMockSharedGamePlayModel()
    app = createApp({
      wordList,
      validationWordList,
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      SharedGame: SharedGame as any,
      SharedGamePlay: SharedGamePlay as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('returns game state for existing game', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      guesses: [{ letters: ['S', 'L', 'A', 'T', 'E'], evaluation: ['absent', 'absent', 'correct', 'absent', 'present'] }],
      status: 'Playing',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    const res = await request(app)
      .get('/api/game')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.guesses).toHaveLength(1)
    expect(res.body.status).toBe('Playing')
    expect(res.body.gameNumber).toBe(currentGameNumber)
  })

  it('creates new game if none exists', async () => {
    Game.findOne.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/game')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.guesses).toEqual([])
    expect(res.body.status).toBe('Playing')
    expect(Game).toHaveBeenCalled()
  })

  it('returns 400 when did is missing', async () => {
    const res = await request(app)
      .get('/api/game')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing did')
  })
})

describe('GET /api/game/:gameNumber', () => {
  let app: ReturnType<typeof createApp>
  let Game: ReturnType<typeof createMockGameModel>
  const wordList = ['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE']
  const validationWordList = new Set(['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE'])
  let currentGameNumber: number

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_TIME)
    currentGameNumber = calculateGameNumber()
    Game = createMockGameModel()
    const Word = createMockWordModel()
    const Player = createMockPlayerModel()
    const SharedGame = createMockSharedGameModel()
    const SharedGamePlay = createMockSharedGamePlayModel()
    app = createApp({
      wordList,
      validationWordList,
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      SharedGame: SharedGame as any,
      SharedGamePlay: SharedGamePlay as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('returns specific past game', async () => {
    const pastGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'HELLO',
      guesses: [{ letters: ['H', 'E', 'L', 'L', 'O'], evaluation: ['correct', 'correct', 'correct', 'correct', 'correct'] }],
      status: 'Won',
      gameNumber: 1,
    })
    Game.findOne.mockResolvedValue(pastGame)

    const res = await request(app)
      .get('/api/game/1')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Won')
    expect(res.body.gameNumber).toBe(1)
    expect(res.body.targetWord).toBe('HELLO')
  })

  it('creates game for valid past game number', async () => {
    Game.findOne.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/game/1')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.guesses).toEqual([])
    expect(res.body.status).toBe('Playing')
    expect(Game).toHaveBeenCalled()
  })

  it('returns 400 when did is missing', async () => {
    const res = await request(app)
      .get(`/api/game/${currentGameNumber}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing did')
  })

  it('returns 400 for future gameNumber', async () => {
    const res = await request(app)
      .get(`/api/game/${currentGameNumber + 100}`)
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Cannot access future games')
  })

  it('returns 400 for invalid gameNumber', async () => {
    const res = await request(app)
      .get('/api/game/-1')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid gameNumber format or value')
  })

  it('returns 400 for non-numeric gameNumber', async () => {
    const res = await request(app)
      .get('/api/game/abc')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid gameNumber format or value')
  })

  it('returns 400 for gameNumber of zero', async () => {
    const res = await request(app)
      .get('/api/game/0')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid gameNumber format or value')
  })
})
