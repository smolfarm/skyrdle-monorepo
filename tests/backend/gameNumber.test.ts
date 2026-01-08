import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { epochEastern, getEasternDate, calculateGameNumber, getTargetWordForGameNumber } from '../../src/utils/dateUtils'
import { mockEasternDate, resetDateMock } from '../helpers/timeUtils'

/**
 * Tests for game number calculation
 * Validates epoch-based game numbering in Eastern timezone
 * Epoch: June 13, 2025 midnight Eastern = Game #1
 */

describe('Game Number Calculation', () => {
  afterEach(() => {
    resetDateMock()
  })

  describe('epochEastern constant', () => {
    it('is set to June 13, 2025 midnight Eastern', () => {
      expect(epochEastern).toBeInstanceOf(Date)
      expect(epochEastern.toISOString()).toContain('2025-06-13')
    })
  })

  describe('getEasternDate', () => {
    it('returns a Date object', () => {
      const result = getEasternDate()
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('calculateGameNumber', () => {
    it('returns 1 for epoch day (June 13, 2025)', () => {
      const epochDay = new Date('2025-06-13T00:00:00-05:00')
      const gameNumber = calculateGameNumber(epochDay)
      expect(gameNumber).toBe(1)
    })

    it('returns 2 for June 14, 2025', () => {
      const nextDay = new Date('2025-06-14T00:00:00-05:00')
      const gameNumber = calculateGameNumber(nextDay)
      expect(gameNumber).toBe(2)
    })

    it('returns 3 for June 15, 2025', () => {
      const twoDaysLater = new Date('2025-06-15T00:00:00-05:00')
      const gameNumber = calculateGameNumber(twoDaysLater)
      expect(gameNumber).toBe(3)
    })

    it('returns correct game number for 1 week after epoch', () => {
      const oneWeekLater = new Date('2025-06-20T00:00:00-05:00')
      const gameNumber = calculateGameNumber(oneWeekLater)
      expect(gameNumber).toBe(8) // 7 days + 1 (epoch is day 1)
    })

    it('returns correct game number for 30 days after epoch', () => {
      const thirtyDaysLater = new Date('2025-07-13T00:00:00-05:00')
      const gameNumber = calculateGameNumber(thirtyDaysLater)
      expect(gameNumber).toBe(31)
    })

    it('handles midnight boundary correctly', () => {
      // Just before midnight on June 13
      const beforeMidnight = new Date('2025-06-13T23:59:59-05:00')
      const gameNumber1 = calculateGameNumber(beforeMidnight)
      expect(gameNumber1).toBe(1)

      // Just after midnight on June 14
      const afterMidnight = new Date('2025-06-14T00:00:01-05:00')
      const gameNumber2 = calculateGameNumber(afterMidnight)
      expect(gameNumber2).toBe(2)
    })

    it('handles Eastern timezone conversion correctly', () => {
      // Test at noon Eastern time
      const noonEastern = new Date('2025-06-14T12:00:00-05:00')
      const gameNumber = calculateGameNumber(noonEastern)
      expect(gameNumber).toBe(2)
    })
  })

  describe('getTargetWordForGameNumber', () => {
    const testWordList = ['APPLE', 'BRAVE', 'CRANE', 'DRIVE', 'EAGLE']

    it('returns first word for game number 1', () => {
      const word = getTargetWordForGameNumber(1, testWordList)
      expect(word).toBe('APPLE')
    })

    it('returns second word for game number 2', () => {
      const word = getTargetWordForGameNumber(2, testWordList)
      expect(word).toBe('BRAVE')
    })

    it('returns third word for game number 3', () => {
      const word = getTargetWordForGameNumber(3, testWordList)
      expect(word).toBe('CRANE')
    })

    it('cycles through word list correctly', () => {
      // Game 6 should cycle back to first word (6 % 5 = 1, but 0-indexed)
      const word = getTargetWordForGameNumber(6, testWordList)
      expect(word).toBe('APPLE')
    })

    it('handles game number 10 with word list of 5', () => {
      // Game 10: (10-1) % 5 = 9 % 5 = 4 -> EAGLE (index 4)
      const word = getTargetWordForGameNumber(10, testWordList)
      expect(word).toBe('EAGLE')
    })

    it('handles large game numbers', () => {
      const word = getTargetWordForGameNumber(1000, testWordList)
      // (1000-1) % 5 = 999 % 5 = 4 -> EAGLE
      expect(word).toBe('EAGLE')
    })

    it('throws error for empty word list', () => {
      expect(() => {
        getTargetWordForGameNumber(1, [])
      }).toThrow('Word list is empty')
    })

    it('handles word list with single word', () => {
      const singleWordList = ['SPACE']
      const word1 = getTargetWordForGameNumber(1, singleWordList)
      const word2 = getTargetWordForGameNumber(2, singleWordList)
      const word100 = getTargetWordForGameNumber(100, singleWordList)

      expect(word1).toBe('SPACE')
      expect(word2).toBe('SPACE')
      expect(word100).toBe('SPACE')
    })
  })

  describe('Integration: Date to Word', () => {
    const testWordList = ['APPLE', 'BRAVE', 'CRANE', 'DRIVE', 'EAGLE']

    it('returns correct word for epoch day', () => {
      const epochDay = new Date('2025-06-13T00:00:00-05:00')
      const gameNumber = calculateGameNumber(epochDay)
      const word = getTargetWordForGameNumber(gameNumber, testWordList)

      expect(gameNumber).toBe(1)
      expect(word).toBe('APPLE')
    })

    it('returns correct word for day after epoch', () => {
      const nextDay = new Date('2025-06-14T00:00:00-05:00')
      const gameNumber = calculateGameNumber(nextDay)
      const word = getTargetWordForGameNumber(gameNumber, testWordList)

      expect(gameNumber).toBe(2)
      expect(word).toBe('BRAVE')
    })

    it('handles full cycle through word list', () => {
      const dates = [
        new Date('2025-06-13T00:00:00-05:00'), // Game 1 -> APPLE
        new Date('2025-06-14T00:00:00-05:00'), // Game 2 -> BRAVE
        new Date('2025-06-15T00:00:00-05:00'), // Game 3 -> CRANE
        new Date('2025-06-16T00:00:00-05:00'), // Game 4 -> DRIVE
        new Date('2025-06-17T00:00:00-05:00'), // Game 5 -> EAGLE
        new Date('2025-06-18T00:00:00-05:00'), // Game 6 -> APPLE (cycle)
      ]

      const expectedWords = ['APPLE', 'BRAVE', 'CRANE', 'DRIVE', 'EAGLE', 'APPLE']

      dates.forEach((date, index) => {
        const gameNumber = calculateGameNumber(date)
        const word = getTargetWordForGameNumber(gameNumber, testWordList)
        expect(word).toBe(expectedWords[index])
        expect(gameNumber).toBe(index + 1)
      })
    })
  })

  describe('Future game validation', () => {
    it('correctly identifies current vs future games', () => {
      // Mock current date to June 15, 2025 (Game #3)
      const currentDate = new Date('2025-06-15T12:00:00-05:00')
      const currentGameNumber = calculateGameNumber(currentDate)

      expect(currentGameNumber).toBe(3)

      // Games 1-3 are valid (past/current)
      expect(1).toBeLessThanOrEqual(currentGameNumber)
      expect(2).toBeLessThanOrEqual(currentGameNumber)
      expect(3).toBeLessThanOrEqual(currentGameNumber)

      // Game 4 is future (invalid)
      expect(4).toBeGreaterThan(currentGameNumber)
    })
  })
})
