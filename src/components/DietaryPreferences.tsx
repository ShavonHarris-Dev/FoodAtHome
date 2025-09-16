import React from 'react'
import './DietaryPreferences.css'

interface DietaryPreferencesProps {
  preferences: string
  onPreferencesChange: (preferences: string) => void
}

const commonPreferences = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Dairy-Free',
  'Nut-Free',
  'Halal',
  'Kosher'
]

const DietaryPreferences: React.FC<DietaryPreferencesProps> = ({
  preferences,
  onPreferencesChange
}) => {
  const addPreference = (preference: string) => {
    const currentPrefs = preferences ? preferences.split(', ').filter(p => p.trim()) : []
    if (!currentPrefs.includes(preference)) {
      const newPrefs = [...currentPrefs, preference]
      onPreferencesChange(newPrefs.join(', '))
    }
  }

  const removePreference = (preferenceToRemove: string) => {
    const currentPrefs = preferences ? preferences.split(', ').filter(p => p.trim()) : []
    const newPrefs = currentPrefs.filter(p => p !== preferenceToRemove)
    onPreferencesChange(newPrefs.join(', '))
  }

  const currentPreferencesList = preferences ? preferences.split(', ').filter(p => p.trim()) : []

  return (
    <div className="dietary-preferences">
      <h3>Dietary Preferences & Restrictions</h3>
      <p>Tell us about any dietary requirements or preferences you have</p>

      <div className="quick-select">
        <h4>Quick Select</h4>
        <div className="preference-buttons">
          {commonPreferences.map(pref => (
            <button
              key={pref}
              type="button"
              className={`preference-button ${currentPreferencesList.includes(pref) ? 'selected' : ''}`}
              onClick={() => currentPreferencesList.includes(pref) ? removePreference(pref) : addPreference(pref)}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-input">
        <label htmlFor="dietary-input">
          <h4>Custom Preferences</h4>
          <p>Enter your dietary preferences, allergies, or restrictions (separate with commas)</p>
        </label>
        <textarea
          id="dietary-input"
          value={preferences}
          onChange={(e) => onPreferencesChange(e.target.value)}
          placeholder="e.g., Vegan, Gluten-Free, No shellfish, Low sodium..."
          rows={4}
          maxLength={500}
        />
        <div className="character-count">
          {preferences.length}/500 characters
        </div>
      </div>

      {currentPreferencesList.length > 0 && (
        <div className="selected-preferences">
          <h4>Your Dietary Preferences</h4>
          <div className="preference-tags">
            {currentPreferencesList.map((pref, index) => (
              <div key={index} className="preference-tag">
                <span>{pref}</span>
                <button
                  type="button"
                  onClick={() => removePreference(pref)}
                  className="remove-preference"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DietaryPreferences