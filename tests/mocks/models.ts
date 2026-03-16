import { vi } from 'vitest'

function createSaveableDoc(data: Record<string, any>) {
  const doc: Record<string, any> = {
    ...data,
  }
  doc.save = vi.fn().mockImplementation(async () => doc)
  return doc
}

export function mockGameDoc(data: {
  did: string
  targetWord: string
  guesses?: { letters: string[]; evaluation: string[] }[]
  status?: string
  gameNumber: number
}) {
  const doc: Record<string, unknown> = {
    did: data.did,
    targetWord: data.targetWord,
    guesses: data.guesses ?? [],
    status: data.status ?? 'Playing',
    gameNumber: data.gameNumber,
  }
  doc.save = vi.fn().mockImplementation(async () => doc)
  return doc
}

export function createMockGameModel() {
  const instances: any[] = []

  const MockGame: any = vi.fn().mockImplementation((data: any) => {
    const doc = createSaveableDoc({
      ...data,
      guesses: data.guesses || [],
      status: data.status || 'Playing',
    })
    instances.push(doc)
    return doc
  })

  MockGame.findOne = vi.fn().mockResolvedValue(null)
  MockGame.find = vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  })
  MockGame._instances = instances

  return MockGame
}

function createChainableQuery(resolvedValue: any) {
  const query: any = {
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  }
  query.sort = vi.fn().mockReturnValue(query)
  query.limit = vi.fn().mockReturnValue(query)
  return query
}

export function createMockWordModel() {
  const MockWord: any = {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockImplementation(() => createChainableQuery([])),
  }
  return MockWord
}

export function createMockPlayerModel() {
  const MockPlayer: any = {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    }),
  }
  return MockPlayer
}
