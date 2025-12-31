import React, { createContext, useContext, useCallback, useState } from 'react'
import {
  getGame,
  getGameByNumber,
  submitGuess as apiSubmitGuess,
  GameStatus,
  ServerGuess,
} from '@/services/api'
import { calculateKeyboardStatus, KeyStatus } from '@/utils/keyboard-utils'
import { calculateGameNumber } from '@/utils/date-utils'

const WORD_LENGTH = 5
const MAX_GUESSES = 6

interface GameContextType {
  // Game state
  gameNumber: number
  maxGameNumber: number
  guesses: ServerGuess[]
  currentGuess: string
  status: GameStatus
  keyboardStatus: Record<string, KeyStatus>
  isLoading: boolean
  error: string | null

  // Actions
  fetchGame: (did: string, gameNumber?: number) => Promise<void>
  addLetter: (letter: string) => void
  deleteLetter: () => void
  submitGuess: (did: string) => Promise<void>
  navigateToPreviousGame: (did: string) => Promise<void>
  navigateToNextGame: (did: string) => Promise<void>
  navigateToCurrentGame: (did: string) => Promise<void>
  clearError: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameNumber, setGameNumber] = useState(calculateGameNumber())
  const [maxGameNumber] = useState(calculateGameNumber())
  const [guesses, setGuesses] = useState<ServerGuess[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [status, setStatus] = useState<GameStatus>('Playing')
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, KeyStatus>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateKeyboardStatus = useCallback((newGuesses: ServerGuess[]) => {
    setKeyboardStatus(calculateKeyboardStatus(newGuesses))
  }, [])

  const fetchGame = useCallback(
    async (did: string, targetGameNumber?: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = targetGameNumber
          ? await getGameByNumber(did, targetGameNumber)
          : await getGame(did)

        setGameNumber(response.gameNumber)
        setGuesses(response.guesses)
        setStatus(response.status)
        setCurrentGuess('')
        updateKeyboardStatus(response.guesses)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch game'
        setError(message)
        console.error('[GameContext] Error fetching game:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [updateKeyboardStatus]
  )

  const addLetter = useCallback(
    (letter: string) => {
      if (status !== 'Playing') return
      if (currentGuess.length >= WORD_LENGTH) return
      setCurrentGuess((prev) => prev + letter.toUpperCase())
    },
    [status, currentGuess.length]
  )

  const deleteLetter = useCallback(() => {
    if (status !== 'Playing') return
    setCurrentGuess((prev) => prev.slice(0, -1))
  }, [status])

  const submitGuess = useCallback(
    async (did: string) => {
      if (status !== 'Playing') return
      if (currentGuess.length !== WORD_LENGTH) {
        setError('Word must be 5 letters')
        return
      }
      if (guesses.length >= MAX_GUESSES) return

      setIsLoading(true)
      setError(null)
      try {
        const response = await apiSubmitGuess(did, currentGuess, gameNumber)
        setGuesses(response.guesses)
        setStatus(response.status)
        setCurrentGuess('')
        updateKeyboardStatus(response.guesses)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit guess'
        setError(message)
        console.error('[GameContext] Error submitting guess:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [status, currentGuess, guesses.length, gameNumber, updateKeyboardStatus]
  )

  const navigateToPreviousGame = useCallback(
    async (did: string) => {
      if (gameNumber > 1) {
        await fetchGame(did, gameNumber - 1)
      }
    },
    [gameNumber, fetchGame]
  )

  const navigateToNextGame = useCallback(
    async (did: string) => {
      if (gameNumber < maxGameNumber) {
        await fetchGame(did, gameNumber + 1)
      }
    },
    [gameNumber, maxGameNumber, fetchGame]
  )

  const navigateToCurrentGame = useCallback(
    async (did: string) => {
      await fetchGame(did, maxGameNumber)
    },
    [maxGameNumber, fetchGame]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: GameContextType = {
    gameNumber,
    maxGameNumber,
    guesses,
    currentGuess,
    status,
    keyboardStatus,
    isLoading,
    error,
    fetchGame,
    addLetter,
    deleteLetter,
    submitGuess,
    navigateToPreviousGame,
    navigateToNextGame,
    navigateToCurrentGame,
    clearError,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextType {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

export { WORD_LENGTH, MAX_GUESSES }
