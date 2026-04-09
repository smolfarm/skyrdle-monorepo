import { FormEvent, useMemo, useState } from 'react'

type CreateSharedGameModalProps = {
  isSubmitting: boolean
  onClose: () => void
  onCreate: (payload: { title: string; targetWord: string }) => Promise<void>
}

export default function CreateSharedGameModal({
  isSubmitting,
  onClose,
  onCreate,
}: CreateSharedGameModalProps) {
  const [title, setTitle] = useState('')
  const [targetWord, setTargetWord] = useState('')
  const [error, setError] = useState<string | null>(null)

  const normalizedWord = useMemo(() => targetWord.trim().toUpperCase(), [targetWord])

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
            <button type="button" className="btn-glass" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-glass" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
