import React, { useState, useEffect, useMemo } from 'react'
import {
  useStripe,
  useElements,
  CardElement,
  Elements
} from '@stripe/react-stripe-js'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../contexts/AuthContext'
import stripePromise from '../lib/stripe'
import './PaymentForm.css'

interface PaymentFormProps {
  onPaymentSuccess: () => void
}

type SubscriptionTier = 'basic' | 'premium'

const PaymentFormContent: React.FC<PaymentFormProps> = ({ onPaymentSuccess }) => {
  const stripe = useStripe()
  const elements = useElements()
  const { updateProfile } = useProfile()
  const { signOut, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('premium')
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const planDetails = useMemo(() => ({
    basic: {
      price: 4.99,
      features: [
        'Unlimited photo uploads',
        'Smart recipe discovery (0-2 ingredients)',
        'Multiple cuisine preferences',
        'Dietary restriction support',
        'Save money on groceries'
      ]
    },
    premium: {
      price: 7.99,
      features: [
        'Everything in Basic',
        'Meal planning (breakfast, lunch, dinner)',
        'Calorie tracking & goals',
        'Macro tracking (protein, carbs, fat)',
        'Nutrition insights',
        'Advanced recipe filtering'
      ]
    }
  }), [])

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'
        const response = await fetch(`${baseUrl}/api/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: planDetails[selectedPlan].price,
            subscription_tier: selectedPlan
          })
        })

        const { client_secret } = await response.json()
        setClientSecret(client_secret)
      } catch (err) {
        console.error('Error creating payment intent:', err)
        setError('Failed to initialize payment. Please try again.')
      }
    }

    createPaymentIntent()
  }, [selectedPlan, planDetails])

  const handlePayment = async () => {
    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)

      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (paymentIntent.status === 'succeeded') {
        // Update user profile with subscription tier
        await updateProfile({
          has_paid: true,
          subscription_tier: selectedPlan
        })

        onPaymentSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
      console.error('Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipPayment = async () => {
    setLoading(true)
    try {
      // Update user profile to skip payment (development only)
      await updateProfile({
        has_paid: true,
        subscription_tier: selectedPlan
      })
      onPaymentSuccess()
    } catch (err: any) {
      setError('Failed to skip payment. Please try again.')
      console.error('Skip payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="payment-form">
      <div className="payment-container">
        <div className="payment-header">
          <h2>Choose Your Subscription Plan</h2>
          <button
            onClick={signOut}
            className="sign-out-link"
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign out ({user?.email})
          </button>
        </div>

        <div className="plan-selector">
          <div
            className={`plan-option ${selectedPlan === 'basic' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('basic')}
          >
            <h3>Basic</h3>
            <div className="plan-price">${planDetails.basic.price}/month</div>
            <ul>
              {planDetails.basic.features.map((feature, index) => (
                <li key={index}>✅ {feature}</li>
              ))}
            </ul>
          </div>

          <div
            className={`plan-option ${selectedPlan === 'premium' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('premium')}
          >
            <div className="popular-badge">Most Popular</div>
            <h3>Premium</h3>
            <div className="plan-price">${planDetails.premium.price}/month</div>
            <ul>
              {planDetails.premium.features.map((feature, index) => (
                <li key={index}>✅ {feature}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="payment-details">
          <div className="price-section">
            <span className="price">${planDetails[selectedPlan].price}/month</span>
            <span className="price-description">Cancel anytime</span>
          </div>

          <div className="card-element-container">
            <label htmlFor="card-element">Credit or Debit Card</label>
            <CardElement
              id="card-element"
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="payment-button"
            onClick={handlePayment}
            disabled={loading || !stripe || !clientSecret}
          >
            {loading
              ? 'Processing Payment...'
              : `Start ${selectedPlan} Plan - $${planDetails[selectedPlan].price}/month`
            }
          </button>

          {(process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.NODE_ENV !== 'production') && (
            <button
              className="skip-payment-button"
              onClick={handleSkipPayment}
              disabled={loading}
              style={{
                marginTop: '10px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Skip Payment (Development Only)
            </button>
          )}

          <p className="payment-note">
            Secure payment powered by Stripe. Cancel anytime. Your payment information is safe and encrypted.
          </p>
        </div>
      </div>
    </div>
  )
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onPaymentSuccess }) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent onPaymentSuccess={onPaymentSuccess} />
    </Elements>
  )
}

export default PaymentForm