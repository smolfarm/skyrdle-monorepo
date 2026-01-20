import React, { createContext, useContext, useCallback, useState } from 'react'
import {
  getCustomGame,
  submitCustomGameGuess,
  createCustomGame as apiCreateCustomGame,
  validateWord as apiValidateWord,
  GameStatus,
  ServerGuess,
} from '@/services/api'
import { calculateKeyboardStatus, KeyStatus } from '@/utils/keyboard-utils'

const WORD_LENGTH = 5
const MAX_GUESSES = 6

interface CustomGameContextType {
  // Game state
  customGameId: string | null
  creatorDid: string | null
  guesses: ServerGuess[]
  currentGuess: string
  status: GameStatus
  targetWord: string | null // Only available after game ends
  keyboardStatus: Record<string, KeyStatus>
  isLoading: boolean
  error: string | null
  shareUrl: string | null

  // Actions
  loadCustomGame: (customGameId: string, did: string) => Promise<void>
  addLetter: (letter: string) => void
  deleteLetter: () => void
  submitGuess: (did: string) => Promise<void>
  createCustomGame: (did: string, word: string) => Promise<{ customGameId: string; shareUrl: string } | null>
  validateWord: (word: string) => Promise<{ valid: boolean; reason: string | null }>
  clearCustomGame: () => void
  clearError: () => void
}

const CustomGameContext = createContext<CustomGameContextType | undefined>(undefined)

export function CustomGameProvider({ children }: { children: React.ReactNode }) {
  const [customGameId, setCustomGameId] = useState<string | null>(null)
  const [creatorDid, setCreatorDid] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<ServerGuess[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [status, setStatus] = useState<GameStatus>('Playing')
  const [targetWord, setTargetWord] = useState<string | null>(null)
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, KeyStatus>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const updateKeyboardStatus = useCallback((newGuesses: ServerGuess[]) => {
    setKeyboardStatus(calculateKeyboardStatus(newGuesses))
  }, [])

  const loadCustomGame = useCallback(
    async (gameId: string, did: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getCustomGame(gameId, did)
        setCustomGameId(response.customGameId)
        setCreatorDid(response.creatorDid)
        setGuesses(response.guesses)
        setStatus(response.status)
        setTargetWord(response.targetWord || null)
        setCurrentGuess('')
        setShareUrl(`https://skyrdle.com/c/${gameId}`)
        updateKeyboardStatus(response.guesses)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load custom game'
        setError(message)
        console.error('[CustomGameContext] Error loading game:', err)
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
      if (!customGameId) return
      if (currentGuess.length !== WORD_LENGTH) {
        setError('Word must be 5 letters')
        return
      }
      if (guesses.length >= MAX_GUESSES) return

      setIsLoading(true)
      setError(null)
      try {
        const response = await submitCustomGameGuess(customGameId, did, currentGuess)
        setGuesses(response.guesses)
        setStatus(response.status)
        setTargetWord(response.targetWord || null)
        setCurrentGuess('')
        updateKeyboardStatus(response.guesses)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit guess'
        setError(message)
        console.error('[CustomGameContext] Error submitting guess:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [status, customGameId, currentGuess, guesses.length, updateKeyboardStatus]
  )

  const createCustomGame = useCallback(
    async (did: string, word: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiCreateCustomGame(did, word)
        setShareUrl(response.shareUrl)
        return response
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create custom game'
        setError(message)
        console.error('[CustomGameContext] Error creating game:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const validateWord = useCallback(
    async (word: string) => {
      try {
        return await apiValidateWord(word)
      } catch (err) {
        console.error('[CustomGameContext] Error validating word:', err)
        return { valid: false, reason: 'Failed to validate word' }
      }
    },
    []
  )

  const clearCustomGame = useCallback(() => {
    setCustomGameId(null)
    setCreatorDid(null)
    setGuesses([])
    setCurrentGuess('')
    setStatus('Playing')
    setTargetWord(null)
    setKeyboardStatus({})
    setShareUrl(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: CustomGameContextType = {
    customGameId,
    creatorDid,
    guesses,
    currentGuess,
    status,
    targetWord,
    keyboardStatus,
    isLoading,
    error,
    shareUrl,
    loadCustomGame,
    addLetter,
    deleteLetter,
    submitGuess,
    createCustomGame,
    validateWord,
    clearCustomGame,
    clearError,
  }

  return <CustomGameContext.Provider value={value}>{children}</CustomGameContext.Provider>
}

export function useCustomGame(): CustomGameContextType {
  const context = useContext(CustomGameContext)
  if (context === undefined) {
    throw new Error('useCustomGame must be used within a CustomGameProvider')
  }
  return context
}

export { WORD_LENGTH, MAX_GUESSES }
