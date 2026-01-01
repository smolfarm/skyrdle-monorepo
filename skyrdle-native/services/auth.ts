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
 * Get or create the OAuth client
 */
async function getOAuthClient(): Promise<ExpoOAuthClient> {
  if (oauthClient) return oauthClient

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
    handleResolver: 'https://bsky.social/',
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
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

    // This will open a browser for authentication
    const session = await client.signIn(cleanHandle, {
      scope: 'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create',
    })

    console.log('[Skyrdle Auth] Login successful, DID:', session.sub)

    agent = new Agent(session)

    const authState: AuthState = {
      did: session.sub,
      handle: cleanHandle,
    }

    await saveAuthState(authState)
    return authState
  } catch (error) {
    console.error('[Skyrdle Auth] Login error:', error)
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
