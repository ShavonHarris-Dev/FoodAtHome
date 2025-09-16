import React, { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import './PaymentForm.css'

interface PaymentFormProps {
  onPaymentSuccess: () => void
}

type SubscriptionTier = 'basic' | 'premium'

const PaymentForm: React.FC<PaymentFormProps> = ({ onPaymentSuccess }) => {
  const { updateProfile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('premium')

  const handlePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      // Simulate payment process for now
      // In a real app, you would integrate with Stripe here
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update user profile with subscription tier
      await updateProfile({
        has_paid: true,
        subscription_tier: selectedPlan
      })

      onPaymentSuccess()
    } catch (err) {
      setError('Payment failed. Please try again.')
      console.error('Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  const planDetails = {
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
  }

  return (
    <div className="payment-form">
      <div className="payment-container">
        <h2>Choose Your Subscription Plan</h2>

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

          {error && <div className="error-message">{error}</div>}

          <button
            className="payment-button"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading
              ? 'Processing Payment...'
              : `Start ${selectedPlan} Plan - $${planDetails[selectedPlan].price}/month`
            }
          </button>

          <p className="payment-note">
            Secure payment powered by Stripe. Cancel anytime. Your payment information is safe and encrypted.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentForm