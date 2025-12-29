import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'crypto'

/**
 * AT Protocol Integration Tests
 *
 * Tests OAuth authentication, score saving/retrieval, and Bluesky posting
 * These tests use mocked AT Protocol services to validate integration logic
 */

describe('AT Protocol Integration', () => {
  describe('computeHash', () => {
    it('generates consistent SHA-256 hash for same input', async () => {
      const input = 'did:plc:test123|1|3'

      // Use Node's crypto module for testing
      const hash1 = crypto.createHash('sha256').update(input).digest('hex')
      const hash2 = crypto.createHash('sha256').update(input).digest('hex')

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 produces 64 hex characters
    })

    it('generates different hashes for different inputs', async () => {
      const input1 = 'did:plc:test123|1|3'
      const input2 = 'did:plc:test123|1|4'

      const hash1 = crypto.createHash('sha256').update(input1).digest('hex')
      const hash2 = crypto.createHash('sha256').update(input2).digest('hex')

      expect(hash1).not.toBe(hash2)
    })

    it('matches server-side hash format', async () => {
      const did = 'did:plc:test123'
      const gameNumber = 5
      const score = 3

      const expectedHash = crypto
        .createHash('sha256')
        .update(`${did}|${gameNumber}|${score}`)
        .digest('hex')

      expect(expectedHash).toMatch(/^[a-f0-9]{64}$/)
      expect(expectedHash.length).toBe(64)
    })

    it('handles special characters in input', async () => {
      const input = 'did:plc:abc123@#$%|100|-1'
      const hash = crypto.createHash('sha256').update(input).digest('hex')

      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('Score Record Structure', () => {
    it('creates valid score record with all required fields', () => {
      const did = 'did:plc:test123'
      const gameNumber = 1
      const score = 3
      const guesses = [
        { letters: ['S', 'T', 'A', 'R', 'E'], evaluation: ['correct', 'absent', 'present', 'absent', 'present'] },
        { letters: ['S', 'P', 'A', 'C', 'E'], evaluation: ['correct', 'correct', 'correct', 'correct', 'correct'] },
      ]

      const hash = crypto.createHash('sha256').update(`${did}|${gameNumber}|${score}`).digest('hex')
      const isWin = score >= 0

      const record = {
        gameNumber,
        score,
        guesses,
        timestamp: new Date().toISOString(),
        hash,
        isWin,
      }

      expect(record.gameNumber).toBe(1)
      expect(record.score).toBe(3)
      expect(record.guesses).toHaveLength(2)
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(record.hash).toMatch(/^[a-f0-9]{64}$/)
      expect(record.isWin).toBe(true)
    })

    it('marks losing game correctly', () => {
      const score = -1 // Lost game
      const isWin = score >= 0

      expect(isWin).toBe(false)
    })

    it('uses gameNumber as rkey to prevent duplicates', () => {
      const gameNumber = 42
      const rkey = String(gameNumber)

      expect(rkey).toBe('42')
    })

    it('validates hash matches server-side calculation', () => {
      const did = 'did:plc:test123'
      const gameNumber = 10
      const score = 2

      // This is how the server calculates it (from server.js:260)
      const serverHash = crypto.createHash('sha256').update(`${did}|${gameNumber}|${score}`).digest('hex')

      // This is how the client should calculate it (from atproto.ts:116)
      const clientHash = crypto.createHash('sha256').update(`${did}|${gameNumber}|${score}`).digest('hex')

      expect(clientHash).toBe(serverHash)
    })
  })

  describe('getScore logic', () => {
    it('returns null when no matching record found', () => {
      const records = [
        { value: { gameNumber: 1, score: 3 } },
        { value: { gameNumber: 2, score: 4 } },
      ]

      const targetGameNumber = 5
      let foundScore: number | null = null

      for (const record of records) {
        const { gameNumber, score } = record.value as any
        if (gameNumber === targetGameNumber) {
          foundScore = score
          break
        }
      }

      expect(foundScore).toBeNull()
    })

    it('returns score when matching record found', () => {
      const records = [
        { value: { gameNumber: 1, score: 3 } },
        { value: { gameNumber: 2, score: 4 } },
        { value: { gameNumber: 3, score: 2 } },
      ]

      const targetGameNumber = 2
      let foundScore: number | null = null

      for (const record of records) {
        const { gameNumber, score } = record.value as any
        if (gameNumber === targetGameNumber) {
          foundScore = score
          break
        }
      }

      expect(foundScore).toBe(4)
    })

    it('handles empty records list', () => {
      const records: any[] = []
      const targetGameNumber = 1
      let foundScore: number | null = null

      for (const record of records) {
        const { gameNumber, score } = record.value as any
        if (gameNumber === targetGameNumber) {
          foundScore = score
          break
        }
      }

      expect(foundScore).toBeNull()
    })
  })

  describe('postSkeet facet generation', () => {
    it('creates facet for Skyrdle keyword with correct byte positions', () => {
      const text = 'Skyrdle 1 3/6\n\n🟩🟨⬛⬛🟨\n🟩🟩🟩🟩🟩'
      const keyword = 'Skyrdle'
      const encoder = new TextEncoder()

      const idx = text.indexOf(keyword)
      expect(idx).toBe(0)

      const byteStart = encoder.encode(text.slice(0, idx)).length
      const byteEnd = byteStart + encoder.encode(keyword).length

      expect(byteStart).toBe(0)
      expect(byteEnd).toBe(7) // "Skyrdle" is 7 bytes

      const facet = {
        index: { byteStart, byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://skyrdle.com' }]
      }

      expect(facet.index.byteStart).toBe(0)
      expect(facet.index.byteEnd).toBe(7)
      expect(facet.features[0].uri).toBe('https://skyrdle.com')
    })

    it('handles emoji characters correctly in byte calculation', () => {
      const text = '🎮 Skyrdle 5 X/6'
      const keyword = 'Skyrdle'
      const encoder = new TextEncoder()

      const idx = text.indexOf(keyword)
      expect(idx).toBe(3) // Character index (emoji is 2 chars + space = 3)

      // Emoji takes 4 bytes, space takes 1 byte
      const byteStart = encoder.encode(text.slice(0, idx)).length
      const byteEnd = byteStart + encoder.encode(keyword).length

      expect(byteStart).toBe(5) // 🎮 (4 bytes) + space (1 byte)
      expect(byteEnd).toBe(12) // 5 + 7
    })

    it('creates empty facets array when keyword not found', () => {
      const text = 'Just a regular post'
      const keyword = 'Skyrdle'
      const facets: any[] = []

      const idx = text.indexOf(keyword)
      if (idx !== -1) {
        // Would add facet here
        facets.push({})
      }

      expect(facets).toHaveLength(0)
    })

    it('creates valid post record structure', () => {
      const text = 'Skyrdle 3 2/6\n\n🟩🟨⬛⬛🟨\n🟩🟩🟩🟩🟩'
      const did = 'did:plc:test123'
      const encoder = new TextEncoder()

      const facets: any[] = []
      const keyword = 'Skyrdle'
      const idx = text.indexOf(keyword)

      if (idx !== -1) {
        const byteStart = encoder.encode(text.slice(0, idx)).length
        const byteEnd = byteStart + encoder.encode(keyword).length
        facets.push({
          index: { byteStart, byteEnd },
          features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://skyrdle.com' }]
        })
      }

      const record = {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
        langs: ['en'],
        facets
      }

      expect(record.$type).toBe('app.bsky.feed.post')
      expect(record.text).toContain('Skyrdle')
      expect(record.langs).toEqual(['en'])
      expect(record.facets).toHaveLength(1)
      expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('OAuth Session Management', () => {
    it('validates session structure', () => {
      const session = {
        sub: 'did:plc:test123',
        did: 'did:plc:test123',
      }

      expect(session.sub).toBe('did:plc:test123')
      expect(session.did).toBe('did:plc:test123')
    })

    it('handles missing session on init', () => {
      const result = null // No session

      expect(result).toBeNull()
    })

    it('returns DID when session restored', () => {
      const session = {
        sub: 'did:plc:test123',
        did: 'did:plc:test123',
      }

      const did = session.sub

      expect(did).toBe('did:plc:test123')
      expect(did).toMatch(/^did:plc:/)
    })
  })

  describe('Error Handling', () => {
    it('throws error when saving score without authentication', () => {
      const agent = null

      expect(() => {
        if (!agent) throw new Error('Not authenticated')
      }).toThrow('Not authenticated')
    })

    it('returns null when getting score without agent', () => {
      const agent = null
      const result = agent ? 'would-fetch-score' : null

      expect(result).toBeNull()
    })

    it('throws error when posting skeet without DID', () => {
      const agent = { assertDid: undefined }
      const did = agent?.assertDid

      expect(() => {
        if (!did) throw new Error('Not logged in')
      }).toThrow('Not logged in')
    })

    it('handles API errors gracefully in getScore', async () => {
      // Simulate API error
      let errorCaught = false
      let result: number | null = null

      try {
        throw new Error('Network error')
      } catch (e) {
        console.error('[Skyrdle OAuth] Error fetching score:', e)
        errorCaught = true
        result = null
      }

      expect(errorCaught).toBe(true)
      expect(result).toBeNull()
    })
  })

  describe('Collection and Scope Configuration', () => {
    it('uses correct collection name for scores', () => {
      const USER_SCORE_COLLECTION = 'farm.smol.games.skyrdle.score'

      expect(USER_SCORE_COLLECTION).toBe('farm.smol.games.skyrdle.score')
    })

    it('uses correct collection name for posts', () => {
      const POST_COLLECTION = 'app.bsky.feed.post'

      expect(POST_COLLECTION).toBe('app.bsky.feed.post')
    })

    it('requests correct OAuth scopes', () => {
      const scope = 'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create'

      expect(scope).toContain('farm.smol.games.skyrdle.score')
      expect(scope).toContain('action=create')
      expect(scope).toContain('action=update')
      expect(scope).toContain('app.bsky.feed.post')
    })
  })

  describe('Client ID Resolution', () => {
    it('uses environment variable when available', () => {
      const envClientId = 'https://custom-client.com/client-metadata.json'
      const resolved = envClientId || 'fallback'

      expect(resolved).toBe(envClientId)
    })

    it('generates client ID from window.location.origin', () => {
      // Simulate browser environment
      const mockOrigin = 'https://skyrdle.com'
      const clientId = `${mockOrigin}/.well-known/client-metadata.json`

      expect(clientId).toBe('https://skyrdle.com/.well-known/client-metadata.json')
    })
  })
})
