import { FirestoreService, SavedRecipe as FirestoreSavedRecipe } from '../services/FirestoreService'
import { GeneratedRecipe } from './claudeRecipeGeneration'

export interface SavedRecipe extends FirestoreSavedRecipe {
  // Additional computed properties can go here
}

export class SavedRecipesService {
  // Save a generated recipe to the user's collection
  static async saveRecipe(userId: string, recipe: GeneratedRecipe): Promise<SavedRecipe | null> {
    try {
      const recipeToSave = {
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
        is_generated: true
      }

      const data = await FirestoreService.saveRecipe(recipeToSave)
      console.log('Recipe saved successfully:', data.title)
      return data

    } catch (error) {
      console.error('Failed to save recipe:', error)
      return null
    }
  }

  // Get all saved recipes for a user
  static async getUserRecipes(userId: string): Promise<SavedRecipe[]> {
    try {
      return await FirestoreService.getUserRecipes(userId)
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
    try {
      await FirestoreService.deleteRecipe(recipeId)
      console.log('Recipe deleted successfully')
      return true
    } catch (error) {
      console.error('Failed to delete recipe:', error)
      return false
    }
  }

  // Update a saved recipe (not implemented in FirestoreService yet)
  static async updateRecipe(
    userId: string,
    recipeId: string,
    updates: Partial<GeneratedRecipe>
  ): Promise<SavedRecipe | null> {
    console.warn('Recipe update not yet implemented with Firestore')
    return null
  }

  // Check if a recipe is already saved (to prevent duplicates)
  static async isRecipeSaved(userId: string, recipeTitle: string): Promise<boolean> {
    try {
      const userRecipes = await this.getUserRecipes(userId)
      return userRecipes.some(recipe => recipe.title === recipeTitle)
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