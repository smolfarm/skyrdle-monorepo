import { vi } from 'vitest'

/**
 * Mock BrowserOAuthClient for testing AT Protocol OAuth flows
 */
export class MockBrowserOAuthClient {
  static loadMock = vi.fn()

  init = vi.fn()
  signIn = vi.fn()
  revoke = vi.fn()
  restore = vi.fn()

  static load(config: any) {
    const instance = new MockBrowserOAuthClient()
    MockBrowserOAuthClient.loadMock(config)
    return Promise.resolve(instance)
  }

  static reset() {
    MockBrowserOAuthClient.loadMock.mockClear()
  }
}

/**
 * Mock Agent for testing AT Protocol API calls
 */
export class MockAgent {
  assertDid: string | undefined
  com: any

  constructor(session?: any) {
    this.assertDid = session?.sub

    // Mock the AT Protocol API methods
    this.com = {
      atproto: {
        repo: {
          createRecord: vi.fn().mockResolvedValue({ uri: 'mock-uri', cid: 'mock-cid' }),
          listRecords: vi.fn().mockResolvedValue({ data: { records: [] } }),
        },
      },
    }
  }

  static reset() {
    // Helper to reset all mocks
  }
}

/**
 * Create a mock OAuth session
 */
export function createMockSession(did: string = 'did:plc:test123') {
  return {
    sub: did,
    did,
    // Add other session properties as needed
  }
}

/**
 * Mock crypto.subtle.digest for hash computation testing
 */
export function mockCryptoSubtle() {
  const originalCrypto = global.crypto

  const mockDigest = vi.fn().mockImplementation(async (algorithm: string, data: BufferSource) => {
    // Simple mock: convert input to deterministic output
    const text = new TextDecoder().decode(data)
    const simpleHash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hashArray = new Uint8Array(32) // SHA-256 produces 32 bytes
    hashArray.fill(simpleHash % 256)
    return hashArray.buffer
  })

  if (!global.crypto) {
    (global as any).crypto = {}
  }

  if (!global.crypto.subtle) {
    (global.crypto as any).subtle = {}
  }

  (global.crypto.subtle as any).digest = mockDigest

  return {
    mockDigest,
    restore: () => {
      if (originalCrypto) {
        (global as any).crypto = originalCrypto
      }
    }
  }
}

/**
 * Setup AT Protocol mocks for a test suite
 */
export function setupAtProtoMocks() {
  // Mock the imports
  vi.mock('@atproto/oauth-client-browser', () => ({
    BrowserOAuthClient: MockBrowserOAuthClient,
  }))

  vi.mock('@atproto/api', () => ({
    Agent: MockAgent,
  }))
}
