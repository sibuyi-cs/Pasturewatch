import { AuthProvider, useAuth } from './context/AuthContext'
import { HerdProvider } from './context/HerdContext'
import { AuthScreen } from './components/AuthScreen'
import { Shell } from './components/Shell'

export default function App() {
  return (
    <AuthProvider>
      <AuthedApp />
    </AuthProvider>
  )
}

function AuthedApp() {
  const { ready, user } = useAuth()
  if (!ready) {
    return (
      <div className="auth-boot">
        <p>Pasturewatch</p>
      </div>
    )
  }
  if (!user) return <AuthScreen />
  return (
    <HerdProvider>
      <Shell />
    </HerdProvider>
  )
}
