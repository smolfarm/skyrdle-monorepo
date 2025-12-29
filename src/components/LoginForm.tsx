import { ChangeEvent, useState } from 'react'
import { SiBluesky } from 'react-icons/si'
import logo from '../logo.jpg'
import AboutModal from './AboutModal'

type LoginFormProps = {
    handle: string
    onHandleChange: (handle: string) => void
    onLoginAttempt: () => void
}

export default function LoginForm({ handle, onHandleChange, onLoginAttempt }: LoginFormProps) {
    const [showAbout, setShowAbout] = useState(false)

    return (
        <div className="login">
            <div className="login-container">
                <img src={logo} alt="Skyrdle Logo" className="login-logo" />

                <div className="login-header">
                    <h1 className="login-title">Skyrdle</h1>
                    <p className="login-subtitle">Daily Word Puzzle</p>
                </div>

                <form
                    className="login-form"
                    onSubmit={(e) => {
                        e.preventDefault()
                        onLoginAttempt()
                    }}
                >
                    <div className="input-wrapper">
                        <input
                            className="login-input"
                            placeholder="Bluesky Handle or DID"
                            value={handle}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => onHandleChange(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn-glass btn-login">
                        Login
                    </button>
                </form>

                <div className="login-footer">
                    <button
                        type="button"
                        onClick={() => setShowAbout(true)}
                        className="btn-glass btn-text"
                    >
                        About
                    </button>
                    <a
                        href="https://bsky.app/profile/did:plc:jylenhzj4u2te27qmcrdjtoh"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link"
                        aria-label="Follow us on Bluesky"
                    >
                        <SiBluesky size={20} />
                        <span>Follow</span>
                    </a>
                </div>
            </div>

            {showAbout && (
                <AboutModal onClose={() => setShowAbout(false)} />
            )}
        </div>
    )
}