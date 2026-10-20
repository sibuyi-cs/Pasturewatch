import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHerd } from '../context/HerdContext'
import type { UserSettings } from '../lib/accounts'
import type { FeedMode } from '../lib/feed'
import { formatArea, getSavedGrazing, subscribeGrazing } from '../lib/pasture'
import { previewNotice } from '../lib/ringtone'
import type { Severity } from '../types'

const TOGGLES: Array<{ key: keyof UserSettings; title: string; detail: string }> = [
  { key: 'notifyGeofence', title: 'Geofence', detail: 'An animal leaves Home pasture.' },
  { key: 'notifyHeat', title: 'Heat stress', detail: 'A collar temperature crosses the heat line.' },
  { key: 'notifyStill', title: 'Stillness', detail: 'An animal stops moving long enough to check.' },
  { key: 'notifyBattery', title: 'Low battery', detail: 'A TTGO collar drops to 15% or below.' },
  { key: 'notifyOffline', title: 'Offline node', detail: 'A collar stops reporting.' },
]

export function Settings() {
  const { user, updateSettings, changePassword, logout } = useAuth()
  const { feedMode, setFeedMode } = useHerd()
  const grazing = useSyncExternalStore(subscribeGrazing, getSavedGrazing, getSavedGrazing)
  const [settings, setSettings] = useState<UserSettings | null>(user?.settings ?? null)
  const [saved, setSaved] = useState<'feed' | 'alerts' | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user || !settings) return null

  function chooseFeed(mode: FeedMode) {
    setFeedMode(mode)
    setSaved('feed')
  }

  function toggle(key: keyof UserSettings) {
    const nextSettings = { ...settings!, [key]: !settings![key] }
    setSettings(nextSettings)
    updateSettings(nextSettings)
    setSaved('alerts')
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    setPasswordMessage('')
    if (!current || !next) {
      setPasswordError('Enter the current password and a new one.')
      return
    }
    if (next.length < 8) {
      setPasswordError('Use at least 8 characters for the new password.')
      return
    }
    if (next !== confirm) {
      setPasswordError('The new passwords do not match.')
      return
    }
    setBusy(true)
    const result = await changePassword(current, next)
    setBusy(false)
    if (result) {
      setPasswordError(result)
      return
    }
    setPasswordError('')
    setPasswordMessage('Password updated.')
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  function signOut() {
    logout()
    window.location.hash = 'login'
  }

  return (
    <div className="stack settings-layout">
      <section className="panel">
        <header className="panel-head">
          <div>
            <p className="eyebrow">Data</p>
            <h2 id="feed-heading">Feed source</h2>
          </div>
          {saved === 'feed' && <p className="form-ok inline">Saved</p>}
        </header>
        <div className="panel-body">
          <p className="small muted">
            Demo feed invents collar packets on this computer. Real-time feed keeps the last fix and moves only when an uplink arrives from the collars.
          </p>
          <div className="feed-choices" role="radiogroup" aria-labelledby="feed-heading">
            <label className={feedMode === 'demo' ? 'feed-choice on' : 'feed-choice'}>
              <input
                type="radio"
                name="feed-mode"
                value="demo"
                checked={feedMode === 'demo'}
                onChange={() => chooseFeed('demo')}
              />
              <span>
                <strong>Demo feed</strong>
                <small>Synthetic TTGO uplinks every 2 seconds, for the desk while the collars are offline.</small>
              </span>
            </label>
            <label className={feedMode === 'live' ? 'feed-choice on' : 'feed-choice'}>
              <input
                type="radio"
                name="feed-mode"
                value="live"
                checked={feedMode === 'live'}
                onChange={() => chooseFeed('live')}
              />
              <span>
                <strong>Real-time feed</strong>
                <small>Collars through The Things Network, MQTT, and Node-RED. The map holds still until the next uplink.</small>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <p className="eyebrow">Pasture</p>
            <h2>Grazing area</h2>
          </div>
        </header>
        <div className="panel-body stack-sm">
          <p className="small">
            Walk the edge of the grazing block. The mapper is kept off the main menu and drops a coordinate each time you move.
          </p>
          <p className="small muted">
            {grazing
              ? `Saved boundary: ${grazing.length} corners · ${formatArea(grazing)}.`
              : 'No walked boundary yet. Home pasture on the live map is unchanged.'}
          </p>
          <button type="button" className="primary" onClick={() => { window.location.hash = 'mapper' }}>
            Geofence mapper
          </button>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <p className="eyebrow">Alerts</p>
            <h2>Notification settings</h2>
          </div>
          {saved === 'alerts' && <p className="form-ok inline">Saved</p>}
        </header>
        <div className="panel-body">
          <p className="small muted">
            Choose which collar events {user.name.split(' ')[0]} wants called out for {user.ranch}. The herd feed still records every event.
          </p>
          <div className="toggle-list">
            {TOGGLES.map((item) => (
              <label key={item.key} className="toggle-row">
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={() => toggle(item.key)}
                />
              </label>
            ))}
          </div>
          <p className="small muted ringtone-note">
            New alerts pop up with a ringtone. Information is one soft note, warning is two notes, and critical is an alarm.
          </p>
          <div className="mapper-actions">
            {(['information', 'warning', 'critical'] as Severity[]).map((level) => (
              <button key={level} type="button" className="ghost" onClick={() => previewNotice(level)}>
                {level === 'information' ? 'Information tone' : level === 'warning' ? 'Warning tone' : 'Critical tone'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="split">
        <form className="panel" onSubmit={submitPassword} noValidate>
          <header className="panel-head">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Password</h2>
            </div>
          </header>
          <div className="panel-body auth-form">
            {passwordError && <p className="form-error">{passwordError}</p>}
            {passwordMessage && <p className="form-ok">{passwordMessage}</p>}
            <label className="field">
              Current password
              <input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
            </label>
            <label className="field">
              New password
              <input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
            </label>
            <label className="field">
              Confirm new password
              <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </label>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
        <article className="panel">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Session</p>
              <h2>This browser</h2>
            </div>
          </header>
          <div className="panel-body stack-sm">
            <p className="small">
              Signed in as <strong>{user.email}</strong>. Leaving the desk signs this browser out. The account stays on this computer.
            </p>
            <button type="button" className="ghost" onClick={() => { window.location.hash = 'profile' }}>
              Edit profile
            </button>
            <button type="button" className="danger" onClick={signOut}>
              Sign out
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}
