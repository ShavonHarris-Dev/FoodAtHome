import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './HomePage.css'

const HomePage: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (error: any) {
      console.error('Email auth error:', error)
      setAuthError(error.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="homepage">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <svg className="nav-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.5 2A1.5 1.5 0 0 1 20 3.5V11h-1V4H5v16h6v1H4.5A1.5 1.5 0 0 1 3 19.5V3.5A1.5 1.5 0 0 1 4.5 2h14zm-7.75 6.5C10.75 7.12 9.62 6 8.25 6S5.75 7.12 5.75 8.5 6.88 11 8.25 11s2.5-1.12 2.5-2.5zM19 13v8h-8v-8h8zm-1 1h-6v6h6v-6z"/>
            </svg>
            Food at Home
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <section className="hero">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">
                Turn Your Kitchen Into
                <span className="hero-accent"> Recipe Central</span>
              </h1>
              <p className="hero-description">
                AI-powered recipe discovery using the ingredients you already have.
                Get recipes that require 0-2 additional ingredients max - save money
                by cooking with what's in your kitchen.
              </p>

              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">10+</span>
                  <span className="stat-label">Cuisine Types</span>
                </div>
                <div className="stat">
                  <span className="stat-number">AI</span>
                  <span className="stat-label">Powered</span>
                </div>
                <div className="stat">
                  <span className="stat-number">$5</span>
                  <span className="stat-label">One-time</span>
                </div>
              </div>

              <div className="hero-cta">
                <div className="auth-container">
                  <form onSubmit={handleEmailAuth} className="auth-form">
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="auth-input"
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="auth-input"
                      />
                    </div>

                    {authError && (
                      <div className="auth-error">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="cta-button primary"
                      disabled={authLoading || loading}
                    >
                      {authLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="auth-toggle"
                    >
                      {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
                    </button>
                  </form>

                  <div className="auth-divider">
                    <span>OR</span>
                  </div>

                  <button
                    className="cta-button google"
                    onClick={handleGoogleSignIn}
                    disabled={loading || authLoading}
                  >
                    <svg className="button-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Loading...' : 'Continue with Google'}
                  </button>
                </div>
                <p className="cta-note">Free to start • No credit card required</p>
              </div>
            </div>

            <div className="hero-visual">
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="app-preview">
                    <div className="preview-header">
                      <div className="preview-avatar"></div>
                      <div className="preview-text">
                        <div className="preview-line short"></div>
                        <div className="preview-line"></div>
                      </div>
                    </div>
                    <div className="preview-images">
                      <div className="preview-img"></div>
                      <div className="preview-img"></div>
                      <div className="preview-img"></div>
                      <div className="preview-img"></div>
                    </div>
                    <div className="preview-recipe">
                      <div className="recipe-title"></div>
                      <div className="recipe-meta"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="section-container">
            <h2 className="section-title">Everything You Need</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 2l3 6 6 .75-4.12 4.12L15 19l-6-3.27L3 19l1.12-6.13L0 8.75 6 8l3-6z"/>
                  </svg>
                </div>
                <h3>Smart Photo Recognition</h3>
                <p>Upload photos of your fridge and pantry. Our AI identifies ingredients automatically.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3>Personalized Recipes</h3>
                <p>Get recipes tailored to your ingredients, dietary preferences, and favorite cuisines.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                  </svg>
                </div>
                <h3>Save Money, Zero Waste</h3>
                <p>Only get recipes requiring 0-2 additional ingredients. No grocery shopping needed - cook with what you have.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="pricing">
          <div className="section-container">
            <h2 className="section-title">Choose Your Plan</h2>
            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="pricing-header">
                  <h3>Basic</h3>
                  <div className="price">
                    <span className="currency">$</span>
                    <span className="amount">4.99</span>
                    <span className="period">/month</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>✓ Unlimited photo uploads</li>
                  <li>✓ Smart recipe discovery (0-2 ingredients)</li>
                  <li>✓ Multiple cuisine preferences</li>
                  <li>✓ Dietary restriction support</li>
                  <li>✓ Save money on groceries</li>
                </ul>
              </div>

              <div className="pricing-card premium">
                <div className="pricing-badge">Most Popular</div>
                <div className="pricing-header">
                  <h3>Premium</h3>
                  <div className="price">
                    <span className="currency">$</span>
                    <span className="amount">7.99</span>
                    <span className="period">/month</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>✓ Everything in Basic</li>
                  <li>✓ Meal planning (breakfast, lunch, dinner)</li>
                  <li>✓ Calorie tracking & goals</li>
                  <li>✓ Macro tracking (protein, carbs, fat)</li>
                  <li>✓ Nutrition insights</li>
                  <li>✓ Advanced recipe filtering</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <p>&copy; 2024 Food at Home. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage