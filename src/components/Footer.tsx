/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Footer component for Skyrdle. Shows bottom-row game actions and navigation buttons.
*/

type FooterProps = {
    onCreateGame: () => void
    onShowInfinite: () => void
    showInfinite: boolean
    onShowStats: () => void
    onShowAbout: () => void
    onShowSettings: () => void
    onLogout: () => void
}

export default function Footer({
    onCreateGame,
    onShowInfinite,
    showInfinite,
    onShowStats,
    onShowAbout,
    onShowSettings,
    onLogout,
}: FooterProps) {
    return (
        <footer className="game-footer">
            <button type="button" className="btn-glass btn-sm" onClick={() => onCreateGame()}>Create</button>
            {showInfinite && (
                <button type="button" className="btn-glass btn-sm" onClick={() => onShowInfinite()}>Infinite ∞</button>
            )}
            <button type="button" className="btn-glass btn-sm" onClick={() => onShowStats()}>Stats</button>
            <button type="button" className="btn-glass btn-sm" onClick={() => onShowSettings()}>Settings</button>
            <button type="button" className="btn-glass btn-sm" onClick={() => onShowAbout()}>About</button>
            <button type="button" className="btn-glass btn-sm" onClick={() => onLogout()}>Logout</button>
        </footer>
    )
}
