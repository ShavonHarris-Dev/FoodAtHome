import React, { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import './MealPlanner.css'

interface MealPlan {
  breakfast: string | null
  lunch: string | null
  dinner: string | null
}

interface WeekPlan {
  [key: string]: MealPlan
}

const MealPlanner: React.FC = () => {
  const { profile } = useProfile()
  const [selectedDay, setSelectedDay] = useState('monday')
  const [weekPlan, setWeekPlan] = useState<WeekPlan>({
    monday: { breakfast: null, lunch: null, dinner: null },
    tuesday: { breakfast: null, lunch: null, dinner: null },
    wednesday: { breakfast: null, lunch: null, dinner: null },
    thursday: { breakfast: null, lunch: null, dinner: null },
    friday: { breakfast: null, lunch: null, dinner: null },
    saturday: { breakfast: null, lunch: null, dinner: null },
    sunday: { breakfast: null, lunch: null, dinner: null }
  })

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  const mealTypes = [
    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { key: 'lunch', label: 'Lunch', icon: '☀️' },
    { key: 'dinner', label: 'Dinner', icon: '🌙' }
  ]

  // Mock recipes for meal planning
  const availableRecipes = [
    'Scrambled Eggs',
    'Avocado Toast',
    'Greek Yogurt Bowl',
    'Chicken Rice Bowl',
    'Caesar Salad',
    'Grilled Chicken',
    'Pasta with Tomatoes',
    'Stir Fry Vegetables',
    'Beef Tacos'
  ]

  const updateMeal = (day: string, mealType: string, recipe: string) => {
    setWeekPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: recipe
      }
    }))
  }

  const clearMeal = (day: string, mealType: string) => {
    setWeekPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: null
      }
    }))
  }

  if (profile?.subscription_tier !== 'premium') {
    return (
      <div className="meal-planner-premium">
        <div className="premium-upgrade">
          <h3>🍽️ Meal Planning - Premium Feature</h3>
          <p>Plan your breakfast, lunch, and dinner for the entire week!</p>
          <div className="upgrade-benefits">
            <ul>
              <li>✅ Weekly meal planning</li>
              <li>✅ Drag & drop meal organization</li>
              <li>✅ Meal prep suggestions</li>
              <li>✅ Grocery list generation</li>
            </ul>
          </div>
          <button className="upgrade-button">
            Upgrade to Premium - $7.99/month
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="meal-planner">
      <div className="planner-header">
        <h2>📅 Weekly Meal Planner</h2>
        <p>Plan your meals for the week and stay organized!</p>
      </div>

      <div className="day-selector">
        {daysOfWeek.map(day => (
          <button
            key={day.key}
            className={`day-button ${selectedDay === day.key ? 'active' : ''}`}
            onClick={() => setSelectedDay(day.key)}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="meal-planning-grid">
        <div className="selected-day-plan">
          <h3>{daysOfWeek.find(d => d.key === selectedDay)?.label} Plan</h3>

          {mealTypes.map(meal => (
            <div key={meal.key} className="meal-slot">
              <div className="meal-header">
                <span className="meal-icon">{meal.icon}</span>
                <h4>{meal.label}</h4>
              </div>

              <div className="meal-content">
                {weekPlan[selectedDay][meal.key as keyof MealPlan] ? (
                  <div className="assigned-meal">
                    <span>{weekPlan[selectedDay][meal.key as keyof MealPlan]}</span>
                    <button
                      className="clear-meal"
                      onClick={() => clearMeal(selectedDay, meal.key)}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="empty-meal">
                    <span>No meal planned</span>
                  </div>
                )}
              </div>

              <div className="meal-selector">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      updateMeal(selectedDay, meal.key, e.target.value)
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="">Choose a recipe...</option>
                  {availableRecipes.map(recipe => (
                    <option key={recipe} value={recipe}>
                      {recipe}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="week-overview">
          <h3>Week Overview</h3>
          <div className="week-grid">
            {daysOfWeek.map(day => (
              <div
                key={day.key}
                className={`day-overview ${selectedDay === day.key ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day.key)}
              >
                <h5>{day.label.slice(0, 3)}</h5>
                <div className="day-meals">
                  {mealTypes.map(meal => (
                    <div
                      key={meal.key}
                      className={`mini-meal ${weekPlan[day.key][meal.key as keyof MealPlan] ? 'planned' : 'empty'}`}
                    >
                      {meal.icon}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="planner-actions">
        <button className="action-button secondary">Generate Grocery List</button>
        <button className="action-button primary">Save Meal Plan</button>
      </div>
    </div>
  )
}

export default MealPlanner