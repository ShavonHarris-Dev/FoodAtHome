import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { SpoonacularService, SpoonacularRecipe, SpoonacularRecipeDetails } from '../lib/spoonacular'
import './RecipeDiscovery.css'

interface Recipe {
  id: string
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: number
  cook_time: number
  servings: number
  cuisine: string[]
  dietary_tags: string[]
  image?: string
  nutrition?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

interface RecipeWithMissing extends Recipe {
  missing_ingredients: string[]
  missing_count: number
}

const RecipeDiscovery: React.FC = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [userIngredients, setUserIngredients] = useState<string[]>([])
  const [suggestedRecipes, setSuggestedRecipes] = useState<RecipeWithMissing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const analyzeIngredients = async (imageUrls: string[]): Promise<string[]> => {
    // This would integrate with an AI service to analyze images
    // For now, return mock ingredients
    return [
      'eggs', 'milk', 'bread', 'tomatoes', 'onions', 'cheese',
      'chicken breast', 'rice', 'olive oil', 'garlic'
    ]
  }

  // Convert Spoonacular recipe to our Recipe format
  const convertSpoonacularRecipe = (
    spoonRecipe: SpoonacularRecipe,
    details?: SpoonacularRecipeDetails
  ): RecipeWithMissing => {
    // Extract nutrition data if available
    let nutrition: Recipe['nutrition'] | undefined
    if (details?.nutrition) {
      const nutrients = details.nutrition.nutrients
      nutrition = {
        calories: nutrients.find(n => n.name === 'Calories')?.amount || 0,
        protein: nutrients.find(n => n.name === 'Protein')?.amount || 0,
        carbs: nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0,
        fat: nutrients.find(n => n.name === 'Fat')?.amount || 0
      }
    }

    // Extract instructions
    let instructions: string[] = []
    if (details?.analyzedInstructions && details.analyzedInstructions.length > 0) {
      instructions = details.analyzedInstructions[0].steps.map(step => step.step)
    } else if (details?.instructions) {
      // Simple fallback - split by periods or line breaks
      instructions = details.instructions
        .split(/[.\n]/)
        .filter(inst => inst.trim().length > 10)
        .map(inst => inst.trim())
    }

    return {
      id: spoonRecipe.id.toString(),
      title: spoonRecipe.title,
      description: details?.summary || spoonRecipe.title,
      ingredients: spoonRecipe.usedIngredients.concat(spoonRecipe.missedIngredients).map(ing => ing.name),
      instructions,
      prep_time: details?.preparationMinutes || 10,
      cook_time: details?.cookingMinutes || details?.readyInMinutes || 20,
      servings: details?.servings || 2,
      cuisine: details?.cuisines || [],
      dietary_tags: details?.diets || [],
      image: spoonRecipe.image,
      nutrition,
      missing_ingredients: spoonRecipe.missedIngredients.map(ing => ing.name),
      missing_count: spoonRecipe.missedIngredientCount
    }
  }

  const findRecipesWithMinimalIngredients = (
    recipes: Recipe[],
    availableIngredients: string[]
  ): RecipeWithMissing[] => {
    // Calculate adaptive threshold based on pantry size
    const getMaxMissingIngredients = (pantrySize: number) => {
      if (pantrySize <= 3) return Math.min(3, pantrySize + 2) // Very small pantry: allow up to 3-5 missing
      if (pantrySize <= 6) return 2 // Small pantry: stick to 2 missing max
      return 2 // Well-stocked pantry: stick to 2 missing max
    }

    const maxMissing = getMaxMissingIngredients(availableIngredients.length)

    return recipes
      .map(recipe => {
        const missing = recipe.ingredients.filter(
          ingredient => !availableIngredients.some(
            available => available.toLowerCase().includes(ingredient.toLowerCase()) ||
                        ingredient.toLowerCase().includes(available.toLowerCase())
          )
        )

        return {
          ...recipe,
          missing_ingredients: missing,
          missing_count: missing.length
        }
      })
      .filter(recipe => recipe.missing_count <= maxMissing)
      .sort((a, b) => a.missing_count - b.missing_count) // Sort by fewest missing ingredients first
  }

