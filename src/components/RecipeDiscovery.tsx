import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { ClaudeRecipeService, GeneratedRecipe, UserPreferences } from '../lib/claudeRecipeGeneration'
import { SavedRecipesService } from '../lib/savedRecipesService'
import './RecipeDiscovery.css'

interface RecipeWithMissing extends GeneratedRecipe {
  missing_ingredients: string[]
  missing_count: number
  is_saved?: boolean
}

const RecipeDiscovery: React.FC = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [userIngredients, setUserIngredients] = useState<string[]>([])
  const [suggestedRecipes, setSuggestedRecipes] = useState<RecipeWithMissing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null)

  const analyzeIngredients = async (imageUrls: string[]): Promise<string[]> => {
    try {
      console.log('🔍 Starting ingredient analysis with image URLs:', imageUrls)

      // Call our backend instead of Claude directly
      const response = await fetch('http://localhost:3001/api/analyze-ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrls })
      })

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`)
      }

      const data = await response.json()
      const ingredients = data.ingredients || []

      console.log(`✅ Successfully analyzed ${imageUrls.length} images, found ${ingredients.length} ingredients:`, ingredients)

      if (ingredients.length > 0) {
        return ingredients
      }

      throw new Error('No ingredients found')

    } catch (error) {
      console.error('❌ Ingredient analysis failed:', error)
      setError('Vision analysis failed. Using basic ingredients. Please check your images are uploaded correctly.')

      // Fallback to mock data if API fails
      return [
        'eggs', 'milk', 'bread', 'tomatoes', 'onions', 'cheese',
        'chicken', 'rice', 'olive oil', 'garlic'
      ]
    }
  }

  const convertRecipeToWithMissing = (
    recipe: GeneratedRecipe,
    availableIngredients: string[]
  ): RecipeWithMissing => {
    const missing = recipe.ingredients.filter(
      ingredient => !availableIngredients.some(
        available => available.toLowerCase().includes(ingredient.toLowerCase()) ||
                    ingredient.toLowerCase().includes(available.toLowerCase())
      )
    )

    return {
      ...recipe,
      missing_ingredients: missing,
      missing_count: missing.length,
      is_saved: false // Will be updated when we check saved recipes
    }
  }

  const saveRecipe = async (recipe: GeneratedRecipe) => {
    if (!user) return

    setSavingRecipe(recipe.id)
    try {
      const saved = await SavedRecipesService.saveRecipe(user.id, recipe)
      if (saved) {
        // Update the recipe to show it's saved
        setSuggestedRecipes(prev =>
          prev.map(r => r.id === recipe.id ? { ...r, is_saved: true } : r)
        )
      }
    } catch (error) {
      console.error('Failed to save recipe:', error)
    } finally {
      setSavingRecipe(null)
    }
  }

  const getUserPreferences = (): UserPreferences => {
    return {
      dietary_preferences: profile?.dietary_preferences || undefined,
      food_genres: profile?.food_genres || undefined,
      cooking_skill: 'intermediate', // Could be added to profile later
      time_preference: 'normal' // Could be added to profile later
    }
  }

  const getAdaptiveThreshold = (pantrySize: number) => {
    if (pantrySize <= 3) return Math.min(3, pantrySize + 2) // Very small pantry: allow up to 3-5 missing
    if (pantrySize <= 6) return 2 // Small pantry: stick to 2 missing max
    return 2 // Well-stocked pantry: stick to 2 missing max
  }

  const generateRecipes = async (ingredients: string[]) => {
    try {
      const preferences = getUserPreferences()

      console.log('🍳 Generating recipes for ingredients:', ingredients)

      // Call our backend for recipe generation
      const response = await fetch('http://localhost:3001/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients, preferences, count: 8 })
      })

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`)
      }

      const data = await response.json()
      const recipes = data.recipes || []

      console.log(`✅ Generated ${recipes.length} recipes`)

      const maxMissing = getAdaptiveThreshold(ingredients.length)

      // Convert to RecipeWithMissing format and filter
      const recipesWithMissing = recipes
        .map((recipe: GeneratedRecipe) => convertRecipeToWithMissing(recipe, ingredients))
        .filter((recipe: RecipeWithMissing) => recipe.missing_count <= maxMissing)
        .sort((a: RecipeWithMissing, b: RecipeWithMissing) => a.missing_count - b.missing_count)

      setSuggestedRecipes(recipesWithMissing)

      if (recipesWithMissing.length === 0) {
        await loadSavedRecipes(ingredients)
      }

    } catch (error) {
      console.error('Recipe generation failed:', error)
      await loadSavedRecipes(ingredients)
      setError('Using your saved recipes. Recipe generation temporarily unavailable.')
    }
  }

  const loadSavedRecipes = async (ingredients: string[]) => {
    if (!user) return

    try {
      const maxMissing = getAdaptiveThreshold(ingredients.length)
      const saved = await SavedRecipesService.getRecipesByIngredients(user.id, ingredients, maxMissing)

      const recipesWithMissing = saved.map(savedRecipe => {
        const recipe = SavedRecipesService.savedRecipeToGenerated(savedRecipe)
        return { ...convertRecipeToWithMissing(recipe, ingredients), is_saved: true }
      })

      setSuggestedRecipes(recipesWithMissing)

      if (recipesWithMissing.length === 0) {
        setError('No recipes found. Try uploading more ingredient photos or generate some new recipes!')
      }

    } catch (error) {
      console.error('Failed to load saved recipes:', error)
      setError('Failed to load recipes. Please try again.')
    }
  }

  useEffect(() => {
    const loadUserIngredientsAndRecipes = async () => {
      if (!user || !supabase) return

      try {
        // Get user's uploaded images
        const { data: images } = await supabase
          .from('user_images')
          .select('image_url')
          .eq('user_id', user.id)

        if (images && images.length > 0) {
          const imageUrls = images.map(img => img.image_url)
          const ingredients = await analyzeIngredients(imageUrls)
          setUserIngredients(ingredients)

          // Generate recipes with Claude AI
          await generateRecipes(ingredients)
        } else {
          setError('Please upload some ingredient photos first')
        }
      } catch (err) {
        console.error('Error loading recipes:', err)
        setError('Failed to load recipe suggestions. Using saved recipes.')

        // Fallback to saved recipes if generation fails
        const ingredients = await analyzeIngredients([])
        setUserIngredients(ingredients)
        await loadSavedRecipes(ingredients)
      } finally {
        setLoading(false)
      }
    }

    loadUserIngredientsAndRecipes()
  }, [user])

  if (loading) {
    return (
      <div className="recipe-discovery loading">
        <div className="spinner"></div>
        <p>Analyzing your ingredients and generating recipes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="recipe-discovery error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="recipe-discovery">
      <div className="ingredients-summary">
        <h3>Your Available Ingredients</h3>
        <div className="ingredient-tags">
          {userIngredients.map((ingredient, index) => (
            <span key={index} className="ingredient-tag">
              {ingredient}
            </span>
          ))}
        </div>
      </div>

      {(profile?.dietary_preferences || (profile?.food_genres && profile?.food_genres.length > 0)) && (
        <div className="preferences-summary">
          <h3>Your Preferences Applied ✨</h3>
          <div className="preference-tags">
            {profile?.dietary_preferences && (
              <div className="preference-group">
                <span className="preference-label">Dietary:</span>
                {profile.dietary_preferences.split(',').map((pref, index) => (
                  <span key={index} className="preference-tag dietary">
                    {pref.trim()}
                  </span>
                ))}
              </div>
            )}
            {profile?.food_genres && profile.food_genres.length > 0 && (
              <div className="preference-group">
                <span className="preference-label">Cuisines:</span>
                {profile.food_genres.map((genre, index) => (
                  <span key={index} className="preference-tag cuisine">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="preferences-note">Recipes are generated to match your preferences</p>
        </div>
      )}

      <div className="recipe-suggestions">
        <h3>AI-Generated Recipes {userIngredients.length <= 3 ? '(minimal shopping needed)' : '(0-2 ingredients needed)'}</h3>
        {userIngredients.length <= 3 && (
          <p className="adaptive-notice">
            Since you have a smaller pantry, we're showing recipes that may need 3-5 ingredients to give you more options.
          </p>
        )}
        {suggestedRecipes.length === 0 ? (
          <p>No recipes found with your current ingredients. Try uploading more photos!</p>
        ) : (
          <div className="recipe-grid">
            {suggestedRecipes.map(recipe => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-header">
                  <h4>{recipe.title}</h4>
                  <div className="recipe-meta">
                    <span className="cuisine">{Array.isArray(recipe.cuisine) ? recipe.cuisine.join(', ') : recipe.cuisine}</span>
                    <span className="time">{recipe.prep_time + recipe.cook_time} min</span>
                    <span className="difficulty">{recipe.difficulty}</span>
                  </div>
                </div>

                <p className="recipe-description">{recipe.description}</p>

                <div className="missing-ingredients">
                  {recipe.missing_count === 0 ? (
                    <div className="perfect-match">✅ Perfect match! No shopping needed</div>
                  ) : (
                    <div className="need-to-buy">
                      <span className="missing-count">Need {recipe.missing_count} ingredient{recipe.missing_count > 1 ? 's' : ''}:</span>
                      <div className="missing-list">
                        {recipe.missing_ingredients.map((ingredient, index) => (
                          <span key={index} className="missing-ingredient">
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {recipe.tips && recipe.tips.length > 0 && (
                  <div className="recipe-tips">
                    <h5>💡 Tips:</h5>
                    <ul>
                      {recipe.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="recipe-actions">
                  <button className="view-recipe-btn">View Full Recipe</button>
                  {!recipe.is_saved ? (
                    <button
                      className="save-recipe-btn"
                      onClick={() => saveRecipe(recipe)}
                      disabled={savingRecipe === recipe.id}
                    >
                      {savingRecipe === recipe.id ? 'Saving...' : '❤️ Save'}
                    </button>
                  ) : (
                    <span className="saved-indicator">✅ Saved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecipeDiscovery