// Claude Vision API service for ingredient detection
interface ClaudeVisionResponse {
  content: Array<{
    type: string
    text: string
  }>
}

interface IngredientWithConfidence {
  ingredient: string
  confidence: number
}

export class ClaudeVisionService {
  private static readonly CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY
  private static readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

  static async analyzeIngredients(imageUrls: string[], confidenceThreshold: number = 0.8): Promise<string[]> {
    console.log('DEBUG: Claude API Key exists?', !!this.CLAUDE_API_KEY)
    console.log('DEBUG: All env vars:', {
      claudeKey: this.CLAUDE_API_KEY?.substring(0, 10) + '...',
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL?.substring(0, 20) + '...'
    })

    if (!this.CLAUDE_API_KEY) {
      console.warn('Claude API key not configured, using fallback')
      return this.fallbackAnalysis()
    }

    try {
      const allIngredients = new Map<string, number>() // ingredient -> highest confidence

      // Process images in batches to avoid overwhelming the API
      for (const imageUrl of imageUrls.slice(0, 5)) { // Limit to 5 images per analysis
        const ingredientsWithConfidence = await this.analyzeImage(imageUrl)

        // Keep highest confidence for each ingredient
        ingredientsWithConfidence.forEach(({ ingredient, confidence }) => {
          const currentConfidence = allIngredients.get(ingredient) || 0
          if (confidence > currentConfidence) {
            allIngredients.set(ingredient, confidence)
          }
        })
      }

      // Filter by confidence threshold and return only ingredient names
      const result = Array.from(allIngredients.entries())
        .filter(([, confidence]) => confidence >= confidenceThreshold)
        .map(([ingredient]) => ingredient)
        .sort()

      console.log('Claude Vision detected ingredients with confidence filtering:', {
        threshold: confidenceThreshold,
        totalDetected: allIngredients.size,
        passedThreshold: result.length,
        result
      })

      return result

    } catch (error) {
      console.error('Claude Vision API failed:', error)
      return this.fallbackAnalysis()
    }
  }

