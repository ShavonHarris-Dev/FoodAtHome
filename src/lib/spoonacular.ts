const SPOONACULAR_API_KEY = process.env.REACT_APP_SPOONACULAR_API_KEY
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com'

// Spoonacular API interfaces
export interface SpoonacularRecipe {
  id: number
  title: string
  image: string
  imageType: string
  usedIngredientCount: number
  missedIngredientCount: number
  missedIngredients: Array<{
    id: number
    amount: number
    unit: string
    unitLong: string
    unitShort: string
    aisle: string
    name: string
    original: string
    originalName: string
    meta: string[]
    image: string
  }>
  usedIngredients: Array<{
    id: number
    amount: number
    unit: string
    unitLong: string
    unitShort: string
    aisle: string
    name: string
    original: string
    originalName: string
    meta: string[]
    image: string
  }>
  unusedIngredients: any[]
  likes: number
}

export interface SpoonacularRecipeDetails {
  id: number
  title: string
  image: string
  servings: number
  readyInMinutes: number
  cookingMinutes: number
  preparationMinutes: number
  instructions: string
  summary?: string
  analyzedInstructions: Array<{
    name: string
    steps: Array<{
      number: number
      step: string
      ingredients: any[]
      equipment: any[]
    }>
  }>
  extendedIngredients: Array<{
    id: number
    aisle: string
    image: string
    consistency: string
    name: string
    nameClean: string
    original: string
    originalName: string
    amount: number
    unit: string
    meta: string[]
    measures: any
  }>
  cuisines: string[]
  dishTypes: string[]
  diets: string[]
  nutrition?: SpoonacularNutrition
}

export interface SpoonacularNutrition {
  nutrients: Array<{
    name: string
    amount: number
    unit: string
    percentOfDailyNeeds: number
  }>
  properties: any[]
  flavonoids: any[]
  ingredients: any[]
  caloricBreakdown: {
    percentProtein: number
    percentFat: number
    percentCarbs: number
  }
  weightPerServing: {
    amount: number
    unit: string
  }
}

// API service functions
export class SpoonacularService {
  private static async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!SPOONACULAR_API_KEY) {
      throw new Error('Spoonacular API key not configured')
    }

    const url = new URL(`${SPOONACULAR_BASE_URL}${endpoint}`)
    url.searchParams.append('apiKey', SPOONACULAR_API_KEY)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString())
      }
    })

    try {
      const response = await fetch(url.toString())

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('API quota exceeded. Please upgrade your Spoonacular plan.')
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Spoonacular API Error:', error)
      throw error
    }
  }

  // Find recipes by ingredients (perfect for your "What's in your fridge" feature)
  static async findByIngredients(
    ingredients: string[],
    options: {
      number?: number
      limitLicense?: boolean
      ranking?: 1 | 2  // 1 = maximize used ingredients, 2 = minimize missing ingredients
      ignorePantry?: boolean
    } = {}
  ): Promise<SpoonacularRecipe[]> {
    const params = {
      ingredients: ingredients.join(','),
      number: options.number || 10,
      limitLicense: options.limitLicense || true,
      ranking: options.ranking || 2,
      ignorePantry: options.ignorePantry || true
    }

    return this.makeRequest('/recipes/findByIngredients', params)
  }

  // Get detailed recipe information including nutrition
  static async getRecipeInformation(
    id: number,
    includeNutrition: boolean = true
  ): Promise<SpoonacularRecipeDetails> {
    const params = {
      includeNutrition
    }

    return this.makeRequest(`/recipes/${id}/information`, params)
  }

  // Get multiple recipes' information in bulk
  static async getBulkRecipeInformation(
    ids: number[],
    includeNutrition: boolean = true
  ): Promise<SpoonacularRecipeDetails[]> {
    const params = {
      ids: ids.join(','),
      includeNutrition
    }

    return this.makeRequest('/recipes/informationBulk', params)
  }

  // Search recipes with complex filters
  static async searchRecipes(options: {
    query?: string
    cuisine?: string
    diet?: string
    intolerances?: string
    includeIngredients?: string
    excludeIngredients?: string
    type?: string
    maxReadyTime?: number
    minCalories?: number
    maxCalories?: number
    number?: number
    offset?: number
  } = {}): Promise<{
    results: SpoonacularRecipeDetails[]
    offset: number
    number: number
    totalResults: number
  }> {
    const params = {
      ...options,
      number: options.number || 10,
      offset: options.offset || 0
    }

    return this.makeRequest('/recipes/complexSearch', params)
  }

  // Get recipe nutrition by ID
  static async getRecipeNutrition(id: number): Promise<SpoonacularNutrition> {
    return this.makeRequest(`/recipes/${id}/nutritionWidget.json`)
  }

  // Convert our app's ingredients to Spoonacular format
  static formatIngredientsForSearch(ingredients: string[]): string[] {
    return ingredients.map(ingredient =>
      ingredient.toLowerCase()
        .replace(/[^a-z\s]/g, '') // Remove special characters
        .trim()
    ).filter(ingredient => ingredient.length > 0)
  }

  // Check API quota usage
  static async checkQuota(): Promise<{
    pointsUsed: number
    pointsLeft: number
  }> {
    // This would be returned in the response headers, but we can't access them easily
    // You'll need to track this manually or check your Spoonacular dashboard
    return {
      pointsUsed: 0,
      pointsLeft: 150 // Free tier daily limit
    }
  }
}