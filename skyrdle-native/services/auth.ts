import * as AuthSession from 'expo-auth-session'
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession()

const AUTH_STORAGE_KEY = '@skyrdle/auth'
const BLUESKY_AUTH_URL = 'https://bsky.social/oauth/authorize'
const BLUESKY_TOKEN_URL = 'https://bsky.social/oauth/token'

// Redirect URI for the app
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'skyrdle',
})

export interface AuthState {
  did: string
  handle: string
  accessToken: string
  refreshToken?: string
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
 * Generate a code verifier for PKCE
 */
async function generateCodeVerifier(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32)
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  )
  // Convert to URL-safe base64
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Resolve a Bluesky handle to a DID
 */
export async function resolveHandle(handle: string): Promise<string> {
  // Remove @ if present
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

  const response = await fetch(
    `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(cleanHandle)}`
  )

  if (!response.ok) {
    throw new Error('Failed to resolve handle')
  }

  const data = await response.json()
  return data.did
}

/**
 * Start the OAuth login flow
 * Returns the auth state if successful, null if cancelled
 */
export async function startLogin(handle: string): Promise<AuthState | null> {
  try {
    // First resolve the handle to get the DID
    const did = await resolveHandle(handle)

    // Generate PKCE values
    const codeVerifier = await generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Store verifier for later
    await AsyncStorage.setItem('@skyrdle/pkce_verifier', codeVerifier)

    // Build authorization request
    const authRequest = new AuthSession.AuthRequest({
      clientId: 'https://skyrdle.com/.well-known/client-metadata.json',
      scopes: [
        'atproto',
        'repo:farm.smol.games.skyrdle.score?action=create&action=update',
        'repo:app.bsky.feed.post?action=create',
      ],
      redirectUri,
      codeChallenge,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      extraParams: {
        login_hint: handle,
      },
    })

    // Perform the authorization
    const result = await authRequest.promptAsync({
      authorizationEndpoint: BLUESKY_AUTH_URL,
    })

    if (result.type !== 'success') {
      return null
    }

    // Exchange code for tokens
    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: 'https://skyrdle.com/.well-known/client-metadata.json',
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: codeVerifier,
        },
      },
      {
        tokenEndpoint: BLUESKY_TOKEN_URL,
      }
    )

    // Clean handle for storage
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

    const authState: AuthState = {
      did,
      handle: cleanHandle,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
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
  await clearAuthState()
  await AsyncStorage.removeItem('@skyrdle/pkce_verifier')
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const state = await loadAuthState()
  return state !== null
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
