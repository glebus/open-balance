import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import { useStore } from '@/lib/store'
import { LogIn, LogOut, User } from 'lucide-react'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

export function LoginButton() {
  const setAuth = useStore((s) => s.setAuth)

  const login = useGoogleLogin({
    scope: SCOPES,
    onSuccess: async (response) => {
      const token = response.access_token
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const info = await res.json()
        setAuth(token, info.email || 'Unknown', info.picture || '')
      } catch {
        setAuth(token, 'Signed in')
      }
    },
    onError: () => {
      // Error handled silently — user can retry
    },
  })

  return (
    <button
      onClick={() => login()}
      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
    >
      <LogIn size={16} />
      Sign in with Google
    </button>
  )
}

export function UserMenu() {
  const { userEmail, userPhoto, clearAuth } = useStore()

  const handleLogout = () => {
    googleLogout()
    clearAuth()
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {userPhoto ? (
          <img src={userPhoto} alt="" className="h-7 w-7 rounded-full" />
        ) : (
          <User size={16} className="text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">{userEmail}</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer"
      >
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  )
}
