import { AtpAgent } from '@atproto/api';
import { XRPCError } from '@atproto/xrpc';

const USER_SCORE_COLLECTION = 'farm.smol.games.skyrdle.score'

// Define the type for a guess with evaluation
export type ServerGuess = { letters: string[]; evaluation: ('correct'|'present'|'absent')[] }

// Initialize AT Protocol agent with session persistence
export const agent = new AtpAgent({
  service: 'https://bsky.social',
  persistSession: (_evt: any, session: any) => {
    if (session) localStorage.setItem('skyrdleSession', JSON.stringify(session));
    else localStorage.removeItem('skyrdleSession');
  },
})

/**
 * Login with optional 2FA.
 * First call sends identifier & password; if 2FA required,
 * throws { type: 'AuthRequired', factorToken }.
 * On retry, include returned factorToken and code to complete login.
 */
export async function login(
  identifier: string,
  password: string,
  authFactorToken?: string,
  code?: string
): Promise<{ did: string }> {
  const body: any = { identifier, password };
  if (authFactorToken) body.authFactorToken = authFactorToken;
  if (code) body.code = code;
  try {
    const res = await agent.api.com.atproto.server.createSession(body);
    // hydrate agent session
    agent.session = {
      accessJwt: res.data.accessJwt,
      refreshJwt: res.data.refreshJwt,
      handle: res.data.handle,
      did: res.data.did,
      email: res.data.email,
    };
    // persist session manually (fallback)
    localStorage.setItem('skyrdleSession', JSON.stringify(agent.session));
    return { did: res.data.did };
  } catch (e: any) {
    if (e instanceof XRPCError && e.error === 'AuthFactorTokenRequired') {
      // extract authFactorToken from www-authenticate header
      const header = (e.headers as any)['www-authenticate'] as string || '';
      const match = header.match(/authFactorToken="([^\"]+)"/);
      throw { type: 'AuthRequired', authFactorToken: match?.[1] };
    }
    throw e;
  }
}

// Helper to compute SHA-256 hash of a string
async function computeHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Save score to AT Protocol ledger
export async function saveScore(did: string, gameNumber: number, score: number, guesses: ServerGuess[]) {
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
  if (!agent.session?.did) throw new Error('Not logged in')

  try {
    await agent.com.atproto.repo.createRecord({
      repo: agent.session.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: text,
        createdAt: new Date().toISOString(),
        langs: ['en']
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
      await agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text: text,
          createdAt: new Date().toISOString(),
          langs: ['en']
        },
      })
    } else {
      throw e
    }
  }
}

/**
 * Restore saved session from localStorage and hydrate agent.
 * Returns DID if found, else null.
 */
export function restoreSession(): string | null {
  const raw = localStorage.getItem('skyrdleSession');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    agent.session = session;
    return session.did;
  } catch {
    localStorage.removeItem('skyrdleSession');
    return null;
  }
}
