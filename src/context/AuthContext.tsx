import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createDemoAccount,
  hashPassword,
  loadAccounts,
  loadSessionId,
  newSalt,
  saveAccounts,
  saveSessionId,
  toPublic,
  type Account,
  type PublicUser,
  type UserSettings,
} from '../lib/accounts'

type RegisterInput = {
  name: string
  email: string
  phone: string
  role: string
  ranch: string
  password: string
}

type AuthApi = {
  ready: boolean
  user: PublicUser | null
  login: (email: string, password: string) => Promise<string | null>
  register: (input: RegisterInput) => Promise<string | null>
  logout: () => void
  updateProfile: (patch: Pick<PublicUser, 'name' | 'email' | 'phone' | 'role' | 'ranch'>) => string | null
  updateSettings: (patch: UserSettings) => void
  changePassword: (current: string, next: string) => Promise<string | null>
}

const AuthContext = createContext<AuthApi | null>(null)

function findByEmail(accounts: Account[], email: string) {
  const needle = email.trim().toLowerCase()
  return accounts.find((account) => account.email.toLowerCase() === needle)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancel = false
    async function boot() {
      let stored = loadAccounts()
      if (stored.length === 0) {
        stored = [await createDemoAccount()]
        saveAccounts(stored)
      }
      if (cancel) return
      setAccounts(stored)
      const session = loadSessionId()
      setUserId(stored.some((account) => account.id === session) ? session : null)
      setReady(true)
    }
    void boot()
    return () => {
      cancel = true
    }
  }, [])

  function commit(next: Account[], nextUserId = userId) {
    setAccounts(next)
    saveAccounts(next)
    setUserId(nextUserId)
    saveSessionId(nextUserId)
  }

  const api = useMemo<AuthApi>(() => {
    const user = accounts.find((account) => account.id === userId)
    return {
      ready,
      user: user ? toPublic(user) : null,
      async login(email, password) {
        const account = findByEmail(accounts, email)
        if (!account) return 'No account uses that email.'
        const hash = await hashPassword(password, account.salt)
        if (hash !== account.passwordHash) return 'That password does not match.'
        setUserId(account.id)
        saveSessionId(account.id)
        return null
      },
      async register(input) {
        if (findByEmail(accounts, input.email)) return 'An account with that email already exists.'
        const salt = newSalt()
        const account: Account = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          role: input.role,
          ranch: input.ranch.trim(),
          createdAt: Date.now(),
          passwordHash: await hashPassword(input.password, salt),
          salt,
          settings: {
            notifyGeofence: true,
            notifyHeat: true,
            notifyStill: true,
            notifyBattery: true,
            notifyOffline: true,
          },
        }
        commit([...accounts, account], account.id)
        return null
      },
      logout() {
        setUserId(null)
        saveSessionId(null)
      },
      updateProfile(patch) {
        if (!user) return 'Sign in again to save your profile.'
        const email = patch.email.trim()
        const taken = accounts.some(
          (account) => account.id !== user.id && account.email.toLowerCase() === email.toLowerCase(),
        )
        if (taken) return 'Another account already uses that email.'
        const next = accounts.map((account) =>
          account.id === user.id
            ? {
                ...account,
                name: patch.name.trim(),
                email,
                phone: patch.phone.trim(),
                role: patch.role,
                ranch: patch.ranch.trim(),
              }
            : account,
        )
        commit(next)
        return null
      },
      updateSettings(patch) {
        if (!user) return
        const next = accounts.map((account) => (account.id === user.id ? { ...account, settings: patch } : account))
        commit(next)
      },
      async changePassword(current, nextPassword) {
        if (!user) return 'Sign in again to change the password.'
        const account = accounts.find((item) => item.id === user.id)
        if (!account) return 'Sign in again to change the password.'
        const currentHash = await hashPassword(current, account.salt)
        if (currentHash !== account.passwordHash) return 'The current password is wrong.'
        const salt = newSalt()
        const passwordHash = await hashPassword(nextPassword, salt)
        const next = accounts.map((item) => (item.id === account.id ? { ...item, salt, passwordHash } : item))
        commit(next)
        return null
      },
    }
  }, [accounts, ready, userId])

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
