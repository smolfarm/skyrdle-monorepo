import { describe, expect, it } from 'vitest'
import { buildAppPath, parseAppRoute } from '../../src/utils/appRoutes'

describe('appRoutes', () => {
  it('parses the daily route', () => {
    expect(parseAppRoute('/')).toEqual({ kind: 'daily' })
    expect(parseAppRoute('/stats')).toEqual({ kind: 'daily' })
  })

  it('parses a shared game route', () => {
    expect(parseAppRoute('/shared/AbCd12')).toEqual({
      kind: 'shared',
      shareCode: 'abcd12',
    })
  })

  it('builds the correct path for each route', () => {
    expect(buildAppPath({ kind: 'daily' })).toBe('/')
    expect(buildAppPath({ kind: 'shared', shareCode: 'abc123' })).toBe('/shared/abc123')
  })
})
