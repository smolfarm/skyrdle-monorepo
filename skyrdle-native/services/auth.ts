import { Agent } from '@atproto/api'
import { ExpoOAuthClient, ExpoOAuthClientOptions } from '@atproto/oauth-client-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'

const AUTH_STORAGE_KEY = '@skyrdle/auth'

export interface AuthState {
  did: string
  handle: string
}

let oauthClient: ExpoOAuthClient | null = null
let agent: Agent | null = null

/**
 * RN/Hermes doesn't ship AbortSignal.timeout yet; polyfill for oauth-client.
 */
function ensureAbortSignalTimeout() {
  if (typeof AbortSignal === 'undefined') return

  // Polyfill AbortSignal.timeout for Hermes/RN
  if (typeof (AbortSignal as any).timeout !== 'function') {
    ;(AbortSignal as any).timeout = (ms: number) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), ms)
      controller.signal.addEventListener('abort', () => clearTimeout(timer))
      return controller.signal
    }
  }

  // Polyfill throwIfAborted used by oauth-client internals
  if (
    typeof (AbortSignal as any).prototype?.throwIfAborted !== 'function' &&
    (AbortSignal as any).prototype
  ) {
    ;(AbortSignal as any).prototype.throwIfAborted = function () {
      if (this.aborted) {
        const err: any = new DOMException('The operation was aborted.', 'AbortError')
        throw err
      }
    }
  }
}

/**
 * Get or create the OAuth client
 */
async function getOAuthClient(): Promise<ExpoOAuthClient> {
  if (oauthClient) return oauthClient

  ensureAbortSignalTimeout()

  const options: ExpoOAuthClientOptions = {
    clientMetadata: {
      client_id: 'https://skyrdle.com/.well-known/client-metadata-native.json',
      client_name: 'Skyrdle',
      redirect_uris: ['com.skyrdle:/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create',
      token_endpoint_auth_method: 'none',
      dpop_bound_access_tokens: true,
    },
    // Use Bluesky public API for handle resolution (XRPC)
    handleResolver: 'https://api.bsky.social',
    // Explicit PLC directory (identity resolution)
    plcDirectoryUrl: 'https://plc.directory/',
    // Allow HTTP fetches (PLC directory, etc.) in dev/emulator environments
    allowHttp: true,
  }

  oauthClient = new ExpoOAuthClient(options)
  return oauthClient
}

/**
 * Save auth state to AsyncStorage
 */
export async function saveAuthState(state: AuthState): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

/**
 * Load auth state from AsyncStorage
 */
export async function loadAuthState(): Promise<AuthState | null> {
  const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AuthState
  } catch {
    return null
  }
}

/**
 * Clear auth state from AsyncStorage
 */
export async function clearAuthState(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY)
}

/**
 * Initialize auth - restore session if available
 */
export async function initAuth(): Promise<AuthState | null> {
  try {
    const existingState = await loadAuthState()
    if (!existingState?.did) {
      console.log('[Skyrdle Auth] No stored auth state on init')
      return null
    }

    const client = await getOAuthClient()
    const session = await client.restore(existingState.did, 'auto')

    agent = new Agent(session)
    console.log('[Skyrdle Auth] Session restored for:', session.sub)

    const state: AuthState = {
      did: session.sub,
      handle: existingState.handle ?? session.sub,
    }
    await saveAuthState(state)
    return state
  } catch (error) {
    console.error('[Skyrdle Auth] Init error:', error)
    return null
  }
}

/**
 * Start the OAuth login flow
 */
export async function startLogin(handle: string): Promise<AuthState | null> {
  try {
    console.log('[Skyrdle Auth] Starting login for:', handle)
    const client = await getOAuthClient()

    // Clean handle
    const cleanHandle = (handle.startsWith('@') ? handle.slice(1) : handle).trim()
    // If user passes a DID, leave it as-is; otherwise ensure it is a FQDN handle
    const normalizedHandle = cleanHandle.startsWith('did:')
      ? cleanHandle
      : cleanHandle.includes('.')
        ? cleanHandle
        : `${cleanHandle}.bsky.social`

    // This will open a browser for authentication
    const session = await client.signIn(normalizedHandle.toLowerCase(), {
      scope: 'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create',
    })

    console.log('[Skyrdle Auth] Login successful, DID:', session.sub)

    agent = new Agent(session)

    const authState: AuthState = {
      did: session.sub,
      handle: normalizedHandle.toLowerCase(),
    }

    await saveAuthState(authState)
    return authState
  } catch (error) {
    const withCause = error as any
    console.error('[Skyrdle Auth] Login error:', error)
    if (withCause?.cause) {
      console.error('[Skyrdle Auth] Login error cause:', withCause.cause)
    }
    throw error
  }
}

/**
 * Logout and clear stored auth
 */
export async function logout(): Promise<void> {
  try {
    const client = await getOAuthClient()
    const state = await loadAuthState()
    if (state?.did) {
      await client.revoke(state.did)
    }
  } catch (error) {
    console.warn('[Skyrdle Auth] Error revoking session:', error)
  }

  agent = null
  await clearAuthState()
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const state = await loadAuthState()
  return state !== null
}

/**
 * Get the current agent for API calls
 */
export function getAgent(): Agent | null {
  return agent
}

/**
 * Get current account DID
 */
export function getAccountDid(): string | undefined {
  return agent?.assertDid
}

/**
 * Create a post on Bluesky
 */
export async function createPost(text: string): Promise<{ uri: string; cid: string }> {
  if (!agent) {
    throw new Error('Not authenticated')
  }

  // Find URLs in the text to create link facets
  const urlRegex = /https?:\/\/[^\s]+/g
  const facets: Array<{
    index: { byteStart: number; byteEnd: number }
    features: Array<{ $type: string; uri: string }>
  }> = []

  // Convert text to bytes for proper indexing (UTF-8)
  const encoder = new TextEncoder()

  let match
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0]
    // Calculate byte positions
    const beforeUrl = text.slice(0, match.index)
    const byteStart = encoder.encode(beforeUrl).length
    const byteEnd = byteStart + encoder.encode(url).length

    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
    })
  }

  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
  }

  if (facets.length > 0) {
    record.facets = facets
  }

  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: 'app.bsky.feed.post',
    record,
  })

  return { uri: response.data.uri, cid: response.data.cid }
}

/**
 * Compute SHA-256 hash of a string
 */
export async function computeHash(input: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  )
  return digest
}
