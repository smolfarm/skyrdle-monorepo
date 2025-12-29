import { describe, it, expect } from 'vitest'
import { calculateKeyboardStatus } from '../../src/utils/keyboardUtils'
import { createMockGuess } from '../helpers/factories'
import type { ServerGuess } from '../../src/atproto'

/**
 * Tests for keyboard status calculation
 * Tests the complex priority logic: correct > present > default > absent
 *
 * Key rules:
 * - A letter marked 'correct' stays correct even if later marked absent
 * - A letter marked 'present' doesn't override 'correct'
 * - A letter marked 'absent' only applies if not already correct or present
 */

describe('calculateKeyboardStatus', () => {
  describe('Empty state', () => {
    it('returns empty object for no guesses', () => {
      const result = calculateKeyboardStatus([])
      expect(result).toEqual({})
    })
  })

  describe('Single guess scenarios', () => {
    it('marks all correct letters', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'correct', 'correct', 'correct', 'correct'])
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.S).toBe('correct')
      expect(result.P).toBe('correct')
      expect(result.A).toBe('correct')
      expect(result.C).toBe('correct')
      expect(result.E).toBe('correct')
    })

    it('marks all absent letters', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['absent', 'absent', 'absent', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.S).toBe('absent')
      expect(result.T).toBe('absent')
      expect(result.A).toBe('absent')
      expect(result.R).toBe('absent')
      expect(result.E).toBe('absent')
    })

    it('marks all present letters', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['present', 'present', 'present', 'present', 'present'])
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.S).toBe('present')
      expect(result.P).toBe('present')
      expect(result.A).toBe('present')
      expect(result.C).toBe('present')
      expect(result.E).toBe('present')
    })

    it('handles mixed evaluations correctly', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['correct', 'absent', 'present', 'absent', 'present'])
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.S).toBe('correct')
      expect(result.T).toBe('absent')
      expect(result.A).toBe('present')
      expect(result.R).toBe('absent')
      expect(result.E).toBe('present')
    })
  })

  describe('Priority rules: correct > present > absent', () => {
    it('correct status overrides later absent', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'absent', 'absent', 'absent', 'absent']),
        createMockGuess(['S', 'T', 'A', 'R', 'T'], ['absent', 'absent', 'absent', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // S was correct in first guess, should stay correct even though absent in second
      expect(result.S).toBe('correct')
      expect(result.T).toBe('absent')
    })

    it('correct status overrides later present', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'absent', 'absent', 'absent', 'absent']),
        createMockGuess(['T', 'S', 'A', 'R', 'E'], ['absent', 'present', 'absent', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // S was correct in first guess, should stay correct even though present in second
      expect(result.S).toBe('correct')
    })

    it('present status overrides later absent', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['absent', 'absent', 'present', 'absent', 'absent']),
        createMockGuess(['F', 'R', 'A', 'M', 'E'], ['absent', 'absent', 'absent', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // A was present in first guess, should stay present even though absent in second
      expect(result.A).toBe('present')
    })

    it('present does not override earlier correct', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'absent', 'absent', 'absent', 'absent']),
        createMockGuess(['T', 'R', 'A', 'S', 'H'], ['absent', 'absent', 'absent', 'present', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // S was correct in first guess, should remain correct (not downgrade to present)
      expect(result.S).toBe('correct')
    })

    it('absent does not override earlier present', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['absent', 'absent', 'present', 'absent', 'absent']),
        createMockGuess(['F', 'R', 'A', 'M', 'E'], ['absent', 'absent', 'absent', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // A was present in first guess, should not change to absent
      expect(result.A).toBe('present')
    })

    it('absent does not override earlier correct', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'absent', 'absent', 'absent', 'absent']),
        createMockGuess(['F', 'S', 'A', 'R', 'E'], ['absent', 'absent', 'absent', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // S was correct in first guess, should stay correct
      expect(result.S).toBe('correct')
    })
  })

  describe('Multiple guesses with same letter', () => {
    it('handles letter appearing in multiple guesses with different states', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['correct', 'absent', 'absent', 'absent', 'absent']),
        createMockGuess(['S', 'M', 'A', 'L', 'L'], ['correct', 'absent', 'present', 'absent', 'absent']),
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'present', 'correct', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.S).toBe('correct') // Correct in all
      expect(result.A).toBe('correct') // Upgraded from absent to present to correct
      expect(result.P).toBe('present') // Present in last guess
    })

    it('tracks letter status progression correctly', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['E', 'A', 'R', 'T', 'H'], ['absent', 'absent', 'absent', 'absent', 'absent']),
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['absent', 'absent', 'present', 'absent', 'present']),
        createMockGuess(['P', 'L', 'A', 'C', 'E'], ['absent', 'absent', 'correct', 'correct', 'correct'])
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.E).toBe('correct') // absent -> present -> correct
      expect(result.A).toBe('correct') // absent -> present -> correct
      expect(result.C).toBe('correct') // absent -> correct
    })
  })

  describe('Real-world gameplay scenarios', () => {
    it('handles typical game progression for target SPACE', () => {
      // Simulating guesses against target "SPACE"
      const guesses: ServerGuess[] = [
        // Guess 1: STARE
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['correct', 'absent', 'present', 'absent', 'present']),
        // Guess 2: SCALE
        createMockGuess(['S', 'C', 'A', 'L', 'E'], ['correct', 'present', 'present', 'absent', 'present']),
        // Guess 3: SPACE (win)
        createMockGuess(['S', 'P', 'A', 'C', 'E'], ['correct', 'correct', 'correct', 'correct', 'correct'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // Final states after all guesses
      expect(result.S).toBe('correct')
      expect(result.P).toBe('correct')
      expect(result.A).toBe('correct')
      expect(result.C).toBe('correct')
      expect(result.E).toBe('correct')
      expect(result.T).toBe('absent')
      expect(result.R).toBe('absent')
      expect(result.L).toBe('absent')
    })

    it('handles complex scenario with letters in multiple positions', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'P', 'E', 'E', 'D'], ['correct', 'correct', 'correct', 'absent', 'absent']),
        createMockGuess(['S', 'P', 'E', 'L', 'L'], ['correct', 'correct', 'correct', 'absent', 'absent']),
      ]

      const result = calculateKeyboardStatus(guesses)

      expect(result.S).toBe('correct')
      expect(result.P).toBe('correct')
      expect(result.E).toBe('correct')
      expect(result.D).toBe('absent')
      expect(result.L).toBe('absent')
    })
  })

  describe('Edge cases', () => {
    it('handles all 26 letters', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['A', 'B', 'C', 'D', 'E'], ['correct', 'present', 'absent', 'correct', 'present']),
        createMockGuess(['F', 'G', 'H', 'I', 'J'], ['absent', 'correct', 'present', 'absent', 'correct']),
        createMockGuess(['K', 'L', 'M', 'N', 'O'], ['present', 'absent', 'correct', 'present', 'absent']),
        createMockGuess(['P', 'Q', 'R', 'S', 'T'], ['correct', 'absent', 'present', 'correct', 'absent']),
        createMockGuess(['U', 'V', 'W', 'X', 'Y'], ['present', 'correct', 'absent', 'present', 'correct']),
        createMockGuess(['Z', 'A', 'B', 'C', 'D'], ['absent', 'correct', 'present', 'absent', 'correct']),
      ]

      const result = calculateKeyboardStatus(guesses)

      // Verify all letters have a status
      expect(Object.keys(result).length).toBeGreaterThan(0)

      // Verify specific statuses based on priority rules
      expect(result.A).toBe('correct') // correct overrides later
      expect(result.Z).toBe('absent')
    })

    it('handles duplicate letters in same guess', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['L', 'L', 'A', 'M', 'A'], ['correct', 'present', 'correct', 'absent', 'absent'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // L appears twice: first is correct, second is present
      // Should be marked as correct (highest priority)
      expect(result.L).toBe('correct')

      // A appears twice: both correct
      expect(result.A).toBe('correct')
    })

    it('returns only letters that have been guessed', () => {
      const guesses: ServerGuess[] = [
        createMockGuess(['S', 'T', 'A', 'R', 'E'], ['correct', 'absent', 'present', 'absent', 'present'])
      ]

      const result = calculateKeyboardStatus(guesses)

      // Only S, T, A, R, E should be in the result
      expect(Object.keys(result).sort()).toEqual(['A', 'E', 'R', 'S', 'T'])
    })
  })
})
