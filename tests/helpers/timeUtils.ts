import { vi } from 'vitest'

/**
 * Mock the current date to a specific Eastern time
 * This is useful for testing game number calculations
 */
export function mockEasternDate(dateStr: string) {
  const date = new Date(dateStr)
  if (vi && typeof vi.useFakeTimers === 'function') {
    vi.useFakeTimers()
    vi.setSystemTime(date)
  }
  return date
}

/**
 * Reset date mocking and return to real time
 */
export function resetDateMock() {
  if (vi && typeof vi.useRealTimers === 'function') {
    vi.useRealTimers()
  }
}

/**
 * Calculate the expected game number for a given date
 * Epoch: June 13, 2025 = Game #1
 */
export function getExpectedGameNumber(dateStr: string): number {
  const epochEastern = new Date('2025-06-13T00:00:00-05:00')
  const testDate = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const diff = Math.floor((testDate.getTime() - epochEastern.getTime()) / 86400000)
  return diff + 1
}

/**
 * Get a Date object in Eastern timezone from a date string
 */
export function getEasternDateFromString(dateStr: string): Date {
  return new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/New_York' }))
}
