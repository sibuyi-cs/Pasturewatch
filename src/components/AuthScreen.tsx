import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { DEMO_EMAIL, DEMO_PASSWORD, ROLES } from '../lib/accounts'

type Mode = 'login' | 'register'

function readMode(): Mode {
  return window.location.hash.replace(/^#\/?/, '') === 'register' ? 'register' : 'login'
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>(readMode)

  useEffect(() => {
    const onHash = () => setMode(readMode())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    if (window.location.hash !== `#${next}`) window.location.hash = next
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div>
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <rect width="32" height="32" rx="8" fill="#2f6b4f" />
                <path d="M6 22c4-6 6-6 10-2s6-2 10-6" fill="none" stroke="#e7f2d8" strokeWidth="2" />
                <circle cx="22" cy="11" r="2.1" fill="#e7f2d8" />
              </svg>
            </span>
            <span className="brand-copy">
              <strong>Pasturewatch</strong>
              <small>Live stock monitoring</small>
            </span>
          </div>
          <h1>Greenveld Ranch</h1>
          <p className="auth-lead">
            Sign in to follow the herd, the fence, and the collar sensors. Accounts stay on this browser.
          </p>
        </div>
        <p className="auth-aside-note">TTGO LoRaWAN · GPS · temperature · accelerometer · LDR</p>
      </aside>
      <main className="auth-main">
        {mode === 'login' ? <LoginForm onSwitch={() => switchMode('register')} /> : <RegisterForm onSwitch={() => switchMode('login')} />}
      </main>
    </div>
  )
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    const message = await login(email, password)
    setBusy(false)
    if (message) setError(message)
    else openDashboard()
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <p className="eyebrow">Welcome back</p>
      <h2>Sign in</h2>
      <div className="auth-form">
        {error && <p className="form-error">{error}</p>}
        <label className="field">
          Email
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <button type="submit" className="primary auth-submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
      <p className="auth-switch">
        New to the ranch?{' '}
        <button type="button" onClick={onSwitch}>
          Create an account
        </button>
      </p>
      <p className="demo-note">
        Ranch desk account: <strong>{DEMO_EMAIL}</strong>
        <br />
        Password: <strong>{DEMO_PASSWORD}</strong>
      </p>
    </form>
  )
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>(ROLES[1])
  const [ranch, setRanch] = useState('Greenveld Ranch')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const message = validateRegistration({ name, email, ranch, password, confirm })
    if (message) {
      setError(message)
      return
    }
    setBusy(true)
    const result = await register({ name, email, phone, role, ranch, password })
    setBusy(false)
    if (result) setError(result)
    else openDashboard()
  }

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <p className="eyebrow">New account</p>
      <h2>Register</h2>
      <div className="auth-form">
        {error && <p className="form-error">{error}</p>}
        <label className="field">
          Full name
          <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          Email
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          Phone
          <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <div className="form-row">
          <label className="field">
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Ranch
            <input value={ranch} onChange={(event) => setRanch(event.target.value)} />
          </label>
        </div>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <button type="submit" className="primary auth-submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </div>
      <p className="auth-switch">
        Already registered?{' '}
        <button type="button" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="field">
      {label}
      <span className="password-field">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" onClick={() => setVisible((current) => !current)}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  )
}

function validateRegistration(input: { name: string; email: string; ranch: string; password: string; confirm: string }) {
  if (input.name.trim().length < 2) return 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Enter a valid email address.'
  if (input.ranch.trim().length < 2) return 'Enter the ranch name.'
  if (input.password.length < 8) return 'Use at least 8 characters for the password.'
  if (input.password !== input.confirm) return 'The passwords do not match.'
  return ''
}

function openDashboard() {
  const current = window.location.hash.replace(/^#\/?/, '')
  if (current === 'login' || current === 'register' || current === '') window.location.hash = 'overview'
}
