/*
*  _____ _   ___   _____________ _     _____ 
* /  ___| | / | \ / / ___ \  _  \ |   |  ___|
* \ `--.| |/ / \ V /| |_/ / | | | |   | |__  
*  `--. \    \  \ / |    /| | | | |   |  __| 
* /\__/ / |\  \ | | | |\ \| |/ /| |___| |___ 
* \____/\_| \_/ \_/ \_| \_|___/ \_____|____/ 
*                                           
* Footer component for Skyrdle. Shows buttons for stats, about, and logout.                                        
*/

type FooterProps = {
    onShowStats: () => void
    onShowAbout: () => void
    onLogout: () => void
}

export default function Footer({ onShowStats, onShowAbout, onLogout }: FooterProps) {
    return (
        <footer className="game-footer">
            <button type="button" className="btn-glass btn-sm" onClick={() => onShowStats()}>Stats</button>
            <button type="button" className="btn-glass btn-sm" onClick={() => onShowAbout()}>About</button>
            <button type="button" className="btn-glass btn-sm" onClick={() => onLogout()}>Logout</button>
        </footer>
    )
}