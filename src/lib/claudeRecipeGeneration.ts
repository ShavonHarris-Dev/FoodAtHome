// Claude Recipe Generation API service for personalized recipe creation
interface ClaudeResponse {
  content: Array<{
    type: string
    text: string
  }>
}

export interface GeneratedRecipe {
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
  difficulty: 'easy' | 'medium' | 'hard'
  tips?: string[]
  variations?: string[]
}

export interface UserPreferences {
  dietary_preferences?: string
  food_genres?: string[]
  cooking_skill?: 'beginner' | 'intermediate' | 'advanced'
  time_preference?: 'quick' | 'normal' | 'elaborate'
}

export class ClaudeRecipeService {
  private static readonly CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY
  private static readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

  static async generateRecipes(
    ingredients: string[],
    preferences: UserPreferences,
    count: number = 5
  ): Promise<GeneratedRecipe[]> {
    console.log('DEBUG: Recipe service - Claude API Key exists?', !!this.CLAUDE_API_KEY)

    if (!this.CLAUDE_API_KEY) {
      console.warn('Claude API key not configured, using fallback recipes')
      return this.getFallbackRecipes(ingredients, preferences, count)
    }

    try {
      const recipes = await this.requestRecipeGeneration(ingredients, preferences, count)
      console.log(`Generated ${recipes.length} recipes for ingredients:`, ingredients)
      return recipes

    } catch (error) {
      console.error('Claude Recipe Generation failed:', error)
      return this.getFallbackRecipes(ingredients, preferences, count)
    }
  }

  private static async requestRecipeGeneration(
    ingredients: string[],
    preferences: UserPreferences,
    count: number
  ): Promise<GeneratedRecipe[]> {
    const prompt = this.buildRecipePrompt(ingredients, preferences, count)

    const requestBody = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }

    const response = await fetch(this.CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API error: ${response.status} - ${errorText}`)
    }

    const data: ClaudeResponse = await response.json()
    return this.parseRecipeResponse(data)
  }

  private static buildRecipePrompt(
    ingredients: string[],
    preferences: UserPreferences,
    count: number
  ): string {
    const ingredientList = ingredients.join(', ')
    const cuisinePrefs = preferences.food_genres?.join(', ') || 'any'
    const dietaryRestrictions = preferences.dietary_preferences || 'none'
    const skillLevel = preferences.cooking_skill || 'intermediate'
    const timePreference = preferences.time_preference || 'normal'

    return `You are a professional chef helping someone create delicious recipes using their available ingredients.

AVAILABLE INGREDIENTS: ${ingredientList}

USER PREFERENCES:
- Preferred cuisines: ${cuisinePrefs}
- Dietary restrictions: ${dietaryRestrictions}
- Cooking skill level: ${skillLevel}
- Time preference: ${timePreference}

Please generate ${count} creative, practical recipes that:
1. Use as many of the available ingredients as possible
2. Respect the user's cuisine and dietary preferences
3. Match their skill level and time constraints
4. Include authentic cooking techniques when relevant (especially for Korean, Moroccan, West African, Caribbean, Panamanian dishes)
5. Minimize the need for additional ingredients

For each recipe, provide the information in this EXACT JSON format:

{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief appetizing description (1-2 sentences)",
      "ingredients": ["ingredient 1", "ingredient 2", "etc"],
      "instructions": ["Step 1", "Step 2", "etc"],
      "prep_time": 15,
      "cook_time": 25,
      "servings": 4,
      "cuisine": ["Korean", "etc"],
      "dietary_tags": ["vegetarian", "gluten-free", "etc"],
      "difficulty": "easy",
      "tips": ["Optional cooking tip 1", "tip 2"],
      "variations": ["Optional variation 1", "variation 2"]
    }
  ]
}

