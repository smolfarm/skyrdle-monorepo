import type { Evaluation } from '@/utils/evaluate-guess'

// Always hit production API
const API_BASE_URL = 'https://skyrdle.com'

export interface ServerGuess {
  letters: string[]
  evaluation: Evaluation[]
}

export type GameStatus = 'Playing' | 'Won' | 'Lost'

export interface GameResponse {
  guesses: ServerGuess[]
  status: GameStatus
  gameNumber: number
  targetWord?: string
}

export interface StatsResponse {
  currentStreak: number
  gamesWon: number
  averageScore: number
}

export interface LeaderboardEntry {
  did: string
  handle: string
  currentStreak: number
  gamesWon: number
  averageScore: number
}

export interface GameStatsResponse {
  gamesWon: number
  gamesLost: number
  avgScore: number
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      errorData.error || `HTTP ${response.status}`,
      response.status
    )
  }

  return response.json()
}

/**
 * Get the current game for a user
 */
export async function getGame(did: string): Promise<GameResponse> {
  return fetchJson<GameResponse>(
    `${API_BASE_URL}/api/game?did=${encodeURIComponent(did)}`
  )
}

/**
 * Get a specific game by number
 */
export async function getGameByNumber(
  did: string,
  gameNumber: number
): Promise<GameResponse> {
  return fetchJson<GameResponse>(
    `${API_BASE_URL}/api/game/${gameNumber}?did=${encodeURIComponent(did)}`
  )
}

/**
 * Submit a guess for a game
 */
export async function submitGuess(
  did: string,
  guess: string,
  gameNumber: number
): Promise<GameResponse> {
  return fetchJson<GameResponse>(`${API_BASE_URL}/api/guess`, {
    method: 'POST',
    body: JSON.stringify({ did, guess, gameNumber }),
  })
}

/**
 * Get player stats
 */
export async function getStats(did: string): Promise<StatsResponse> {
  return fetchJson<StatsResponse>(
    `${API_BASE_URL}/api/stats?did=${encodeURIComponent(did)}`
  )
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetchJson<LeaderboardEntry[]>(`${API_BASE_URL}/api/leaderboard`)
}

/**
 * Get stats for a specific game
 */
export async function getGameStats(
  gameNumber: number
): Promise<GameStatsResponse> {
  return fetchJson<GameStatsResponse>(
    `${API_BASE_URL}/api/game/${gameNumber}/stats`
  )
}

// ============================================
// Custom Game API Functions
// ============================================

export interface CustomGameResponse {
  customGameId: string
  creatorDid: string
  guesses: ServerGuess[]
  status: GameStatus
  targetWord?: string
}

export interface CreateCustomGameResponse {
  customGameId: string
  shareUrl: string
}

export interface ValidateWordResponse {
  valid: boolean
  reason: string | null
}

/**
 * Validate if a word can be used for a custom game
 */
export async function validateWord(word: string): Promise<ValidateWordResponse> {
  return fetchJson<ValidateWordResponse>(
    `${API_BASE_URL}/api/validate-word?word=${encodeURIComponent(word)}`
  )
}

/**
 * Create a new custom game
 */
export async function createCustomGame(
  did: string,
  word: string
): Promise<CreateCustomGameResponse> {
  return fetchJson<CreateCustomGameResponse>(`${API_BASE_URL}/api/custom-game`, {
    method: 'POST',
    body: JSON.stringify({ did, word }),
  })
}

/**
 * Get a custom game state
 */
export async function getCustomGame(
  customGameId: string,
  did: string
): Promise<CustomGameResponse> {
  return fetchJson<CustomGameResponse>(
    `${API_BASE_URL}/api/custom-game/${customGameId}?did=${encodeURIComponent(did)}`
  )
}

/**
 * Submit a guess for a custom game
 */
export async function submitCustomGameGuess(
  customGameId: string,
  did: string,
  guess: string
): Promise<CustomGameResponse> {
  return fetchJson<CustomGameResponse>(
    `${API_BASE_URL}/api/custom-game/${customGameId}/guess`,
    {
      method: 'POST',
      body: JSON.stringify({ did, guess }),
    }
  )
}

export { ApiError }
