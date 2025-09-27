import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { FirestoreService, UserProfile } from '../services/FirestoreService'

export const useProfile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log('🔥 Fetching profile for user:', user.id)
      const existingProfile = await FirestoreService.getProfile(user.id)

      if (!existingProfile) {
        console.log('🔥 No profile found, creating new one')
        await createProfile()
      } else {
        console.log('🔥 Profile found:', existingProfile)
        setProfile(existingProfile)
      }
    } catch (error) {
      console.error('🔥 Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    try {
      console.log('🔥 Creating new profile for user:', user.id)
      const newProfile = await FirestoreService.createProfile(user.id, {
        email: user.email!,
        full_name: user.user_metadata.full_name || null,
        avatar_url: user.user_metadata.avatar_url || null,
        has_paid: false,
        subscription_tier: 'basic',
        food_genres: null,
        dietary_preferences: null
      })

      console.log('🔥 Profile created successfully:', newProfile)
      setProfile(newProfile)
    } catch (error) {
      console.error('🔥 Error creating profile:', error)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return

    try {
      console.log('🔥 Updating profile:', updates)
      const updatedProfile = await FirestoreService.updateProfile(user.id, updates)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (error) {
      console.error('🔥 Error updating profile:', error)
      throw error
    }
  }

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile
  }
}