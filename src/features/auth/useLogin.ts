import { useGoogleLogin } from '@react-oauth/google'
import { useStore } from '@/lib/store'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

export function useLogin() {
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

  return login
}
