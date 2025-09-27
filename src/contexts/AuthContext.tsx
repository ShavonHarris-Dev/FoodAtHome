// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener...')

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 Firebase auth state changed:', user?.email || 'No user')
      setUser(user)
      setLoading(false)
    })

    return () => {
      console.log('🔥 Cleaning up Firebase auth listener')
      unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      console.log('🔥 Starting Google sign in with Firebase...')
      const result = await signInWithPopup(auth, googleProvider)
      console.log('🔥 ✅ Google sign in successful:', result.user.email)
    } catch (error) {
      console.error('🔥 ❌ Google sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('🔥 Signing out...')
      await firebaseSignOut(auth)
      console.log('🔥 ✅ Sign out successful')
    } catch (error) {
      console.error('🔥 ❌ Sign out error:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}