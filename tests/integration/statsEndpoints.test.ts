// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/server-app'
import { createMockGameModel, createMockWordModel, createMockPlayerModel } from '../mocks/models'

describe('GET /api/leaderboard', () => {
  let app: ReturnType<typeof createApp>
  let Player: ReturnType<typeof createMockPlayerModel>

  beforeEach(() => {
    const Game = createMockGameModel()
    const Word = createMockWordModel()
    Player = createMockPlayerModel()
    app = createApp({
      wordList: ['CRANE'],
      validationWordList: new Set(['CRANE']),
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('returns players sorted by streak with avgScore mapped to averageScore', async () => {
    const players = [
      { did: 'did:plc:alice', currentStreak: 10, gamesWon: 20, avgScore: 3.5, handle: 'alice.bsky.social' },
      { did: 'did:plc:bob', currentStreak: 5, gamesWon: 15, avgScore: 4.0, handle: 'bob.bsky.social' },
    ]
    Player.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(players),
    })

    const res = await request(app).get('/api/leaderboard')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].did).toBe('did:plc:alice')
    expect(res.body[0].currentStreak).toBe(10)
    expect(res.body[0].averageScore).toBe(3.5)
    expect(res.body[1].did).toBe('did:plc:bob')
    expect(res.body[1].averageScore).toBe(4.0)
  })

  it('returns empty array when no players', async () => {
    Player.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    })

    const res = await request(app).get('/api/leaderboard')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/stats', () => {
  let app: ReturnType<typeof createApp>
  let Game: ReturnType<typeof createMockGameModel>

  beforeEach(() => {
    Game = createMockGameModel()
    const Word = createMockWordModel()
    const Player = createMockPlayerModel()
    app = createApp({
      wordList: ['CRANE'],
      validationWordList: new Set(['CRANE']),
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('calculates streak, wins, and average score', async () => {
    const games = [
      { status: 'Won', guesses: [1, 2, 3], gameNumber: 3 },
      { status: 'Won', guesses: [1, 2, 3, 4, 5], gameNumber: 2 },
      { status: 'Lost', guesses: [1, 2, 3, 4, 5, 6], gameNumber: 1 },
    ]
    Game.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(games),
    })

    const res = await request(app)
      .get('/api/stats')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(2)
    expect(res.body.gamesWon).toBe(2)
    expect(res.body.averageScore).toBe(4) // (3 + 5) / 2
  })

  it('returns zeros for player with no games', async () => {
    Game.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    })

    const res = await request(app)
      .get('/api/stats')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(0)
    expect(res.body.gamesWon).toBe(0)
    expect(res.body.averageScore).toBe(0)
  })

  it('returns 400 when did is missing', async () => {
    const res = await request(app).get('/api/stats')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing did')
  })

  it('calculates streak of zero when most recent game is a loss', async () => {
    const games = [
      { status: 'Lost', guesses: [1, 2, 3, 4, 5, 6], gameNumber: 3 },
      { status: 'Won', guesses: [1, 2, 3], gameNumber: 2 },
    ]
    Game.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(games),
    })

    const res = await request(app)
      .get('/api/stats')
      .query({ did: 'did:plc:test' })

    expect(res.status).toBe(200)
    expect(res.body.currentStreak).toBe(0)
  })
})

describe('GET /api/game/:gameNumber/stats', () => {
  let app: ReturnType<typeof createApp>
  let Word: ReturnType<typeof createMockWordModel>

  beforeEach(() => {
    const Game = createMockGameModel()
    Word = createMockWordModel()
    const Player = createMockPlayerModel()
    app = createApp({
      wordList: ['CRANE'],
      validationWordList: new Set(['CRANE']),
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('returns word stats for a game number', async () => {
    Word.findOne.mockResolvedValue({
      gamesWon: 100,
      gamesLost: 20,
      avgScore: 3.8,
    })

    const res = await request(app).get('/api/game/1/stats')

    expect(res.status).toBe(200)
    expect(res.body.gamesWon).toBe(100)
    expect(res.body.gamesLost).toBe(20)
    expect(res.body.avgScore).toBe(3.8)
  })

  it('returns 404 when word not found', async () => {
    Word.findOne.mockResolvedValue(null)

    const res = await request(app).get('/api/game/999/stats')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Word not found')
  })
})

describe('GET /api/games/stats', () => {
  let app: ReturnType<typeof createApp>
  let Word: ReturnType<typeof createMockWordModel>

  beforeEach(() => {
    const Game = createMockGameModel()
    Word = createMockWordModel()
    const Player = createMockPlayerModel()
    app = createApp({
      wordList: ['CRANE'],
      validationWordList: new Set(['CRANE']),
      Game: Game as any,
      Word: Word as any,
      Player: Player as any,
      getPublicOrigin: () => 'http://localhost:4000',
    })
  })

  it('returns all game stats', async () => {
    const words = [
      { gameNumber: 1, word: 'HELLO', gamesWon: 50, gamesLost: 10, avgScore: 3.5 },
      { gameNumber: 2, word: 'WORLD', gamesWon: 45, gamesLost: 15, avgScore: 4.0 },
    ]
    Word.find.mockImplementation(() => {
      const query: any = {}
      query.sort = vi.fn().mockReturnValue(query)
      query.limit = vi.fn().mockReturnValue(query)
      query.then = (resolve: any, reject?: any) => Promise.resolve(words).then(resolve, reject)
      return query
    })

    const res = await request(app).get('/api/games/stats')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].gameNumber).toBe(1)
    expect(res.body[1].word).toBe('WORLD')
  })

  it('respects limit parameter', async () => {
    const words = [
      { gameNumber: 1, word: 'HELLO', gamesWon: 50, gamesLost: 10, avgScore: 3.5 },
    ]
    Word.find.mockImplementation(() => {
      const query: any = {}
      query.sort = vi.fn().mockReturnValue(query)
      query.limit = vi.fn().mockReturnValue(query)
      query.then = (resolve: any, reject?: any) => Promise.resolve(words).then(resolve, reject)
      return query
    })

    const res = await request(app)
      .get('/api/games/stats')
      .query({ limit: 1 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})
