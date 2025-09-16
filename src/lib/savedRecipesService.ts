import { supabase, Database } from './supabase'
import { GeneratedRecipe } from './claudeRecipeGeneration'

type SavedRecipeRow = Database['public']['Tables']['saved_recipes']['Row']
type SavedRecipeInsert = Database['public']['Tables']['saved_recipes']['Insert']

export interface SavedRecipe extends SavedRecipeRow {
  // Additional computed properties can go here
}

export class SavedRecipesService {
  // Save a generated recipe to the user's collection
  static async saveRecipe(userId: string, recipe: GeneratedRecipe): Promise<SavedRecipe | null> {
    if (!supabase) {
      console.warn('Supabase not configured')
      return null
    }

    try {
      const recipeToSave: SavedRecipeInsert = {
        user_id: userId,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
        cuisine: recipe.cuisine,
        dietary_tags: recipe.dietary_tags,
        difficulty: recipe.difficulty,
        tips: recipe.tips || null,
        variations: recipe.variations || null,
        is_generated: true,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('saved_recipes')
        .insert(recipeToSave)
        .select()
        .single()

      if (error) {
        console.error('Error saving recipe:', error)
        return null
      }

      console.log('Recipe saved successfully:', data.title)
      return data

    } catch (error) {
      console.error('Failed to save recipe:', error)
      return null
    }
  }

  // Get all saved recipes for a user
  static async getUserRecipes(userId: string): Promise<SavedRecipe[]> {
    if (!supabase) {
      console.warn('Supabase not configured')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching saved recipes:', error)
        return []
      }

      return data || []

    } catch (error) {
      console.error('Failed to fetch saved recipes:', error)
      return []
    }
  }

  // Get saved recipes that can be made with available ingredients
  static async getRecipesByIngredients(
    userId: string,
    availableIngredients: string[],
    maxMissingIngredients: number = 2
  ): Promise<SavedRecipe[]> {
    if (!supabase) {
      console.warn('Supabase not configured')
      return []
    }

    try {
      const allRecipes = await this.getUserRecipes(userId)

      // Filter recipes by ingredient availability
      const matchingRecipes = allRecipes.filter(recipe => {
        const missingCount = recipe.ingredients.filter(ingredient =>
          !availableIngredients.some(available =>
            available.toLowerCase().includes(ingredient.toLowerCase()) ||
            ingredient.toLowerCase().includes(available.toLowerCase())
          )
        ).length

        return missingCount <= maxMissingIngredients
      })

      // Sort by fewest missing ingredients
      return matchingRecipes.sort((a, b) => {
        const aMissing = a.ingredients.filter(ingredient =>
          !availableIngredients.some(available =>
            available.toLowerCase().includes(ingredient.toLowerCase()) ||
            ingredient.toLowerCase().includes(available.toLowerCase())
          )
        ).length

        const bMissing = b.ingredients.filter(ingredient =>
          !availableIngredients.some(available =>
            available.toLowerCase().includes(ingredient.toLowerCase()) ||
            ingredient.toLowerCase().includes(available.toLowerCase())
          )
        ).length

        return aMissing - bMissing
      })

    } catch (error) {
      console.error('Failed to filter recipes by ingredients:', error)
      return []
    }
  }

  // Delete a saved recipe
  static async deleteRecipe(userId: string, recipeId: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured')
      return false
    }

    try {
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('id', recipeId)
        .eq('user_id', userId) // Ensure user can only delete their own recipes

      if (error) {
        console.error('Error deleting recipe:', error)
        return false
      }

      console.log('Recipe deleted successfully')
      return true

    } catch (error) {
      console.error('Failed to delete recipe:', error)
      return false
    }
  }

  // Update a saved recipe
  static async updateRecipe(
    userId: string,
    recipeId: string,
    updates: Partial<GeneratedRecipe>
  ): Promise<SavedRecipe | null> {
    if (!supabase) {
      console.warn('Supabase not configured')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId)
        .eq('user_id', userId) // Ensure user can only update their own recipes
        .select()
        .single()

      if (error) {
        console.error('Error updating recipe:', error)
        return null
      }

      console.log('Recipe updated successfully:', data.title)
      return data

    } catch (error) {
      console.error('Failed to update recipe:', error)
      return null
    }
  }

  // Check if a recipe is already saved (to prevent duplicates)
  static async isRecipeSaved(userId: string, recipeTitle: string): Promise<boolean> {
    if (!supabase) {
      return false
    }

    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('id')
        .eq('user_id', userId)
        .eq('title', recipeTitle)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking if recipe is saved:', error)
        return false
      }

      return !!data

    } catch (error) {
      console.error('Failed to check if recipe is saved:', error)
      return false
    }
  }

  // Get recipe statistics for the user
  static async getRecipeStats(userId: string): Promise<{
    total: number
    byCuisine: Record<string, number>
    byDifficulty: Record<string, number>
    averageCookTime: number
  }> {
    if (!supabase) {
      return { total: 0, byCuisine: {}, byDifficulty: {}, averageCookTime: 0 }
    }

    try {
      const recipes = await this.getUserRecipes(userId)

      const stats = {
        total: recipes.length,
        byCuisine: {} as Record<string, number>,
        byDifficulty: {} as Record<string, number>,
        averageCookTime: 0
      }

      recipes.forEach(recipe => {
        // Count by cuisine
        recipe.cuisine.forEach(cuisine => {
          stats.byCuisine[cuisine] = (stats.byCuisine[cuisine] || 0) + 1
        })

        // Count by difficulty
        stats.byDifficulty[recipe.difficulty] = (stats.byDifficulty[recipe.difficulty] || 0) + 1
      })

      // Calculate average cook time
      if (recipes.length > 0) {
        const totalCookTime = recipes.reduce((sum, recipe) => sum + recipe.cook_time, 0)
        stats.averageCookTime = Math.round(totalCookTime / recipes.length)
      }

      return stats

    } catch (error) {
      console.error('Failed to get recipe stats:', error)
      return { total: 0, byCuisine: {}, byDifficulty: {}, averageCookTime: 0 }
    }
  }

  // Convert SavedRecipe to GeneratedRecipe format (for compatibility)
  static savedRecipeToGenerated(savedRecipe: SavedRecipe): GeneratedRecipe {
    return {
      id: savedRecipe.id,
      title: savedRecipe.title,
      description: savedRecipe.description || '',
      ingredients: savedRecipe.ingredients,
      instructions: savedRecipe.instructions,
      prep_time: savedRecipe.prep_time,
      cook_time: savedRecipe.cook_time,
      servings: savedRecipe.servings,
      cuisine: savedRecipe.cuisine,
      dietary_tags: savedRecipe.dietary_tags,
      difficulty: savedRecipe.difficulty as 'easy' | 'medium' | 'hard',
      tips: savedRecipe.tips || undefined,
      variations: savedRecipe.variations || undefined
    }
  }
}