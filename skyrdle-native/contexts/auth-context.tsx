import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  AuthState,
  loadAuthState,
  startLogin as authStartLogin,
  logout as authLogout,
} from '@/services/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  did: string | null
  handle: string | null
  login: (handle: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [authState, setAuthState] = useState<AuthState | null>(null)

  // Restore auth state on mount
  useEffect(() => {
    async function restoreAuth() {
      try {
        const state = await loadAuthState()
        setAuthState(state)
      } catch (error) {
        console.error('[AuthContext] Error restoring auth:', error)
      } finally {
        setIsLoading(false)
      }
    }
    restoreAuth()
  }, [])

  const login = async (handle: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const state = await authStartLogin(handle)
      if (state) {
        setAuthState(state)
        return true
      }
      return false
    } catch (error) {
      console.error('[AuthContext] Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await authLogout()
      setAuthState(null)
    } catch (error) {
      console.error('[AuthContext] Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    isAuthenticated: authState !== null,
    isLoading,
    did: authState?.did ?? null,
    handle: authState?.handle ?? null,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
