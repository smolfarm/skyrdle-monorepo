// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/server-app'
import {
  createMockGameModel,
  createMockPlayerModel,
  createMockSharedGameModel,
  createMockSharedGamePlayModel,
  createMockWordModel,
} from '../mocks/models'

describe('shared game routes', () => {
  let app: ReturnType<typeof createApp>
  let SharedGame: ReturnType<typeof createMockSharedGameModel>
  let SharedGamePlay: ReturnType<typeof createMockSharedGamePlayModel>

  beforeEach(() => {
    SharedGame = createMockSharedGameModel()
    SharedGamePlay = createMockSharedGamePlayModel()

    app = createApp({
      wordList: ['CRANE'],
      validationWordList: new Set(['CRANE', 'SLATE']),
      Game: createMockGameModel() as any,
      Word: createMockWordModel() as any,
      Player: createMockPlayerModel() as any,
      SharedGame: SharedGame as any,
      SharedGamePlay: SharedGamePlay as any,
      getPublicOrigin: () => 'https://skyrdle.example.com',
    })
  })

  it('creates a shared game and returns a share URL', async () => {
    const res = await request(app)
      .post('/api/shared-games')
      .send({ did: 'did:plc:creator', title: 'Orbit', targetWord: 'crane' })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Orbit')
    expect(res.body.targetWord).toBe('CRANE')
    expect(res.body.shareCode).toMatch(/^[a-f0-9]{10}$/)
    expect(res.body.shareUrl).toBe(`https://skyrdle.example.com/shared/${res.body.shareCode}`)
  })

  it('returns metadata without creating a play record when did is omitted', async () => {
    SharedGame.findOne.mockResolvedValue({
      shareCode: 'abc123def4',
      title: 'Orbit',
      creatorDid: 'did:plc:creator',
      targetWord: 'CRANE',
    })

    const res = await request(app).get('/api/shared-games/abc123def4')

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Orbit')
    expect(res.body).not.toHaveProperty('guesses')
  })

  it('creates a play record for a player opening the link', async () => {
    SharedGame.findOne.mockResolvedValue({
      shareCode: 'abc123def4',
      title: 'Orbit',
      creatorDid: 'did:plc:creator',
      targetWord: 'CRANE',
    })
    SharedGamePlay.findOne.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/shared-games/abc123def4')
      .query({ did: 'did:plc:player' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Playing')
    expect(res.body.guesses).toEqual([])
    expect(SharedGamePlay).toHaveBeenCalled()
  })

  it('evaluates guesses against the shared game answer', async () => {
    SharedGame.findOne.mockResolvedValue({
      shareCode: 'abc123def4',
      title: 'Orbit',
      creatorDid: 'did:plc:creator',
      targetWord: 'CRANE',
    })
    SharedGamePlay.findOne.mockResolvedValue({
      did: 'did:plc:player',
      shareCode: 'abc123def4',
      guesses: [],
      status: 'Playing',
      save: async function () {
        return this
      },
    })

    const res = await request(app)
      .post('/api/shared-games/abc123def4/guess')
      .send({ did: 'did:plc:player', guess: 'crane' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Won')
    expect(res.body.guesses[0].letters).toEqual(['C', 'R', 'A', 'N', 'E'])
  })
})
