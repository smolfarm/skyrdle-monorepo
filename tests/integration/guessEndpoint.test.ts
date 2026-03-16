// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/server-app'
import { createMockGameModel, createMockWordModel, createMockPlayerModel, mockGameDoc } from '../mocks/models'
import { calculateGameNumber } from '../../src/utils/dateUtils'

// Pin time to avoid flakiness across midnight rollover
const PINNED_TIME = new Date('2025-12-15T12:00:00-05:00')

describe('POST /api/guess', () => {
  let app: ReturnType<typeof createApp>
  let Game: ReturnType<typeof createMockGameModel>
  let Word: ReturnType<typeof createMockWordModel>
  let Player: ReturnType<typeof createMockPlayerModel>
  const wordList = ['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE']
  const validationWordList = new Set(['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE', 'WRONG', 'BIKES', 'FOXES'])
  let currentGameNumber: number

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_TIME)
    currentGameNumber = calculateGameNumber()
    Game = createMockGameModel()
    Word = createMockWordModel()
    Player = createMockPlayerModel()
    app = createApp({
      wordList,
      validationWordList,
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('returns updated guesses and Playing status for a valid guess', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'SLATE', gameNumber: currentGameNumber })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Playing')
    expect(res.body.guesses).toHaveLength(1)
    expect(res.body.guesses[0].letters).toEqual(['S', 'L', 'A', 'T', 'E'])
  })

  it('returns Won status when guess is correct', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: currentGameNumber })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Won')
    expect(res.body.guesses).toHaveLength(1)
    expect(res.body.guesses[0].evaluation).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
  })

  it('returns Lost status on 6th wrong guess', async () => {
    const fiveGuesses = Array(5).fill(null).map(() => ({
      letters: ['W', 'R', 'O', 'N', 'G'],
      evaluation: ['absent', 'absent', 'absent', 'absent', 'absent'],
    }))
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      guesses: fiveGuesses,
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'WRONG', gameNumber: currentGameNumber })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Lost')
    expect(res.body.guesses).toHaveLength(6)
  })

  it('returns 400 for invalid word', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'ZZZZZ', gameNumber: currentGameNumber })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid word')
  })

  it('returns 400 when game is already over', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      guesses: [{ letters: ['C', 'R', 'A', 'N', 'E'], evaluation: ['correct', 'correct', 'correct', 'correct', 'correct'] }],
      status: 'Won',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'SLATE', gameNumber: currentGameNumber })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Game is already over (Won or Lost)')
  })

  it('returns 400 when did is missing', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ guess: 'CRANE', gameNumber: currentGameNumber })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing did, guess, or gameNumber')
  })

  it('returns 400 when guess is missing', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', gameNumber: currentGameNumber })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing did, guess, or gameNumber')
  })

  it('returns 400 when gameNumber is missing', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing did, guess, or gameNumber')
  })

  it('returns 400 for invalid gameNumber', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: -1 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid gameNumber format or value')
  })

  it('returns 400 for future gameNumber', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: currentGameNumber + 100 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Cannot make guesses for future games')
  })

  it('auto-creates game if none exists', async () => {
    Game.findOne.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'SLATE', gameNumber: currentGameNumber })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Playing')
    expect(res.body.guesses).toHaveLength(1)
    expect(Game).toHaveBeenCalled()
  })

  it('sets scoreHash when game is won', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: currentGameNumber })

    expect(existingGame.save).toHaveBeenCalledTimes(2)
    expect(existingGame).toHaveProperty('scoreHash')
    expect(existingGame.scoreHash).toBeTruthy()
  })

  it('sets completedAt when game is won', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: currentGameNumber })

    expect(existingGame.completedAt).toBeInstanceOf(Date)
  })

  it('handles case-insensitive guesses', async () => {
    const existingGame = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      gameNumber: currentGameNumber,
    })
    Game.findOne.mockResolvedValue(existingGame)

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'crane', gameNumber: currentGameNumber })

    expect(res.status).toBe(200)
    expect(res.body.guesses[0].letters).toEqual(['C', 'R', 'A', 'N', 'E'])
    expect(res.body.status).toBe('Won')
  })

  it('returns 400 for non-numeric gameNumber', async () => {
    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: 'abc' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid gameNumber format or value')
  })
})
