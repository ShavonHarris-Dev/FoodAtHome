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
    console.log('URL hash on mount:', window.location.hash)
    console.log('URL search on mount:', window.location.search)
    console.log('🔧 Supabase config:', {
      url: process.env.REACT_APP_SUPABASE_URL,
      urlIsSet: !!process.env.REACT_APP_SUPABASE_URL,
      keyPrefix: process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      keyIsSet: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      keyLength: process.env.REACT_APP_SUPABASE_ANON_KEY?.length,
      supabaseExists: !!supabase,
      supabaseClientExists: !!supabaseClient
    })
    console.log('🔧 Raw env vars:', {
      REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
      REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 50) + '...'
    })

    // Get initial session with delay for OAuth processing
    const getInitialSession = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        // If OAuth callback is present, wait a moment for Supabase to process it
        if (window.location.hash.includes('access_token')) {
          console.log('🔍 OAuth callback detected, waiting for Supabase to process...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        console.log('🔍 Getting initial session...')
        const { data: { session }, error } = await supabase!.auth.getSession()

        if (error) {
          console.error('❌ Error getting initial session:', error)
        } else {
          console.log('✅ Initial session retrieved:', session)
          setSession(session)
          setUser(session?.user ?? null)

          // Clean OAuth URL after successful session retrieval
          if (session && window.location.hash.includes('access_token')) {
            console.log('🧹 Cleaning OAuth URL...')
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }
      } catch (error) {
        console.error('❌ Exception getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
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

      const { data, error } = await supabase!.auth.signInWithOAuth({
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
      const { error } = await supabase!.auth.signOut()
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