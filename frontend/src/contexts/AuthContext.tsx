// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, orgName: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // For now, just set loading to false since we don't have /me endpoint
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post('/api/v1/auth/login', { email, password })
    const { access_token, user: userData } = response.data
    
    localStorage.setItem('token', access_token)
    setUser(userData)
  }

  const register = async (email: string, password: string, fullName: string, orgName: string) => {
    const response = await api.post('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
      organization_name: orgName
    })
    const { access_token, user: userData } = response.data
    
    localStorage.setItem('token', access_token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}