import { ChangeEvent } from 'react'
import logo from '../logo.jpg'

type LoginFormProps = {
    identifier: string
    password: string
    requires2FA: boolean
    twoFactorCode: string
    onLoginAttempt: () => void
    onIdentifierChange: (identifier: string) => void
    onPasswordChange: (password: string) => void
    onTwoFactorCodeChange: (twoFactorCode: string) => void
}

export default function LoginForm({ identifier, password, requires2FA, twoFactorCode, onLoginAttempt, onIdentifierChange, onPasswordChange, onTwoFactorCodeChange }: LoginFormProps) {
    return (
        <div className="login">
            <img src={logo} alt="Skyrdle Logo" className="login-logo" />
            <h2>Login to Skyrdle</h2>
            <input
            placeholder="Bluesky Username or Email"
            value={identifier}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onIdentifierChange(e.target.value)}
            />
            <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onPasswordChange(e.target.value)}
            />
            {requires2FA && (
            <input
                placeholder="2FA Code"
                value={twoFactorCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onTwoFactorCodeChange(e.target.value)}
            />
            )}
            <button onClick={onLoginAttempt} className="btn-glass">Login</button>
        </div>
    )
}