import { describe, expect, it } from 'vitest'
import { GameStatus } from '../../src/utils/emojiGrid'
import { buildSharedGameShareText } from '../../src/utils/shareText'

describe('buildSharedGameShareText', () => {
  it('includes the title, score, and play link for a win', () => {
    const text = buildSharedGameShareText(
      'Orbit',
      'https://skyrdle.example.com/shared/abc123',
      [
        {
          letters: ['O', 'R', 'B', 'I', 'T'],
          evaluation: ['correct', 'correct', 'correct', 'correct', 'correct'],
        },
      ],
      GameStatus.Won,
    )

    expect(text).toContain('Skyrdle Shared: Orbit 1/6')
    expect(text).toContain('🟩🟩🟩🟩🟩')
    expect(text).toContain('Play: https://skyrdle.example.com/shared/abc123')
  })

  it('uses X/6 for a loss', () => {
    const text = buildSharedGameShareText(
      'Orbit',
      'https://skyrdle.example.com/shared/abc123',
      [
        {
          letters: ['S', 'L', 'A', 'T', 'E'],
          evaluation: ['absent', 'present', 'absent', 'present', 'absent'],
        },
      ],
      GameStatus.Lost,
    )

    expect(text).toContain('Skyrdle Shared: Orbit X/6')
    expect(text).toContain('⬛🟨⬛🟨⬛')
  })
})
