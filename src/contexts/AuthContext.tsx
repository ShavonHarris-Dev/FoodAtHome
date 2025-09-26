// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseClient } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
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

    // Manual OAuth handling with same client instance
    const handleOAuthCallback = async () => {
      if (!window.location.hash.includes('access_token')) return false

      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        console.log('📱 OAuth tokens found, manually establishing session...')
        try {
          // Debug: Check the actual tokens being used
          console.log('🔍 Access token preview:', accessToken?.substring(0, 50) + '...')
          console.log('🔍 Refresh token preview:', refreshToken?.substring(0, 20) + '...')
          console.log('🔍 Client config:', {
            supabaseExists: !!supabase,
            clientKeys: Object.keys(supabase!),
            envUrl: process.env.REACT_APP_SUPABASE_URL,
            envKey: process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
          })

          // Use the SAME client instance that's already initialized
          const { data, error } = await supabase!.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('❌ Error setting session:', error)
            // Try one more time with refreshed client
            console.log('🔄 Retrying with auth refresh...')
            const { error: refreshError } = await supabase!.auth.refreshSession()
            if (refreshError) {
              console.error('❌ Refresh also failed:', refreshError)
              return false
            }
          } else {
            console.log('✅ Session established:', data)
            // Don't set state here - let the auth listener handle it
            window.history.replaceState({}, document.title, window.location.pathname)
            return true
          }
        } catch (error) {
          console.error('❌ Exception in OAuth handling:', error)
        }
      }
      return false
    }

    // Get initial session
    const getInitialSession = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        // Handle OAuth callback first
        const oauthHandled = await handleOAuthCallback()

        if (!oauthHandled) {
          // No OAuth, just get existing session
          console.log('🔍 Getting existing session...')
          const { data: { session }, error } = await supabase!.auth.getSession()

          if (error) {
            console.error('❌ Error getting session:', error)
          } else {
            console.log('✅ Session:', session)
            setSession(session)
            setUser(session?.user ?? null)
          }
        }
        // If OAuth was handled, the auth listener will update state
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

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    try {
      console.log('🔐 Signing in with email:', email)
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Email sign in error:', error)
        throw error
      }

      console.log('✅ Email sign in successful:', data)
    } catch (error) {
      console.error('Exception during email sign in:', error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    try {
      console.log('📝 Signing up with email:', email)
      const { data, error } = await supabase!.auth.signUp({
        email,
        password
      })

      if (error) {
        console.error('Email sign up error:', error)
        throw error
      }

      console.log('✅ Email sign up successful:', data)
    } catch (error) {
      console.error('Exception during email sign up:', error)
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
    signInWithEmail,
    signUpWithEmail,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}