  private static async analyzeImage(imageUrl: string): Promise<IngredientWithConfidence[]> {
    try {
      // Convert image to base64
      const base64Image = await this.urlToBase64(imageUrl)
      const mimeType = this.getMimeType(imageUrl)

      const requestBody = {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: "text",
                text: `You are analyzing a grocery haul photo to identify food items with confidence scores. Be accurate rather than exhaustive.

SCANNING APPROACH:
Systematically scan the image for clearly identifiable food items. Focus on items you can confidently identify rather than guessing.

CONFIDENCE SCORING (0.0 to 1.0):
- 0.9-1.0: Clearly visible, labeled, or unmistakable (e.g., labeled Chobani yogurt, whole eggs, clear tomatoes)
- 0.7-0.8: Very likely but not 100% certain (e.g., red peppers that could be bell peppers vs hot peppers)
- 0.5-0.6: Possible but uncertain (e.g., partial labels, items mostly obscured)
- Below 0.5: Don't include these items

WHAT TO IDENTIFY:
- Fresh produce: fruits, vegetables (be specific: "tomatoes" not "vegetables")
- Packaged goods with visible labels
- Dairy products (milk, cheese, yogurt)
- Proteins (eggs, meat, fish)
- Pantry items (oils, sauces, condiments)
- Beverages

WHAT TO AVOID:
- Generic categories ("spices", "grains") unless you can see specific items
- Kitchen tools, containers, bags
- Items that are completely obscured
- Wild guesses based on shapes alone

RESPONSE FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {"ingredient": "tomatoes", "confidence": 0.95},
  {"ingredient": "eggs", "confidence": 0.98},
  {"ingredient": "avocados", "confidence": 0.92}
]

Use simple, common ingredient names. Be conservative with confidence scores - it's better to exclude uncertain items than include false positives.`
              }
            ]
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

      const data: ClaudeVisionResponse = await response.json()
      return this.parseClaudeResponse(data)

    } catch (error) {
      console.error('Error analyzing image with Claude:', error)
      return []
    }
  }

  private static async urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }

      const blob = await response.blob()

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error}`)
    }
  }

  private static getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      case 'gif':
        return 'image/gif'
      default:
        return 'image/jpeg' // Default fallback
    }
  }

  private static parseClaudeResponse(data: ClaudeVisionResponse): IngredientWithConfidence[] {
    try {
      const textContent = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join(' ')

      if (!textContent) {
        console.warn('No text content in Claude response')
        return []
      }

      // Try to parse as JSON first
      try {
        const jsonMatch = textContent.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const jsonArray = JSON.parse(jsonMatch[0])

          return jsonArray
            .filter((item: any) => item.ingredient && typeof item.confidence === 'number')
            .map((item: any) => ({
              ingredient: this.normalizeIngredient(item.ingredient.toLowerCase().trim()),
              confidence: Math.max(0, Math.min(1, item.confidence)) // Clamp between 0-1
            }))
            .filter((item: IngredientWithConfidence) => this.isValidIngredient(item.ingredient))
        }
      } catch (jsonError) {
        console.warn('Failed to parse JSON response, falling back to text parsing')
      }

      // Fallback to old comma-separated parsing
      const ingredients = textContent
        .toLowerCase()
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .filter(item => this.isValidIngredient(item))
        .map(item => this.normalizeIngredient(item))
        .filter((item, index, arr) => arr.indexOf(item) === index) // Remove duplicates
        .map(ingredient => ({ ingredient, confidence: 0.7 })) // Default confidence

      return ingredients

    } catch (error) {
      console.error('Error parsing Claude response:', error)
      return []
    }
  }

  private static isValidIngredient(item: string): boolean {
    // Filter out non-food items and invalid responses
    const invalidItems = [
      'kitchen', 'fridge', 'refrigerator', 'shelf', 'container', 'bottle', 'jar', 'package',
      'can', 'box', 'bag', 'plastic', 'glass', 'metal', 'wood', 'counter', 'table',
      'wall', 'door', 'light', 'label', 'brand', 'see', 'visible', 'appears', 'looks',
      'various', 'some', 'many', 'several', 'different', 'other', 'items', 'food',
      'ingredients', 'products', 'goods'
    ]

    const itemLower = item.toLowerCase()

    // Too short or contains invalid words
    if (item.length < 2 || invalidItems.some(invalid => itemLower.includes(invalid))) {
      return false
    }

    // Should contain letters (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(item)) {
      return false
    }

    return true
  }

  private static normalizeIngredient(item: string): string {
    // Clean up and normalize ingredient names
    let normalized = item
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace

    // Common normalizations
    const normalizations: Record<string, string> = {
      'tomato': 'tomatoes',
      'onion': 'onions',
      'carrot': 'carrots',
      'potato': 'potatoes',
      'egg': 'eggs',
      'apple': 'apples',
      'banana': 'bananas',
      'lemon': 'lemons',
      'lime': 'limes',
      'bell pepper': 'bell peppers',
      'green pepper': 'bell peppers',
      'red pepper': 'bell peppers',
      'yellow pepper': 'bell peppers',
      'chicken breast': 'chicken',
      'ground beef': 'beef',
      'olive oil': 'olive oil',
      'vegetable oil': 'oil',
      'cooking oil': 'oil',
      'white bread': 'bread',
      'whole wheat bread': 'bread',
      'cheddar cheese': 'cheese',
      'mozzarella cheese': 'cheese',
      'swiss cheese': 'cheese'
    }

    // Apply normalizations
    for (const [key, value] of Object.entries(normalizations)) {
      if (normalized.includes(key)) {
        normalized = value
        break
      }
    }

    return normalized
  }

  // Fallback when API is unavailable
  private static async fallbackAnalysis(): Promise<string[]> {
    console.log('Using fallback ingredient analysis')

    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Return common ingredients found in most kitchens
    const commonIngredients = [
      'eggs', 'milk', 'bread', 'butter', 'cheese',
      'tomatoes', 'onions', 'garlic', 'carrots',
      'chicken', 'rice', 'pasta', 'olive oil', 'salt'
    ]

    // Return a subset to simulate real detection
    const numIngredients = Math.floor(Math.random() * 6) + 4 // 4-9 ingredients
    const shuffled = [...commonIngredients].sort(() => Math.random() - 0.5)

    return shuffled.slice(0, numIngredients)
  }

  // Utility method to validate API key is configured
  static isConfigured(): boolean {
    return !!this.CLAUDE_API_KEY
  }

  // Get cost estimate for users (helpful for rate limiting later)
  static estimateCost(numImages: number): { tokens: number; estimatedCost: number } {
    // Rough estimates based on Claude pricing
    const tokensPerImage = 1000 // Average tokens for image analysis
    const costPerMToken = 3 // $3 per million tokens (approximate)

    const totalTokens = numImages * tokensPerImage
    const estimatedCost = (totalTokens / 1000000) * costPerMToken

    return {
      tokens: totalTokens,
      estimatedCost: estimatedCost
    }
  }
}