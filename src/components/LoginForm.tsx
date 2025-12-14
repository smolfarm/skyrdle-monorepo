import { ChangeEvent } from 'react'
import { SiBluesky } from 'react-icons/si'
import logo from '../logo.jpg'

type LoginFormProps = {
    handle: string
    onHandleChange: (handle: string) => void
    onLoginAttempt: () => void
}

export default function LoginForm({ handle, onHandleChange, onLoginAttempt }: LoginFormProps) {
    return (
        <div className="login">
            <img src={logo} alt="Skyrdle Logo" className="login-logo" />
            <h2>Skyrdle Login</h2>
            <input
                placeholder="Bluesky Handle or ATProto DID"
                value={handle}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onHandleChange(e.target.value)}
            />
            <button onClick={onLoginAttempt} className="btn-glass" style={{ marginTop: '1rem' }}>Login</button>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <a
                    href="https://smol.life/profile/did:plc:jylenhzj4u2te27qmcrdjtoh"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'rgba(29, 161, 242, 1)' }}
                    aria-label="Follow us on Bluesky"
                >
                <SiBluesky size={28} />
                </a>
            </div>
        </div>
    )
}