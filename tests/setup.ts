import '@testing-library/jest-dom'
import { beforeEach, afterEach, vi } from 'vitest'

// Configure timezone to Eastern for consistent game number calculations
process.env.TZ = 'America/New_York'

// Global test setup - runs before each test
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
})

// Global test teardown - runs after each test
afterEach(() => {
  // Reset date mocks
  vi.useRealTimers()
})
