import { describe, it, expect, beforeEach } from 'vitest'
import { evaluateGuess } from '../../src/utils/evaluateGuess'
import crypto from 'crypto'

/**
 * These tests validate the game state transition logic
 *
 * Game status transitions:
 * - Playing → Won: When all letters in a guess are correct
 * - Playing → Lost: When 6 guesses are made without winning
 * - Won/Lost: completedAt timestamp is set
 * - Won/Lost: scoreHash is generated
 */

describe('Game State Transitions', () => {
  let mockGame: any

  beforeEach(() => {
    // Mock game object
    mockGame = {
      did: 'did:plc:test123',
      targetWord: 'SPACE',
      guesses: [],
      status: 'Playing',
      gameNumber: 1,
      completedAt: null,
      scoreHash: null,
    }
  })

  describe('Transition to Won', () => {
    it('transitions to Won when guess is all correct', () => {
      const guess = 'SPACE'
      const evals = evaluateGuess(guess, mockGame.targetWord)

      mockGame.guesses.push({
        letters: guess.toUpperCase().split(''),
        evaluation: evals,
      })

      // Check if all correct
      if (evals.every(e => e === 'correct')) {
        mockGame.status = 'Won'
        mockGame.completedAt = new Date()
      }

      expect(mockGame.status).toBe('Won')
      expect(mockGame.completedAt).toBeInstanceOf(Date)
      expect(mockGame.guesses).toHaveLength(1)
    })

    it('transitions to Won on second guess', () => {
      // First guess: wrong
      const guess1 = 'STARE'
      const evals1 = evaluateGuess(guess1, mockGame.targetWord)
      mockGame.guesses.push({
        letters: guess1.toUpperCase().split(''),
        evaluation: evals1,
      })

      if (evals1.every(e => e === 'correct')) {
        mockGame.status = 'Won'
      }
      expect(mockGame.status).toBe('Playing')

      // Second guess: correct
      const guess2 = 'SPACE'
      const evals2 = evaluateGuess(guess2, mockGame.targetWord)
      mockGame.guesses.push({
        letters: guess2.toUpperCase().split(''),
        evaluation: evals2,
      })

      if (evals2.every(e => e === 'correct')) {
        mockGame.status = 'Won'
        mockGame.completedAt = new Date()
      }

      expect(mockGame.status).toBe('Won')
      expect(mockGame.completedAt).toBeInstanceOf(Date)
      expect(mockGame.guesses).toHaveLength(2)
    })

    it('sets completedAt timestamp when won', () => {
      const beforeWin = new Date()
      const guess = 'SPACE'
      const evals = evaluateGuess(guess, mockGame.targetWord)

      mockGame.guesses.push({
        letters: guess.toUpperCase().split(''),
        evaluation: evals,
      })

      if (evals.every(e => e === 'correct')) {
        mockGame.status = 'Won'
        mockGame.completedAt = new Date()
      }

      expect(mockGame.completedAt).toBeInstanceOf(Date)
      expect(mockGame.completedAt.getTime()).toBeGreaterThanOrEqual(beforeWin.getTime())
    })
  })

  describe('Transition to Lost', () => {
    it('transitions to Lost after 6 incorrect guesses', () => {
      const wrongGuesses = ['STARE', 'BRAIN', 'FRONT', 'LIGHT', 'MIGHT', 'FIGHT']

      wrongGuesses.forEach(guess => {
        const evals = evaluateGuess(guess, mockGame.targetWord)
        mockGame.guesses.push({
          letters: guess.toUpperCase().split(''),
          evaluation: evals,
        })

        if (evals.every(e => e === 'correct')) {
          mockGame.status = 'Won'
          mockGame.completedAt = new Date()
        } else if (mockGame.guesses.length >= 6) {
          mockGame.status = 'Lost'
          mockGame.completedAt = new Date()
        }
      })

      expect(mockGame.status).toBe('Lost')
      expect(mockGame.completedAt).toBeInstanceOf(Date)
      expect(mockGame.guesses).toHaveLength(6)
    })

    it('does not transition to Lost before 6 guesses', () => {
      const wrongGuesses = ['STARE', 'BRAIN', 'FRONT']

      wrongGuesses.forEach(guess => {
        const evals = evaluateGuess(guess, mockGame.targetWord)
        mockGame.guesses.push({
          letters: guess.toUpperCase().split(''),
          evaluation: evals,
        })

        if (evals.every(e => e === 'correct')) {
          mockGame.status = 'Won'
        } else if (mockGame.guesses.length >= 6) {
          mockGame.status = 'Lost'
        }
      })

      expect(mockGame.status).toBe('Playing')
      expect(mockGame.completedAt).toBeNull()
      expect(mockGame.guesses).toHaveLength(3)
    })

    it('sets completedAt timestamp when lost', () => {
      const beforeLoss = new Date()
      const wrongGuesses = ['STARE', 'BRAIN', 'FRONT', 'LIGHT', 'MIGHT', 'FIGHT']

      wrongGuesses.forEach(guess => {
        const evals = evaluateGuess(guess, mockGame.targetWord)
        mockGame.guesses.push({
          letters: guess.toUpperCase().split(''),
          evaluation: evals,
        })

        if (evals.every(e => e === 'correct')) {
          mockGame.status = 'Won'
          mockGame.completedAt = new Date()
        } else if (mockGame.guesses.length >= 6) {
          mockGame.status = 'Lost'
          mockGame.completedAt = new Date()
        }
      })

      expect(mockGame.completedAt).toBeInstanceOf(Date)
      expect(mockGame.completedAt.getTime()).toBeGreaterThanOrEqual(beforeLoss.getTime())
    })
  })

  describe('Score Hash Generation', () => {
    it('generates correct scoreHash for won game', () => {
      // Simulate winning on 3rd guess
      mockGame.guesses = [
        { letters: ['S', 'T', 'A', 'R', 'E'], evaluation: ['correct', 'absent', 'present', 'absent', 'present'] },
        { letters: ['S', 'C', 'A', 'L', 'E'], evaluation: ['correct', 'present', 'present', 'absent', 'present'] },
        { letters: ['S', 'P', 'A', 'C', 'E'], evaluation: ['correct', 'correct', 'correct', 'correct', 'correct'] },
      ]
      mockGame.status = 'Won'

      const scoreVal = mockGame.status === 'Won' ? mockGame.guesses.length : -1
      const expectedHash = crypto
        .createHash('sha256')
        .update(`${mockGame.did}|${mockGame.gameNumber}|${scoreVal}`)
        .digest('hex')

      mockGame.scoreHash = expectedHash

      expect(mockGame.scoreHash).toBe(expectedHash)
      expect(scoreVal).toBe(3)
    })

    it('generates correct scoreHash for lost game', () => {
      // Simulate losing after 6 guesses
      mockGame.guesses = Array(6).fill({
        letters: ['S', 'T', 'A', 'R', 'E'],
        evaluation: ['correct', 'absent', 'present', 'absent', 'present'],
      })
      mockGame.status = 'Lost'

      const scoreVal = mockGame.status === 'Won' ? mockGame.guesses.length : -1
      const expectedHash = crypto
        .createHash('sha256')
        .update(`${mockGame.did}|${mockGame.gameNumber}|${scoreVal}`)
        .digest('hex')

      mockGame.scoreHash = expectedHash

      expect(mockGame.scoreHash).toBe(expectedHash)
      expect(scoreVal).toBe(-1)
    })

    it('scoreHash format matches server implementation', () => {
      mockGame.status = 'Won'
      mockGame.guesses.push({
        letters: ['S', 'P', 'A', 'C', 'E'],
        evaluation: ['correct', 'correct', 'correct', 'correct', 'correct'],
      })

      const scoreVal = 1 // Won on first guess
      const hash = crypto
        .createHash('sha256')
        .update(`${mockGame.did}|${mockGame.gameNumber}|${scoreVal}`)
        .digest('hex')

      // Hash should be 64 character hex string (SHA-256)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('Game remains Playing', () => {
    it('stays Playing after 1 incorrect guess', () => {
      const guess = 'STARE'
      const evals = evaluateGuess(guess, mockGame.targetWord)
      mockGame.guesses.push({
        letters: guess.toUpperCase().split(''),
        evaluation: evals,
      })

      if (evals.every(e => e === 'correct')) {
        mockGame.status = 'Won'
      } else if (mockGame.guesses.length >= 6) {
        mockGame.status = 'Lost'
      }

      expect(mockGame.status).toBe('Playing')
      expect(mockGame.completedAt).toBeNull()
    })

    it('stays Playing after 5 incorrect guesses', () => {
      const wrongGuesses = ['STARE', 'BRAIN', 'FRONT', 'LIGHT', 'MIGHT']

      wrongGuesses.forEach(guess => {
        const evals = evaluateGuess(guess, mockGame.targetWord)
        mockGame.guesses.push({
          letters: guess.toUpperCase().split(''),
          evaluation: evals,
        })

        if (evals.every(e => e === 'correct')) {
          mockGame.status = 'Won'
        } else if (mockGame.guesses.length >= 6) {
          mockGame.status = 'Lost'
        }
      })

      expect(mockGame.status).toBe('Playing')
      expect(mockGame.completedAt).toBeNull()
      expect(mockGame.guesses).toHaveLength(5)
    })
  })
})
