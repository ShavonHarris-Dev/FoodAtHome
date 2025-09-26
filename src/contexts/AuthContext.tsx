// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseClient } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
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
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      console.log('Supabase client not available')
      setLoading(false)
      return
    }

    console.log('Setting up auth listener... FRESH BUILD')

    // Get initial session
    const getInitialSession = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        if (error) {
          console.error('Error getting initial session:', error)
        } else {
          console.log('Initial session:', session)
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Exception getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session)
        console.log('User ID:', session?.user?.id)
        console.log('User email:', session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    getInitialSession()

    return () => {
      console.log('Cleaning up auth listener')
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    if (!supabase) {
      alert('Supabase is not configured')
      return
    }

    try {
      console.log('Initiating Google sign in...')
      console.log('Redirect URL:', `${window.location.origin}/`)
      console.log('Current URL:', window.location.href)

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })

      console.log('OAuth response:', { data, error })

      if (error) {
        console.error('Google sign in error:', error)
        throw error
      }
    } catch (error) {
      console.error('Exception during Google sign in:', error)
      throw error
    }
  }

  const signOut = async () => {
    if (!supabase) return

    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
    } catch (error) {
      console.error('Exception during sign out:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}