  const getMockRecipes = (): Recipe[] => {
    return [
      {
        id: '1',
        title: 'Classic Scrambled Eggs',
        description: 'Creamy scrambled eggs with a touch of milk',
        ingredients: ['eggs', 'milk', 'salt', 'pepper'],
        instructions: ['Beat eggs with milk', 'Heat pan', 'Cook stirring gently'],
        prep_time: 5,
        cook_time: 5,
        servings: 2,
        cuisine: ['American'],
        dietary_tags: ['vegetarian'],
        nutrition: {
          calories: 280,
          protein: 20,
          carbs: 4,
          fat: 18
        }
      },
      {
        id: '2',
        title: 'Simple Fried Eggs',
        description: 'Quick and easy fried eggs',
        ingredients: ['eggs', 'oil'],
        instructions: ['Heat oil in pan', 'Crack eggs', 'Cook until done'],
        prep_time: 2,
        cook_time: 3,
        servings: 1,
        cuisine: ['American'],
        dietary_tags: ['vegetarian', 'quick']
      },
      {
        id: '3',
        title: 'Buttered Toast',
        description: 'Simple buttered toast',
        ingredients: ['bread', 'butter'],
        instructions: ['Toast bread', 'Spread butter'],
        prep_time: 2,
        cook_time: 2,
        servings: 1,
        cuisine: ['American'],
        dietary_tags: ['vegetarian', 'quick']
      },
      {
        id: '4',
        title: 'Chicken Rice Bowl',
        description: 'Simple chicken and rice with vegetables',
        ingredients: ['chicken breast', 'rice', 'onions', 'garlic', 'olive oil'],
        instructions: ['Cook rice', 'Season and cook chicken', 'Sauté onions and garlic'],
        prep_time: 10,
        cook_time: 25,
        servings: 3,
        cuisine: ['Asian'],
        dietary_tags: ['protein-rich'],
        nutrition: {
          calories: 520,
          protein: 45,
          carbs: 58,
          fat: 12
        }
      },
      {
        id: '5',
        title: 'Tomato Garlic Pasta',
        description: 'Fresh pasta with tomatoes and garlic',
        ingredients: ['pasta', 'tomatoes', 'garlic', 'olive oil', 'basil'],
        instructions: ['Cook pasta', 'Sauté garlic', 'Add tomatoes and simmer'],
        prep_time: 10,
        cook_time: 15,
        servings: 4,
        cuisine: ['Italian'],
        dietary_tags: ['vegetarian']
      },
      {
        id: '6',
        title: 'Basic Grilled Cheese',
        description: 'Classic grilled cheese sandwich',
        ingredients: ['bread', 'cheese', 'butter'],
        instructions: ['Butter bread', 'Add cheese', 'Grill until golden'],
        prep_time: 3,
        cook_time: 5,
        servings: 1,
        cuisine: ['American'],
        dietary_tags: ['vegetarian', 'comfort-food']
      }
    ]
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

          // Use Spoonacular API to find recipes
          await fetchSpoonacularRecipes(ingredients)
        } else {
          setError('Please upload some ingredient photos first')
        }
      } catch (err) {
        console.error('Error loading recipes:', err)
        setError('Failed to load recipe suggestions. Using backup recipes.')

        // Fallback to mock data if API fails
        const ingredients = await analyzeIngredients([])
        setUserIngredients(ingredients)
        const recipes = getMockRecipes()
        const filtered = findRecipesWithMinimalIngredients(recipes, ingredients)
        setSuggestedRecipes(filtered)
      } finally {
        setLoading(false)
      }
    }

    loadUserIngredientsAndRecipes()
  }, [user])

  const fetchSpoonacularRecipes = async (ingredients: string[]) => {
    try {
      // Format ingredients for Spoonacular
      const formattedIngredients = SpoonacularService.formatIngredientsForSearch(ingredients)

      // Find recipes by ingredients
      const spoonRecipes = await SpoonacularService.findByIngredients(formattedIngredients, {
        number: 20, // Get more to have options after filtering
        ranking: 2  // Minimize missing ingredients
      })

      // Calculate adaptive threshold
      const getMaxMissingIngredients = (pantrySize: number) => {
        if (pantrySize <= 3) return Math.min(3, pantrySize + 2)
        if (pantrySize <= 6) return 2
        return 2
      }

      const maxMissing = getMaxMissingIngredients(ingredients.length)

      // Filter recipes based on missing ingredient count
      const filteredRecipes = spoonRecipes.filter(recipe =>
        recipe.missedIngredientCount <= maxMissing
      )

      // Get detailed information for premium users (with nutrition)
      const shouldIncludeNutrition = profile?.subscription_tier === 'premium'

      if (filteredRecipes.length > 0) {
        // Get detailed recipe information in batches to avoid API limits
        const recipeIds = filteredRecipes.slice(0, 10).map(r => r.id) // Limit to 10 recipes

        let detailedRecipes: SpoonacularRecipeDetails[] = []

        if (shouldIncludeNutrition) {
          // Get detailed info with nutrition for premium users
          detailedRecipes = await SpoonacularService.getBulkRecipeInformation(recipeIds, true)
        }

        // Convert to our format
        const convertedRecipes = filteredRecipes.slice(0, 10).map(spoonRecipe => {
          const details = detailedRecipes.find(d => d.id === spoonRecipe.id)
          return convertSpoonacularRecipe(spoonRecipe, details)
        })

        // Sort by fewest missing ingredients
        const sortedRecipes = convertedRecipes.sort((a, b) => a.missing_count - b.missing_count)

        setSuggestedRecipes(sortedRecipes)
      } else {
        setError('No recipes found with your current ingredients. Try uploading more photos!')
      }

    } catch (apiError) {
      console.error('Spoonacular API Error:', apiError)

      // Fallback to mock data
      const recipes = getMockRecipes()
      const filtered = findRecipesWithMinimalIngredients(recipes, ingredients)
      setSuggestedRecipes(filtered)

      setError('Using sample recipes. API temporarily unavailable.')
    }
  }

  if (loading) {
    return (
      <div className="recipe-discovery loading">
        <div className="spinner"></div>
        <p>Analyzing your ingredients and finding recipes...</p>
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

      <div className="recipe-suggestions">
        <h3>Recipes You Can Make {userIngredients.length <= 3 ? '(minimal shopping needed)' : '(0-2 ingredients needed)'}</h3>
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
                {recipe.image && (
                  <div className="recipe-image">
                    <img src={recipe.image} alt={recipe.title} />
                  </div>
                )}
                <div className="recipe-header">
                  <h4>{recipe.title}</h4>
                  <div className="recipe-meta">
                    <span className="cuisine">{Array.isArray(recipe.cuisine) ? recipe.cuisine.join(', ') : recipe.cuisine}</span>
                    <span className="time">{recipe.prep_time + recipe.cook_time} min</span>
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

                {profile?.subscription_tier === 'premium' && recipe.nutrition && (
                  <div className="nutrition-info">
                    <h5>Nutrition (per serving)</h5>
                    <div className="nutrition-grid">
                      <div className="nutrition-item">
                        <span className="nutrition-value">{recipe.nutrition.calories}</span>
                        <span className="nutrition-label">Calories</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="nutrition-value">{recipe.nutrition.protein}g</span>
                        <span className="nutrition-label">Protein</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="nutrition-value">{recipe.nutrition.carbs}g</span>
                        <span className="nutrition-label">Carbs</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="nutrition-value">{recipe.nutrition.fat}g</span>
                        <span className="nutrition-label">Fat</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="recipe-actions">
                  <button className="view-recipe-btn">View Recipe</button>
                  {profile?.subscription_tier !== 'premium' && (
                    <div className="nutrition-upgrade">
                      <span>Get nutrition info with Premium!</span>
                    </div>
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