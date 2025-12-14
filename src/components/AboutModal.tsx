/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* About modal component for displaying information about the app.                                         
*/

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={() => onClose()}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Skyrdle</h2>
            <p>made with &lt;3 by <a href="https://smol.farm" target="_blank" rel="noopener noreferrer">smol farm</a></p>

            <ul style={{listStyleType: 'none', fontSize: '0.8rem'}}>
                <li>🧐 Guess the word of the day in 6 tries or less!</li>
                <li>✅ Correct letters & misplaced letters will be highlighted!</li>
                <li>🏆 Your scores will be saved to your PDS!</li>
            </ul>

            <ul className="modal-list">
                <li><a href="https://bsky.app/profile/skyrdle.com" target="_blank" rel="noopener noreferrer">follow on bluesky</a></li>
                <li><a href="https://github.com/smolfarm/skyrdle-monorepo" target="_blank" rel="noopener noreferrer">view source on github</a></li>
            </ul>
            <button className="btn-glass" onClick={() => onClose()}>Close</button>
        </div>
    </div>
  )
}