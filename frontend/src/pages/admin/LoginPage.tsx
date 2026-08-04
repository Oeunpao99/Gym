import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { IconDumbbell } from '../../components/icons'

const DEMO_ACCOUNTS = [
  { username: 'branch1', password: 'branch123', label: 'Downtown Manager' },
  { username: 'branch2', password: 'branch123', label: 'Uptown Manager' },
  { username: 'headoffice', password: 'head123', label: 'Head Office' },
  { username: 'ceo', password: 'ceo123', label: 'CEO' },
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    const redirectTo = (location.state as { from?: string })?.from || '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Invalid login')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark">
            <IconDumbbell size={22} />
          </span>
          <div>
            <h1>Gym Membership</h1>
            <p className="login-subtitle">Sign in to the front desk workspace</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="demo-accounts">
          <p className="muted">Demo accounts:</p>
          <ul>
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.username}>
                {acc.label}: <code>{acc.username}</code> / <code>{acc.password}</code>
              </li>
            ))}
          </ul>
        </div>
        <p className="login-footnote">Powered by Microsoft Power Apps · Fluent UI</p>
      </div>
    </div>
  )
}
