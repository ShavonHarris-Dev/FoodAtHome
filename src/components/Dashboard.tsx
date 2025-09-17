import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import ImageUpload from './ImageUpload'
import FoodGenreSelector from './FoodGenreSelector'
import DietaryPreferences from './DietaryPreferences'
import PaymentForm from './PaymentForm'
import RecipeDiscovery from './RecipeDiscovery'
import MealPlanner from './MealPlanner'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const { profile, loading, updateProfile } = useProfile()
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [dietaryPreferences, setDietaryPreferences] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [showRecipeDiscovery, setShowRecipeDiscovery] = useState(false)
  const [activeTab, setActiveTab] = useState<'setup' | 'recipes' | 'meal-plan'>('setup')

  useEffect(() => {
    if (profile) {
      setSelectedGenres(profile.food_genres || [])
      setDietaryPreferences(profile.dietary_preferences || '')
      setShowPayment(!profile.has_paid)
      setShowRecipeDiscovery(profile.has_paid && uploadedImages.length > 0)
    }
  }, [profile, uploadedImages, activeTab])

  // Load existing uploaded images when component mounts
  useEffect(() => {
    const loadExistingImages = async () => {
      if (!user || !supabase) return

      try {
        const { data: images, error } = await supabase
          .from('user_images')
          .select('image_url')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error loading existing images:', error)
          return
        }

        if (images && images.length > 0) {
          const imageUrls = images.map(img => img.image_url)
          setUploadedImages(imageUrls)
        }
      } catch (error) {
        console.error('Error loading existing images:', error)
      }
    }

    loadExistingImages()
  }, [user])

  const handleSavePreferences = async () => {
    try {
      await updateProfile({
        food_genres: selectedGenres,
        dietary_preferences: dietaryPreferences
      })
      alert('Preferences saved successfully!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Error saving preferences. Please try again.')
    }
  }

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    alert('Payment successful! Welcome to Food at Home!')
  }

  const handleImagesUploaded = (imageUrls: string[]) => {
    setUploadedImages(imageUrls)
    if (profile?.has_paid && imageUrls.length > 0) {
      setShowRecipeDiscovery(true)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    )
  }

  if (showPayment) {
    return <PaymentForm onPaymentSuccess={handlePaymentSuccess} />
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Food at Home</h1>
          <div className="user-info">
            <span>Welcome, {user?.user_metadata?.full_name || user?.email}</span>
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-container">
          {profile?.has_paid && (
            <div className="dashboard-tabs">
              <button
                className={`tab-button ${activeTab === 'setup' ? 'active' : ''}`}
                onClick={() => setActiveTab('setup')}
              >
                🔧 Setup
              </button>
              <button
                className={`tab-button ${activeTab === 'recipes' ? 'active' : ''}`}
                onClick={() => setActiveTab('recipes')}
                disabled={uploadedImages.length === 0}
              >
                🍳 Recipe Discovery
              </button>
              <button
                className={`tab-button ${activeTab === 'meal-plan' ? 'active' : ''}`}
                onClick={() => setActiveTab('meal-plan')}
              >
                📅 Meal Planning
                {profile?.subscription_tier !== 'premium' && <span className="premium-badge">Premium</span>}
              </button>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="setup-content">
              <div className="welcome-section">
                <h2>Set Up Your Food Preferences</h2>
                <p>
                  Complete your profile to get personalized recipe recommendations based on
                  your ingredients and preferences.
                </p>
              </div>

              <div className="setup-sections">
                <section className="setup-section">
                  <ImageUpload
                    onImagesUploaded={handleImagesUploaded}
                    maxImages={10}
                  />
                </section>

                <section className="setup-section">
                  <FoodGenreSelector
                    selectedGenres={selectedGenres}
                    onGenresChange={setSelectedGenres}
                  />
                </section>

                <section className="setup-section">
                  <DietaryPreferences
                    preferences={dietaryPreferences}
                    onPreferencesChange={setDietaryPreferences}
                  />
                </section>

                <div className="save-section">
                  <button
                    onClick={handleSavePreferences}
                    className="save-button"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>

              {!profile?.has_paid && (
                <div className="next-steps">
                  <h3>What's Next?</h3>
                  <div className="next-steps-content">
                    <div className="step">
                      <div className="step-icon">🔍</div>
                      <div className="step-text">
                        <h4>Recipe Discovery</h4>
                        <p>Upload ingredient photos above to get recipes requiring 0-2 additional ingredients max</p>
                      </div>
                    </div>
                    <div className="step">
                      <div className="step-icon">🍽️</div>
                      <div className="step-text">
                        <h4>Meal Planning</h4>
                        <p>Plan your weekly meals with suggested recipes</p>
                      </div>
                    </div>
                    <div className="step">
                      <div className="step-icon">🛒</div>
                      <div className="step-text">
                        <h4>Smart Shopping</h4>
                        <p>Only shop for 1-2 ingredients when needed - maximize your kitchen's potential</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="recipe-content">
              <RecipeDiscovery />
            </div>
          )}

          {activeTab === 'meal-plan' && (
            <div className="meal-plan-content">
              <MealPlanner />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard