type ShareResultsProps = {
  shareText: string
  onShare: () => void
  onSkeet: () => void
  isPostingSkeet: boolean
}

export default function ShareResults({ shareText, onShare, onSkeet, isPostingSkeet }: ShareResultsProps) {
  return (
    <div className="share-results-box" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #555', borderRadius: '8px', backgroundColor: '#2a2a2e' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', textAlign: 'center' }}>Share Results</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#1e1e20', padding: '10px', borderRadius: '4px', textAlign: 'left', color: '#eee', border: '1px solid #444' }}>{shareText}</pre>
        <div className="share-buttons" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-around', gap: '0.5rem' }}>
            <button onClick={onShare} className="btn-glass" style={{ flex: 1 }}>Copy</button>
            <button onClick={onSkeet} disabled={isPostingSkeet} className="btn-glass" style={{ flex: 1, opacity: isPostingSkeet ? 0.6 : 1 }}>
            {isPostingSkeet ? 'Posting...' : 'Post'}
            </button>
        </div>
    </div>
  )
}