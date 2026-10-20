import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHerd } from '../context/HerdContext'
import { initials } from '../lib/accounts'
import { formatClock, formatWhen } from '../lib/format'
import { Overview } from './Overview'
import { MapView } from './MapView'
import { Herd } from './Herd'
import { Alerts } from './Alerts'
import { Sensors } from './Sensors'
import { Devices } from './Devices'
import { Assistant } from './Assistant'
import { Profile } from './Profile'
import { Settings } from './Settings'
import { GeofenceMapper } from './GeofenceMapper'
import { AlertPopups } from './AlertPopups'

const VIEWS = ['overview', 'map', 'herd', 'alerts', 'sensors', 'devices', 'assistant', 'profile', 'settings', 'mapper'] as const
export type View = (typeof VIEWS)[number]

const COPY: Record<View, { kicker: string; title: string }> = {
  overview: { kicker: 'Greenveld Ranch', title: 'Herd overview' },
  map: { kicker: 'GPS and geofence', title: 'Live map' },
  herd: { kicker: 'Collars on animals', title: 'Herd' },
  alerts: { kicker: 'Fence, heat, and stillness', title: 'Alerts' },
  sensors: { kicker: 'Temperature, motion, and light', title: 'Sensors' },
  devices: { kicker: 'TTGO nodes and gateway', title: 'Network' },
  assistant: { kicker: 'Ask the herd feed', title: 'Assistant' },
  profile: { kicker: 'Your account', title: 'Profile' },
  settings: { kicker: 'Feed, alerts, and security', title: 'Settings' },
  mapper: { kicker: 'GPS walk', title: 'Geofence mapper' },
}

function parseView(hash: string): View {
  const view = hash.replace(/^#\/?/, '') as View
  return VIEWS.includes(view) ? view : 'overview'
}

export function Shell() {
  const { metrics, now, select, feedMode } = useHerd()
  const { user, logout } = useAuth()
  const [view, setView] = useState<View>(() => parseView(window.location.hash))
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pasturewatch.nav') === 'collapsed')

  useEffect(() => {
    localStorage.setItem('pasturewatch.nav', collapsed ? 'collapsed' : 'open')
  }, [collapsed])

  useEffect(() => {
    const onHash = () => setView(parseView(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function navigate(next: View) {
    setView(next)
    if (window.location.hash !== `#${next}`) window.location.hash = next
  }

  function locate(id: string) {
    select(id)
    navigate('map')
  }

  function signOut() {
    logout()
    window.location.hash = 'login'
  }

  const copy = COPY[view]
  const fill = view === 'map' || view === 'assistant' || view === 'mapper'

  return (
    <div className={collapsed ? 'app nav-collapsed' : 'app'}>
      <aside className="sidebar">
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
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => setCollapsed((open) => !open)}
          >
            <IconChevron collapsed={collapsed} />
          </button>
        </div>
        <nav className="nav" aria-label="Primary">
          <NavButton view="overview" current={view} onNavigate={navigate} icon={<IconGrid />}>Overview</NavButton>
          <NavButton view="map" current={view} onNavigate={navigate} icon={<IconPin />}>Live map</NavButton>
          <NavButton view="herd" current={view} onNavigate={navigate} icon={<IconHerd />}>Herd</NavButton>
          <NavButton
            view="alerts"
            current={view}
            onNavigate={navigate}
            icon={<IconBell />}
            badge={metrics.waitingAcks}
          >
            Alerts
          </NavButton>
          <NavButton view="sensors" current={view} onNavigate={navigate} icon={<IconWave />}>Sensors</NavButton>
          <NavButton view="devices" current={view} onNavigate={navigate} icon={<IconRadio />}>Network</NavButton>
          <NavButton view="assistant" current={view} onNavigate={navigate} icon={<IconChat />}>Assistant</NavButton>
          <NavButton view="profile" current={view} onNavigate={navigate} icon={<IconUser />}>Profile</NavButton>
          <NavButton view="settings" current={view} onNavigate={navigate} icon={<IconGear />}>Settings</NavButton>
        </nav>
        <div className="side-foot">
          {user && (
            <button type="button" className="account-chip" title={user.name} onClick={() => navigate('profile')}>
              <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
              <span className="account-copy">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </button>
          )}
          <div className="side-note">
            <strong>{metrics.outside === 0 ? 'Fence clear' : `${metrics.outside} outside fence`}</strong>
            <span>
              {metrics.reporting} of {metrics.total} nodes reporting
            </span>
          </div>
          <button type="button" className="side-logout" title="Sign out" onClick={signOut}>
            <IconLogout />
            <span className="label">Sign out</span>
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{copy.kicker}</p>
            <h1>{copy.title}</h1>
          </div>
          <div className="top-meta">
            <span
              className={feedMode === 'live' ? 'live live-real' : 'live'}
              title={feedMode === 'live' ? 'Waiting for collar uplinks' : 'Simulated TTGO uplinks for dashboard development'}
            >
              <i /> {feedMode === 'live' ? 'Real-time feed' : 'Demo feed'}
            </span>
            <time dateTime={new Date(now).toISOString()}>
              {formatWhen(now)} · {formatClock(now)}
            </time>
            {user && (
              <button type="button" className="who" onClick={() => navigate('profile')}>
                <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
                <span className="who-name">{user.name}</span>
              </button>
            )}
          </div>
        </header>
        <div className={fill ? 'view view-fill' : 'view'}>
          {view === 'overview' && <Overview onOpenMap={locate} onOpenAlerts={() => navigate('alerts')} />}
          {view === 'map' && <MapView />}
          {view === 'herd' && <Herd onLocate={locate} />}
          {view === 'alerts' && <Alerts onLocate={locate} />}
          {view === 'sensors' && <Sensors />}
          {view === 'devices' && <Devices />}
          {view === 'assistant' && <Assistant />}
          {view === 'profile' && <Profile />}
          {view === 'settings' && <Settings />}
          {view === 'mapper' && <GeofenceMapper />}
        </div>
        <AlertPopups onOpenAlerts={() => navigate('alerts')} />
      </div>
    </div>
  )
}

function NavButton({
  view,
  current,
  onNavigate,
  icon,
  badge,
  children,
}: {
  view: View
  current: View
  onNavigate: (view: View) => void
  icon: ReactNode
  badge?: number
  children: ReactNode
}) {
  const label = typeof children === 'string' ? children : undefined
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={current === view ? 'page' : undefined}
      onClick={() => onNavigate(view)}
    >
      {icon}
      <span className="label">{children}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  )
}

function IconHerd() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="9" r="2.2" />
      <circle cx="16" cy="9" r="2.2" />
      <path d="M4.5 18c.6-2.2 2.2-3.4 4.5-3.4s3.9 1.2 4.5 3.4" />
      <path d="M13 18c.4-1.6 1.6-2.6 3.4-2.6 1.6 0 2.8.8 3.3 2.2" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

function IconWave() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 14c2 0 2-4 4-4s2 6 4 6 2-8 4-8 2 6 4 6" />
    </svg>
  )
}

function IconRadio() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="14" r="3" />
      <path d="M7.5 9.5a6 6 0 0 1 9 0" />
      <path d="M5 7a9.5 9.5 0 0 1 14 0" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 16.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H9l-4 3.5z" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="3" />
      <path d="M6 19c.8-2.6 2.8-4 6-4s5.2 1.4 6 4" />
    </svg>
  )
}

function IconChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={collapsed ? 'point-right' : undefined}>
      <path d="M14 6 8 12l6 6" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6H6v12h3" />
      <path d="M10 12h8" />
      <path d="m15 8 4 4-4 4" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </svg>
  )
}
