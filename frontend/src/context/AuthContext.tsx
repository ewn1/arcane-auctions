import { useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from '../api/client'
import type { TokenResponse, User } from '../types'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(() => !getToken())

  useEffect(() => {
    let active = true

    if (getToken()) {
      api<User>('/auth/me/')
        .then((me) => {
          if (active) setUser(me)
        })
        .catch(() => {
          if (active) setUser(null)
        })
        .finally(() => {
          if (active) setReady(true)
        })
    }

    const handleLogout = () => setUser(null)
    window.addEventListener('arcane:logout', handleLogout)

    return () => {
      active = false
      window.removeEventListener('arcane:logout', handleLogout)
    }
  }, [])

  async function login(username: string, password: string) {
    const data = await api<TokenResponse>('/token/', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
    setToken(data.access)
    setUser(await api<User>('/auth/me/'))
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    ready,
    isAuctioneer: user?.role === 'auctioneer',
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