IMPORTANT:
- Only suggest recipes you can make with the available ingredients (plus common pantry staples like salt, pepper, oil)
- If suggesting Korean recipes and user has Korean ingredients like japchae noodles, kimbap rice, or danmuji, create authentic Korean dishes
- Be specific with instructions and cooking times
- Return valid JSON only - no extra text before or after
- Make instructions clear and detailed enough for the skill level`
  }

  private static parseRecipeResponse(data: ClaudeResponse): GeneratedRecipe[] {
    try {
      const textContent = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join(' ')

      if (!textContent) {
        throw new Error('No text content in Claude response')
      }

      // Extract JSON from the response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsedData = JSON.parse(jsonMatch[0])

      if (!parsedData.recipes || !Array.isArray(parsedData.recipes)) {
        throw new Error('Invalid recipe format in response')
      }

      // Convert to our GeneratedRecipe format and add IDs
      return parsedData.recipes.map((recipe: any, index: number): GeneratedRecipe => ({
        id: `generated_${Date.now()}_${index}`,
        title: recipe.title || 'Untitled Recipe',
        description: recipe.description || '',
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
        prep_time: typeof recipe.prep_time === 'number' ? recipe.prep_time : 15,
        cook_time: typeof recipe.cook_time === 'number' ? recipe.cook_time : 30,
        servings: typeof recipe.servings === 'number' ? recipe.servings : 4,
        cuisine: Array.isArray(recipe.cuisine) ? recipe.cuisine : ['International'],
        dietary_tags: Array.isArray(recipe.dietary_tags) ? recipe.dietary_tags : [],
        difficulty: ['easy', 'medium', 'hard'].includes(recipe.difficulty) ? recipe.difficulty : 'medium',
        tips: Array.isArray(recipe.tips) ? recipe.tips : undefined,
        variations: Array.isArray(recipe.variations) ? recipe.variations : undefined
      }))

    } catch (error) {
      console.error('Error parsing Claude recipe response:', error)
      console.error('Raw response:', data)
      throw new Error(`Failed to parse recipe response: ${error}`)
    }
  }

  private static getFallbackRecipes(
    ingredients: string[],
    preferences: UserPreferences,
    count: number
  ): GeneratedRecipe[] {
    console.log('Using fallback recipe generation')

    // Create simple recipes based on available ingredients
    const fallbackRecipes: GeneratedRecipe[] = []

    // Korean-style recipes if Korean ingredients are available
    const hasKoreanIngredients = ingredients.some(ing =>
      ['korean glass noodles', 'japchae', 'topokki', 'rice cake', 'kimbap rice', 'danmuji', 'sesame'].some(korean =>
        ing.toLowerCase().includes(korean.toLowerCase())
      )
    )

    if (hasKoreanIngredients && fallbackRecipes.length < count) {
      fallbackRecipes.push({
        id: `fallback_korean_${Date.now()}`,
        title: 'Simple Japchae',
        description: 'Korean glass noodles stir-fried with vegetables and sesame',
        ingredients: ['korean glass noodles', 'sesame oil', 'vegetables', 'sesame seeds'],
        instructions: [
          'Soak glass noodles in warm water for 30 minutes',
          'Heat sesame oil in a large pan',
          'Stir-fry vegetables until tender',
          'Add drained noodles and toss with sesame seeds',
          'Season with soy sauce and serve'
        ],
        prep_time: 10,
        cook_time: 15,
        servings: 3,
        cuisine: ['Korean'],
        dietary_tags: ['vegetarian'],
        difficulty: 'easy'
      })
    }

    // Add basic egg recipe if eggs are available
    if (ingredients.some(ing => ing.toLowerCase().includes('egg')) && fallbackRecipes.length < count) {
      fallbackRecipes.push({
        id: `fallback_eggs_${Date.now()}`,
        title: 'Scrambled Eggs',
        description: 'Simple and creamy scrambled eggs',
        ingredients: ['eggs', 'salt', 'pepper'],
        instructions: [
          'Beat eggs with salt and pepper',
          'Heat pan over medium-low heat',
          'Pour in eggs and gently stir',
          'Cook until just set and creamy'
        ],
        prep_time: 2,
        cook_time: 5,
        servings: 2,
        cuisine: ['International'],
        dietary_tags: ['vegetarian'],
        difficulty: 'easy'
      })
    }

    // Add rice recipe if rice ingredients are available
    if (ingredients.some(ing => ing.toLowerCase().includes('rice')) && fallbackRecipes.length < count) {
      fallbackRecipes.push({
        id: `fallback_rice_${Date.now()}`,
        title: 'Simple Rice Bowl',
        description: 'Basic rice with available ingredients',
        ingredients: ['rice', 'salt'],
        instructions: [
          'Rinse rice until water runs clear',
          'Add rice and water to pot (1:2 ratio)',
          'Bring to boil, then simmer covered for 18 minutes',
          'Let rest 5 minutes before serving'
        ],
        prep_time: 5,
        cook_time: 25,
        servings: 4,
        cuisine: ['International'],
        dietary_tags: ['vegan', 'gluten-free'],
        difficulty: 'easy'
      })
    }

    return fallbackRecipes.slice(0, count)
  }

  static isConfigured(): boolean {
    return !!this.CLAUDE_API_KEY
  }

  static estimateCost(numRecipes: number): { tokens: number; estimatedCost: number } {
    const tokensPerRecipe = 800 // Average tokens for recipe generation
    const costPerMToken = 3 // $3 per million tokens (approximate)

    const totalTokens = numRecipes * tokensPerRecipe
    const estimatedCost = (totalTokens / 1000000) * costPerMToken

    return {
      tokens: totalTokens,
      estimatedCost: estimatedCost
    }
  }
}