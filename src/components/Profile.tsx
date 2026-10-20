import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES, initials } from '../lib/accounts'
import { formatWhen } from '../lib/format'

export function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [role, setRole] = useState(user?.role ?? ROLES[0])
  const [ranch, setRanch] = useState(user?.ranch ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!user) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Enter your full name.')
      setMessage('')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      setMessage('')
      return
    }
    if (ranch.trim().length < 2) {
      setError('Enter the ranch name.')
      setMessage('')
      return
    }
    const result = updateProfile({ name, email, phone, role, ranch })
    if (result) {
      setError(result)
      setMessage('')
      return
    }
    setError('')
    setMessage('Profile saved on this browser.')
  }

  return (
    <div className="stack">
      <section className="profile-layout">
        <article className="panel profile-card">
          <div className="avatar-lg" aria-hidden="true">
            {initials(user.name)}
          </div>
          <h2>{user.name}</h2>
          <p className="muted">{user.role}</p>
          <dl className="facts compact">
            <div>
              <dt>Ranch</dt>
              <dd>{user.ranch}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{user.phone || 'Not set'}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatWhen(user.createdAt)}</dd>
            </div>
          </dl>
          <div className="profile-actions">
            <button type="button" className="ghost" onClick={() => { window.location.hash = 'settings' }}>
              Alert settings
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                logout()
                window.location.hash = 'login'
              }}
            >
              Sign out
            </button>
          </div>
        </article>
        <form className="panel profile-form" onSubmit={submit} noValidate>
          <header className="panel-head">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Edit profile</h2>
            </div>
          </header>
          <div className="panel-body auth-form">
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-ok">{message}</p>}
            <label className="field">
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              Phone
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <div className="form-row">
              <label className="field">
                Role
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  {ROLES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                  {!ROLES.includes(role as (typeof ROLES)[number]) && <option>{role}</option>}
                </select>
              </label>
              <label className="field">
                Ranch
                <input value={ranch} onChange={(event) => setRanch(event.target.value)} />
              </label>
            </div>
            <button type="submit" className="primary">
              Save profile
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
