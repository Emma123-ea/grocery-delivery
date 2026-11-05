import { useState } from 'react'
import { AuthContext } from './AuthContext'

function readStored() {
  try {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored)

  function saveSession(session) {
    setAuth(session)
    try {
      localStorage.setItem('auth', JSON.stringify(session))
    } catch {
      /* storage unavailable, session lasts until refresh */
    }
  }

  function logout() {
    setAuth(null)
    try {
      localStorage.removeItem('auth')
    } catch {
      /* nothing to clear */
    }
  }

  async function authRequest(path, body) {
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.')
    }
    saveSession({ token: data.token, user: data.user })
    return data.user
  }

  const value = {
    user: auth ? auth.user : null,
    token: auth ? auth.token : null,
    login: (email, password) => authRequest('login', { email, password }),
    register: (fields) => authRequest('register', fields),
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}