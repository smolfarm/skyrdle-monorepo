import { describe, it, expect } from 'vitest'
import { evaluateGuess } from '../../src/utils/evaluateGuess'

describe('evaluateGuess - Wordle Logic', () => {
  describe('Exact matches (all correct)', () => {
    it('returns all correct when guess matches target exactly', () => {
      const result = evaluateGuess('SPACE', 'SPACE')
      expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
    })

    it('handles case insensitivity', () => {
      const result = evaluateGuess('space', 'SPACE')
      expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
    })

    it('returns partial correct letters', () => {
      const result = evaluateGuess('SMART', 'SPACE')
      expect(result).toEqual(['correct', 'absent', 'correct', 'absent', 'absent'])
    })
  })

  describe('Duplicate letter handling (CRITICAL)', () => {
    it('handles guess with duplicate when target has single - first occurrence correct', () => {
      // Guess: SPEED, Target: SPACE
      // S-correct, P-correct, E-present (E exists at position 4), E-absent (already used), D-absent
      const result = evaluateGuess('SPEED', 'SPACE')
      expect(result).toEqual(['correct', 'correct', 'present', 'absent', 'absent'])
    })

    it('handles guess with duplicate when target has single - first occurrence present', () => {
      // Guess: STEEL, Target: SPACE
      // S-correct, T-absent, E-present (E exists but not in position 2), E-absent, L-absent
      const result = evaluateGuess('STEEL', 'SPACE')
      expect(result).toEqual(['correct', 'absent', 'present', 'absent', 'absent'])
    })

    it('handles target with duplicate when guess has single', () => {
      // Guess: SPACE, Target: SPEED
      // S-correct, P-correct, A-absent, C-absent, E-present (one E in SPEED at position 2)
      const result = evaluateGuess('SPACE', 'SPEED')
      expect(result).toEqual(['correct', 'correct', 'absent', 'absent', 'present'])
    })

    it('handles both guess and target with duplicates in different positions', () => {
      // Guess: SPREE, Target: SPEED
      // S-correct, P-correct, R-absent, E-correct, E-present (second E matches, third E is extra)
      const result = evaluateGuess('SPREE', 'SPEED')
      expect(result).toEqual(['correct', 'correct', 'absent', 'correct', 'present'])
    })

    it('handles all same letters', () => {
      // Guess: AAAAA, Target: AAAAA
      const result = evaluateGuess('AAAAA', 'AAAAA')
      expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
    })

    it('handles duplicate letters all absent', () => {
      // Guess: AAAAA, Target: SPACE
      // A(2) matches position 2, so first A is absent (not present, because the only A was already matched)
      const result = evaluateGuess('AAAAA', 'SPACE')
      expect(result).toEqual(['absent', 'absent', 'correct', 'absent', 'absent'])
    })

    it('handles complex duplicate scenario - MAMMA', () => {
      // Guess: MAMMA, Target: MAMMA
      const result = evaluateGuess('MAMMA', 'MAMMA')
      expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
    })

    it('handles duplicate with one correct, one present', () => {
      // Guess: LLAMA, Target: LABEL
      // L(0)-correct, L(1)-present (second L exists at pos 4), A(2)-present (A exists at pos 1), M-absent, A(4)-absent
      const result = evaluateGuess('LLAMA', 'LABEL')
      expect(result).toEqual(['correct', 'present', 'present', 'absent', 'absent'])
    })
  })

  describe('Present letters (wrong position)', () => {
    it('marks letters as present when in wrong position', () => {
      // Guess: APPLE, Target: PLEAS
      // A-present (at pos 3), P-present (at pos 0), P-absent (already used), L-present (at pos 1), E-present (at pos 2)
      const result = evaluateGuess('APPLE', 'PLEAS')
      expect(result).toEqual(['present', 'present', 'absent', 'present', 'present'])
    })

    it('handles all present letters', () => {
      // Guess: ABCDE, Target: EDBCA
      // All letters present but in wrong positions
      const result = evaluateGuess('ABCDE', 'EDBCA')
      expect(result).toEqual(['present', 'present', 'present', 'present', 'present'])
    })
  })

  describe('Absent letters', () => {
    it('marks letters as absent when not in target', () => {
      // Guess: FGHIJ, Target: SPACE
      const result = evaluateGuess('FGHIJ', 'SPACE')
      expect(result).toEqual(['absent', 'absent', 'absent', 'absent', 'absent'])
    })

    it('handles mix of correct, present, and absent', () => {
      // Guess: STARE, Target: SPACE
      // S(0)-correct, T-absent, A(2)-correct, R-absent, E(4)-correct
      const result = evaluateGuess('STARE', 'SPACE')
      expect(result).toEqual(['correct', 'absent', 'correct', 'absent', 'correct'])
    })
  })

  describe('Real-world game scenarios', () => {
    it('handles typical first guess', () => {
      // Common first guess: STARE vs random target
      const result = evaluateGuess('STARE', 'WORDY')
      expect(result).toEqual(['absent', 'absent', 'absent', 'present', 'absent'])
    })

    it('handles no matching letters', () => {
      // Guess: GHOST, Target: PLANE
      const result = evaluateGuess('GHOST', 'PLANE')
      expect(result).toEqual(['absent', 'absent', 'absent', 'absent', 'absent'])
    })

    it('handles winning guess', () => {
      const result = evaluateGuess('PLANE', 'PLANE')
      expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
    })

    it('handles near-win scenario', () => {
      // Guess: PLAIN, Target: PLANE
      // Only last letter different
      const result = evaluateGuess('PLAIN', 'PLANE')
      expect(result).toEqual(['correct', 'correct', 'correct', 'absent', 'present'])
    })
  })

  describe('Edge cases', () => {
    it('handles empty-like input gracefully', () => {
      const result = evaluateGuess('     ', '     ')
      expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
    })

    it('returns array of correct length', () => {
      const result = evaluateGuess('SPACE', 'WORDY')
      expect(result).toHaveLength(5)
    })

    it('all elements are valid evaluation types', () => {
      const result = evaluateGuess('STARE', 'SPACE')
      result.forEach(evaluation => {
        expect(['correct', 'present', 'absent']).toContain(evaluation)
      })
    })
  })
})
