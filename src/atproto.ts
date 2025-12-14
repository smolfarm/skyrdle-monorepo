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

import { AtpAgent } from '@atproto/api'
import { XRPCError } from '@atproto/xrpc'
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser'

const USER_SCORE_COLLECTION = 'farm.smol.games.skyrdle.score'

// Define the type for a guess with evaluation
export type ServerGuess = { letters: string[]; evaluation: ('correct'|'present'|'absent')[] }

type AtpAgentInstance = InstanceType<typeof AtpAgent>

// AT Protocol agent, hydrated from OAuth session
export let agent: AtpAgentInstance | null = null

let oauthClient: BrowserOAuthClient | null = null

async function ensureClient(): Promise<BrowserOAuthClient> {
  if (oauthClient) return oauthClient
  const clientId = import.meta.env.VITE_ATPROTO_CLIENT_ID
  if (!clientId) {
    throw new Error('Missing VITE_ATPROTO_CLIENT_ID for AT Protocol OAuth')
  }
  oauthClient = await BrowserOAuthClient.load({
    clientId,
    handleResolver: 'https://bsky.social/',
  })
  return oauthClient
}

function hydrateAgent(session: OAuthSession) {
  const service =
    (session as any).pds ||
    session.serverMetadata?.issuer ||
    'https://bsky.social'
  agent = new AtpAgent({
    service,
  })
  ;(agent as any).session = {
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    handle: session.handle,
    did: session.did,
    email: session.email,
    pds: service,
  }
}

/**
 * Initialize OAuth client and restore session if present.
 * Returns DID when logged in, else null.
 */
export async function initAuth(): Promise<string | null> {
  const client = await ensureClient()
  const result = await client.init()
  if (result?.session) {
    hydrateAgent(result.session)
    return result.session.did
  }
  return null
}

/**
 * Kick off OAuth login for the provided handle.
 * This will redirect the browser.
 */
export async function startLogin(handle: string) {
  const client = await ensureClient()
  const url = await client.authorize(handle, { scope: 'atproto' })
  window.location.href = url.toString()
}

/**
 * Sign out and clear local agent.
 */
export async function logout() {
  const client = await ensureClient()
  await client.signOut()
  agent = null
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
  try {
    const isWin = score >= 0;
    // use gameNumber as rkey to avoid duplicate records
    const recordHash = await computeHash(`${did}|${gameNumber}|${score}`);
    await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: USER_SCORE_COLLECTION,
      rkey: String(gameNumber),
      record: { gameNumber, score, guesses, timestamp: new Date().toISOString(), hash: recordHash, isWin: isWin },
    });
  } catch (e: any) {
    // refresh token on expiry
    if (e instanceof XRPCError && e.error === 'ExpiredToken') {
      const sess = agent.session;
      if (!sess?.refreshJwt) throw e;
      const res = await agent.api.com.atproto.server.refreshSession({ refreshJwt: sess.refreshJwt });
      // update session
      agent.session = { ...agent.session, accessJwt: res.data.accessJwt, refreshJwt: res.data.refreshJwt };
      localStorage.setItem('skyrdleSession', JSON.stringify(agent.session));
      // retry with same rkey to update rather than duplicate
      const isWinRetry = score >= 0;
      const recordHashRetry = await computeHash(`${did}|${gameNumber}|${score}`);
      await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: USER_SCORE_COLLECTION,
        rkey: String(gameNumber),
        record: { gameNumber, score, guesses, timestamp: new Date().toISOString(), hash: recordHashRetry, isWin: isWinRetry },
      });
    } else {
      throw e;
    }
  }
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
  } catch (e: any) {
    console.error(e);
    return null;
  }
}

/**
 * Post results to Bluesky
 */
export async function postSkeet(text: string) {
  if (!agent?.session?.did) throw new Error('Not logged in')

  try {
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
      await agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text,
          createdAt: new Date().toISOString(),
          langs: ['en'],
          facets
        },
      })
  } catch (e: any) {
    if (e instanceof XRPCError && e.error === 'ExpiredToken') {
      const sess = agent.session
      if (!sess?.refreshJwt) throw e
      const res = await agent.api.com.atproto.server.refreshSession({ refreshJwt: sess.refreshJwt })
      agent.session = { ...agent.session, accessJwt: res.data.accessJwt, refreshJwt: res.data.refreshJwt }
      localStorage.setItem('skyrdleSession', JSON.stringify(agent.session))

      // Retry post
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
        await agent.com.atproto.repo.createRecord({
          repo: agent.session.did,
          collection: 'app.bsky.feed.post',
          record: {
            $type: 'app.bsky.feed.post',
            text,
            createdAt: new Date().toISOString(),
            langs: ['en'],
            facets
          },
        })
    } else {
      throw e
    }
  }
}

/**
 * Check whether we have an active OAuth session and refresh agent if needed.
 */
export async function refreshSession() {
  const client = await ensureClient()
  const result = await client.init()
  if (result?.session) {
    hydrateAgent(result.session)
  } else {
    agent = null
  }
}
