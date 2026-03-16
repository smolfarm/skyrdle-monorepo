// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/server-app'
import { createMockGameModel, createMockWordModel, createMockPlayerModel } from '../mocks/models'

function buildApp(getPublicOrigin = () => 'https://skyrdle.example.com') {
  return createApp({
    wordList: ['CRANE'],
    validationWordList: new Set(['CRANE']),
    Game: createMockGameModel() as any,
    Word: createMockWordModel() as any,
    Player: createMockPlayerModel() as any,
    getPublicOrigin,
  })
}

describe('GET /.well-known/client-metadata.json', () => {
  it('returns web client metadata with correct client_id', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata.json')

    expect(res.status).toBe(200)
    expect(res.body.client_id).toBe('https://skyrdle.example.com/.well-known/client-metadata.json')
    expect(res.body.client_name).toBe('Skyrdle')
    expect(res.body.application_type).toBe('web')
  })

  it('includes correct redirect_uris derived from origin', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata.json')

    expect(res.body.redirect_uris).toEqual([
      'https://skyrdle.example.com/',
      'https://skyrdle.example.com',
    ])
  })

  it('includes atproto scope', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata.json')

    expect(res.body.scope).toContain('atproto')
    expect(res.body.scope).toContain('farm.smol.games.skyrdle.score')
  })

  it('sets Cache-Control header', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata.json')

    expect(res.headers['cache-control']).toBe('public, max-age=300')
  })
})

describe('GET /.well-known/client-metadata-native.json', () => {
  it('returns native client metadata', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata-native.json')

    expect(res.status).toBe(200)
    expect(res.body.client_name).toBe('Skyrdle')
    expect(res.body.application_type).toBe('native')
  })

  it('uses native redirect URI scheme', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata-native.json')

    expect(res.body.redirect_uris).toEqual(['com.skyrdle:/callback'])
  })

  it('includes dpop_bound_access_tokens', async () => {
    const app = buildApp()
    const res = await request(app).get('/.well-known/client-metadata-native.json')

    expect(res.body.dpop_bound_access_tokens).toBe(true)
    expect(res.body.token_endpoint_auth_method).toBe('none')
  })
})

describe('static file and catch-all behavior', () => {
  it('does not register catch-all when no staticDir is provided', async () => {
    const app = buildApp()

    // An unknown path should 404 (no catch-all without staticDir)
    const res = await request(app).get('/some/random/path')
    expect(res.status).toBe(404)
  })

  it('API routes take priority over catch-all when staticDir is set', async () => {
    const app = createApp({
      wordList: ['CRANE'],
      validationWordList: new Set(['CRANE']),
      Game: createMockGameModel() as any,
      Word: createMockWordModel() as any,
      Player: createMockPlayerModel() as any,
      getPublicOrigin: () => 'https://example.com',
      staticDir: '/tmp/nonexistent-dir-for-test',
    })

    // Missing did → API returns 400 JSON, not a static file or catch-all HTML
    const res = await request(app).get('/api/game')

    expect(res.status).toBe(400)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body.error).toBe('Missing did')
  })
})
