import { FormEvent, useEffect, useMemo, useState } from 'react'

type SharedGameSummary = {
  shareCode: string
  title: string
  shareUrl: string
  createdAt: string
}

type CreateSharedGameModalProps = {
  did: string
  isSubmitting: boolean
  onClose: () => void
  onCreate: (payload: { title: string; targetWord: string }) => Promise<void>
  onPlay: (shareCode: string) => void
}

export default function CreateSharedGameModal({
  did,
  isSubmitting,
  onClose,
  onCreate,
  onPlay,
}: CreateSharedGameModalProps) {
  const [title, setTitle] = useState('')
  const [targetWord, setTargetWord] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showMyGames, setShowMyGames] = useState(false)
  const [myGames, setMyGames] = useState<SharedGameSummary[]>([])
  const [myGamesLoading, setMyGamesLoading] = useState(false)
  const [myGamesError, setMyGamesError] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const normalizedWord = useMemo(() => targetWord.trim().toUpperCase(), [targetWord])

  useEffect(() => {
    if (!showMyGames) return
    setMyGamesLoading(true)
    setMyGamesError(null)
    fetch(`/api/my-shared-games?did=${encodeURIComponent(did)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load games')
        return data as SharedGameSummary[]
      })
      .then(setMyGames)
      .catch((err) => setMyGamesError(err.message))
      .finally(() => setMyGamesLoading(false))
  }, [showMyGames, did])

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore
    }
  }

  const startRename = (game: SharedGameSummary) => {
    setEditingCode(game.shareCode)
    setEditingTitle(game.title)
  }

  const saveRename = async (shareCode: string) => {
    try {
      const res = await fetch(`/api/shared-games/${shareCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, title: editingTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rename')

      setMyGames((prev) =>
        prev.map((g) => (g.shareCode === shareCode ? { ...g, title: data.title } : g)),
      )
      setEditingCode(null)
    } catch (err) {
      setMyGamesError(err instanceof Error ? err.message : 'Failed to rename')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (normalizedWord.length !== 5) {
      setError('Word must be exactly 5 letters.')
      return
    }

    try {
      setError(null)
      await onCreate({
        title: title.trim(),
        targetWord: normalizedWord,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create shared game'
      setError(message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-shared-game-modal" onClick={(event) => event.stopPropagation()}>
        {showMyGames ? (
          <>
            <h2>My Games</h2>

            {myGamesLoading && <p className="modal-copy">Loading...</p>}
            {myGamesError && <p className="shared-game-error">{myGamesError}</p>}

            {!myGamesLoading && !myGamesError && myGames.length === 0 && (
              <p className="modal-copy">You haven&apos;t created any shared games yet.</p>
            )}

            {!myGamesLoading && !myGamesError && myGames.length > 0 && (
              <ul className="my-games-list">
                {myGames.map((game) => (
                  <li key={game.shareCode} className="my-games-item">
                    {editingCode === game.shareCode ? (
                      <>
                        <input
                          className="my-games-rename-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(game.shareCode)
                            if (e.key === 'Escape') setEditingCode(null)
                          }}
                          maxLength={80}
                          autoFocus
                        />
                        <div className="my-games-actions">
                          <button type="button" className="btn-glass btn-sm" onClick={() => saveRename(game.shareCode)}>
                            Save
                          </button>
                          <button type="button" className="btn-glass btn-sm" onClick={() => setEditingCode(null)}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="my-games-info">
                          <span className="my-games-title">
                            {game.title || `Code ${game.shareCode.toUpperCase()}`}
                          </span>
                          <span className="my-games-date">
                            {new Date(game.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="my-games-actions">
                          <button type="button" className="btn-glass btn-sm" onClick={() => startRename(game)}>
                            Rename
                          </button>
                          <button type="button" className="btn-glass btn-sm" onClick={() => copyLink(game.shareUrl)}>
                            Copy
                          </button>
                          <button
                            type="button"
                            className="btn-glass btn-sm"
                            onClick={() => {
                              onPlay(game.shareCode)
                              onClose()
                            }}
                          >
                            Play
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="shared-game-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn-glass" onClick={() => setShowMyGames(false)}>
                Back
              </button>
              <button type="button" className="btn-glass" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Create a Shared Game</h2>
            <p className="modal-copy">
              Pick any allowed five-letter word. We&apos;ll generate a link other players can open on the web.
            </p>

            <form className="shared-game-form" onSubmit={handleSubmit}>
              <label className="shared-game-field">
                <span>Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                  placeholder="Optional"
                />
              </label>

              <label className="shared-game-field">
                <span>Answer</span>
                <input
                  value={targetWord}
                  onChange={(event) => setTargetWord(event.target.value.toUpperCase())}
                  maxLength={5}
                  placeholder="CRANE"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>

              {error && <p className="shared-game-error">{error}</p>}

              <div className="shared-game-actions">
                <button type="button" className="btn-glass" onClick={() => setShowMyGames(true)}>
                  My Games
                </button>
                <button type="button" className="btn-glass" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-glass" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Link'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
