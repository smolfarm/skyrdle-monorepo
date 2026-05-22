// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const PINNED_TIME = new Date('2025-12-15T12:00:00-05:00')

function buildApp(options?: {
  isReady?: () => boolean
  requireVerifiedWrites?: boolean
  verifyDidRequest?: Parameters<typeof createApp>[0]['verifyDidRequest']
}) {
  const Game = createMockGameModel()
  const app = createApp({
    wordList: ['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE'],
    validationWordList: new Set(['HELLO', 'WORLD', 'CRANE', 'SLATE', 'TRACE']),
    Game: Game as any,
    Word: createMockWordModel() as any,
    Player: createMockPlayerModel() as any,
    SharedGame: createMockSharedGameModel() as any,
    SharedGamePlay: createMockSharedGamePlayModel() as any,
    getPublicOrigin: () => 'http://localhost:4000',
    ...options,
  })

  return { app, Game }
}

describe('server hardening', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_TIME)
  })

  it('reports readiness through /healthz', async () => {
    const ready = buildApp({ isReady: () => true })
    const notReady = buildApp({ isReady: () => false })

    const readyRes = await request(ready.app).get('/healthz')
    const notReadyRes = await request(notReady.app).get('/healthz')

    expect(readyRes.status).toBe(200)
    expect(readyRes.body).toEqual({ status: 'ok' })
    expect(notReadyRes.status).toBe(503)
    expect(notReadyRes.body).toEqual({ status: 'not_ready' })
  })

  it('rejects DID-bound writes when verification is required and missing', async () => {
    const { app } = buildApp({
      requireVerifiedWrites: true,
      verifyDidRequest: () => false,
    })

    const res = await request(app)
      .post('/api/guess')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: calculateGameNumber() })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized did')
  })

  it('allows DID-bound writes only when the verifier matches the request DID', async () => {
    const { app, Game } = buildApp({
      requireVerifiedWrites: true,
      verifyDidRequest: (req, did) => req.get('x-test-did') === did,
    })
    const game = mockGameDoc({
      did: 'did:plc:test',
      targetWord: 'CRANE',
      gameNumber: calculateGameNumber(),
    })
    Game.findOne.mockResolvedValue(game)

    const rejected = await request(app)
      .post('/api/guess')
      .set('x-test-did', 'did:plc:someone-else')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: calculateGameNumber() })
    const accepted = await request(app)
      .post('/api/guess')
      .set('x-test-did', 'did:plc:test')
      .send({ did: 'did:plc:test', guess: 'CRANE', gameNumber: calculateGameNumber() })

    expect(rejected.status).toBe(401)
    expect(accepted.status).toBe(200)
    expect(accepted.body.status).toBe('Won')
  })
})
