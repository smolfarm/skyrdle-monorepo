/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* AT Protocol integration for Skyrdle.                                     
*/

import { Agent } from '@atproto/api'
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser'

const USER_SCORE_COLLECTION = 'farm.smol.games.skyrdle.score'

// Define the type for a guess with evaluation
export type ServerGuess = { letters: string[]; evaluation: ('correct'|'present'|'absent')[] }

type AgentInstance = InstanceType<typeof Agent>

// AT Protocol agent, created from OAuth session
export let agent: AgentInstance | null = null

let oauthClient: BrowserOAuthClient | null = null
let currentSession: OAuthSession | null = null

function resolveClientId() {
  const envClientId = import.meta.env.VITE_ATPROTO_CLIENT_ID
  if (envClientId) return envClientId
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/.well-known/client-metadata.json`
  }
  return null
}

async function ensureClient(): Promise<BrowserOAuthClient> {
  if (oauthClient) return oauthClient
  const clientId = resolveClientId()
  if (!clientId) {
    throw new Error('Missing VITE_ATPROTO_CLIENT_ID for AT Protocol OAuth')
  }
  oauthClient = await BrowserOAuthClient.load({
    clientId,
    handleResolver: 'https://bsky.social/',
  })
  return oauthClient
}

/** Create an Agent from the OAuth session */
function createAgentFromSession(session: OAuthSession) {
  currentSession = session
  agent = new Agent(session)
}

/**
 * Initialize OAuth client and restore session if present.
 * Returns DID when logged in, else null.
 */
export async function initAuth(): Promise<string | null> {
  const client = await ensureClient()
  const result = await client.init()
  if (result?.session) {
    createAgentFromSession(result.session)
    console.log('[Skyrdle OAuth] Session restored for:', result.session.sub)
    return result.session.sub
  }
  console.log('[Skyrdle OAuth] No session found on init')
  return null
}

/**
 * Kick off OAuth login for the provided handle.
 * This will redirect the browser.
 */
export async function startLogin(handle: string) {
  const client = await ensureClient()
  // Use signIn instead of authorize - it handles the redirect properly
  await client.signIn(handle, {
    // Request Skyrdle score read/write and feed post create access
    scope:
      'atproto repo:farm.smol.games.skyrdle.score?action=create&action=update repo:app.bsky.feed.post?action=create',
  })
}

/**
 * Sign out and clear local agent.
 */
export async function logout() {
  const client = await ensureClient()
  if (currentSession?.sub) {
    try {
      await client.revoke(currentSession.sub)
    } catch (e) {
      console.warn('[Skyrdle OAuth] Error revoking session:', e)
    }
  }
  agent = null
  currentSession = null
}

// Helper to compute SHA-256 hash of a string
async function computeHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Save score to AT Protocol ledger
export async function saveScore(did: string, gameNumber: number, score: number, guesses: ServerGuess[]) {
  if (!agent) throw new Error('Not authenticated')
  const isWin = score >= 0;
  // use gameNumber as rkey to avoid duplicate records
  const recordHash = await computeHash(`${did}|${gameNumber}|${score}`);
  // Agent handles token refresh automatically for OAuth sessions
  await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: USER_SCORE_COLLECTION,
    rkey: String(gameNumber),
    record: { gameNumber, score, guesses, timestamp: new Date().toISOString(), hash: recordHash, isWin: isWin },
  });
}

// Check existing score for a given game
export async function getScore(did: string, gameNumber: number): Promise<number | null> {
  if (!agent) return null;
  try {
    const res = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: USER_SCORE_COLLECTION,
    });
    for (const record of res.data.records) {
      const { gameNumber: gn, score } = record.value as any;
      if (gn === gameNumber) return score;
    }
    return null;
  } catch (e) {
    console.error('[Skyrdle OAuth] Error fetching score:', e);
    return null;
  }
}

/** Get current account DID */
export function getAccountDid(): string | undefined {
  return agent?.assertDid
}

/**
 * Post results to Bluesky
 */
export async function postSkeet(text: string) {
  const did = agent?.assertDid
  if (!did) throw new Error('Not logged in')

  const encoder = new TextEncoder();
  const facets: any[] = [];
  const keyword = 'Skyrdle';
  const idx = text.indexOf(keyword);
  if (idx !== -1) {
    const byteStart = encoder.encode(text.slice(0, idx)).length;
    const byteEnd = byteStart + encoder.encode(keyword).length;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://skyrdle.com' }]
    });
  }
  // Agent handles token refresh automatically
  await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: 'app.bsky.feed.post',
    record: {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
      langs: ['en'],
      facets
    },
  })
}

/**
 * Restore a specific session by DID.
 */
export async function restoreSession(did: string): Promise<boolean> {
  const client = await ensureClient()
  try {
    const session = await client.restore(did)
    createAgentFromSession(session)
    return true
  } catch (e) {
    console.warn('[Skyrdle OAuth] Failed to restore session for', did, e)
    agent = null
    currentSession = null
    return false
  }
}
