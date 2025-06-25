export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={() => onClose()}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Skyrdle</h2>
            <p>made with &lt;3 by <a href="https://smol.farm" target="_blank" rel="noopener noreferrer">smol farm</a></p>

            <ul className="modal-list">
                <li><a href="https://bsky.app/profile/skyrdle.com" target="_blank" rel="noopener noreferrer">follow on bluesky</a></li>
                <li><a href="https://github.com/smolfarm/skyrdle-monorepo" target="_blank" rel="noopener noreferrer">view source on github</a></li>
            </ul>
            <button className="btn-glass" onClick={() => onClose()}>Close</button>
        </div>
    </div>
  )
}