import { AtpAgent } from '@atproto/api'
import crypto from 'crypto'
import type { GameDocument, GameModel, Guess } from '../models/Game'

const PLAYER_SCORE_COLLECTION = 'farm.smol.games.skyrdle.player.score'
const SYNC_INTERVAL_MS = 3600000

const agent = new AtpAgent({
  service: 'https://bsky.social',
})

let isSyncRunning = false

function isAuthError(error: unknown, code: number | string) {
  if (!error || typeof error !== 'object') return false
  const value = code === 401 ? (error as { status?: unknown }).status : (error as { error?: unknown }).error
  return value === code
}

async function authenticateWithAtproto() {
  try {
    const identifier = process.env.ATPROTO_SERVER_HANDLE
    const password = process.env.ATPROTO_SERVER_APP_PASSWORD

    if (!identifier || !password) {
      console.error('Missing AT Protocol credentials in environment variables')
      console.error('Please set ATPROTO_SERVER_HANDLE and ATPROTO_SERVER_APP_PASSWORD')
      return false
    }

    console.log(`Attempting to authenticate as ${identifier}...`)
    const res = await agent.login({ identifier, password })
    console.log(`Successfully authenticated as ${res.data.handle} (${res.data.did})`)
    return true
  } catch (error) {
    if (isAuthError(error, 401)) {
      console.error('Authentication failed: Invalid credentials')
    } else {
      console.error('AT Protocol authentication error:', error)
    }
    return false
  }
}

function scoreForGame(game: Pick<GameDocument, 'status' | 'guesses'>) {
  return game.status === 'Won' ? game.guesses.length : -1
}

function scoreHash(did: string, gameNumber: number, score: number) {
  return crypto.createHash('sha256').update(`${did}|${gameNumber}|${score}`).digest('hex')
}

async function saveScoreToAtproto(did: string, gameNumber: number, score: number, guesses: Guess[]): Promise<boolean> {
  try {
    const recordHash = scoreHash(did, gameNumber, score)

    if (!agent.hasSession || !agent.did) {
      console.log('No valid session found, re-authenticating...')
      const authenticated = await authenticateWithAtproto()
      if (!authenticated || !agent.did) {
        throw new Error('Failed to authenticate with AT Protocol')
      }
    }

    console.log(`Saving score for ${did}, game ${gameNumber}: ${score}`)

    await agent.com.atproto.repo.createRecord({
      repo: agent.did,
      collection: PLAYER_SCORE_COLLECTION,
      rkey: recordHash,
      record: {
        playerDid: did,
        gameNumber,
        score,
        guesses,
        hash: recordHash,
      },
    })

    console.log(`Successfully saved score for ${did}, game ${gameNumber}`)
    return true
  } catch (error) {
    if (isAuthError(error, 'ExpiredToken') || isAuthError(error, 401)) {
      console.log('Authentication error, re-authenticating...')
      const authenticated = await authenticateWithAtproto()
      if (authenticated) {
        return saveScoreToAtproto(did, gameNumber, score, guesses)
      }
    }

    console.error(`Error saving score for ${did}, game ${gameNumber}:`, error)
    return false
  }
}

async function markExistingRecordSynced(game: GameDocument) {
  if (!agent.did) return false

  const score = scoreForGame(game)
  const recordHash = scoreHash(game.did, game.gameNumber, score)

  try {
    await agent.com.atproto.repo.getRecord({
      repo: agent.did,
      collection: PLAYER_SCORE_COLLECTION,
      rkey: recordHash,
    })
    console.log(`Record exists for ${game.did} game ${game.gameNumber}. Marking as synced.`)
    game.syncedToAtproto = true
    await game.save()
    return true
  } catch (error) {
    console.error(`Failed to find existing record for ${game.did} game ${game.gameNumber}:`, error)
    return false
  }
}

async function syncMongoToAtproto(Game: GameModel) {
  if (isSyncRunning) {
    console.log('Sync already in progress, skipping this run')
    return
  }

  isSyncRunning = true
  console.log(`Starting sync at ${new Date().toISOString()}`)

  try {
    const authSuccess = await authenticateWithAtproto()
    if (!authSuccess) {
      console.error('Failed to authenticate with AT Protocol. Aborting sync')
      return
    }

    const gamesToSync = await Game.find({
      status: { $in: ['Won', 'Lost'] },
      syncedToAtproto: { $ne: true },
    })

    console.log(`Found ${gamesToSync.length} games to sync`)

    let successCount = 0
    let failCount = 0

    for (const game of gamesToSync) {
      const score = scoreForGame(game)
      const syncSuccess = await saveScoreToAtproto(game.did, game.gameNumber, score, game.guesses)

      if (syncSuccess) {
        game.syncedToAtproto = true
        await game.save()
        console.log(`Successfully synced game ${game.gameNumber} for user ${game.did}`)
        successCount++
      } else if (await markExistingRecordSynced(game)) {
        successCount++
      } else {
        console.error(`Failed to sync game ${game.gameNumber} for user ${game.did}`)
        failCount++
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`Sync completed at ${new Date().toISOString()}`)
    console.log(`Summary: ${successCount} games synced successfully, ${failCount} failed`)
  } catch (error) {
    console.error('Error during sync process:', error)
  } finally {
    isSyncRunning = false
  }
}

export function initSync(gameModel: GameModel) {
  console.log('AT Protocol sync service initialized')
  return () => syncMongoToAtproto(gameModel)
}

export { SYNC_INTERVAL_MS }

export default {
  SYNC_INTERVAL_MS,
  initSync,
}
