const ACCOUNTS_KEY = 'pasturewatch.accounts'
const SESSION_KEY = 'pasturewatch.session'

export type UserSettings = {
  notifyGeofence: boolean
  notifyHeat: boolean
  notifyStill: boolean
  notifyBattery: boolean
  notifyOffline: boolean
}

export type Account = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  ranch: string
  createdAt: number
  passwordHash: string
  salt: string
  settings: UserSettings
}

export type PublicUser = Omit<Account, 'passwordHash' | 'salt'>

export const DEMO_EMAIL = 'lindiwe@greenveld.ranch'
export const DEMO_PASSWORD = 'pasture123'

export const ROLES = ['Ranch manager', 'Herder', 'Veterinarian', 'Viewer'] as const

export const DEFAULT_SETTINGS: UserSettings = {
  notifyGeofence: true,
  notifyHeat: true,
  notifyStill: true,
  notifyBattery: true,
  notifyOffline: true,
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || 'PW'
}

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Account[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function loadSessionId() {
  return localStorage.getItem(SESSION_KEY)
}

export function saveSessionId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}

export function toPublic(account: Account): PublicUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    ranch: account.ranch,
    createdAt: account.createdAt,
    settings: account.settings,
  }
}

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function newSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createDemoAccount(): Promise<Account> {
  const salt = newSalt()
  return {
    id: 'demo-lindiwe',
    name: 'Lindiwe Mokoena',
    email: DEMO_EMAIL,
    phone: '+27 82 555 0142',
    role: 'Ranch manager',
    ranch: 'Greenveld Ranch',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    passwordHash: await hashPassword(DEMO_PASSWORD, salt),
    salt,
    settings: { ...DEFAULT_SETTINGS },
  }
}
