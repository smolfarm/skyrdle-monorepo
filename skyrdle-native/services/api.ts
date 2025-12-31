import type { Evaluation } from '@/utils/evaluate-guess'

// API base URL - update for production
const API_BASE_URL = __DEV__
  ? 'http://localhost:4000'
  : 'https://skyrdle.com'

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

export { ApiError }
