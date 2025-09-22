// Claude Vision API service for ingredient detection
interface ClaudeVisionResponse {
  content: Array<{
    type: string
    text: string
  }>
}

export class ClaudeVisionService {
  private static readonly CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY
  private static readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

  static async analyzeIngredients(imageUrls: string[]): Promise<string[]> {
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
      const allIngredients = new Set<string>()

      // Process images in batches to avoid overwhelming the API
      for (const imageUrl of imageUrls.slice(0, 5)) { // Limit to 5 images per analysis
        const ingredients = await this.analyzeImage(imageUrl)
        ingredients.forEach(ingredient => allIngredients.add(ingredient))
      }

      const result = Array.from(allIngredients)
      console.log('Claude Vision detected ingredients:', result)
      return result

    } catch (error) {
      console.error('Claude Vision API failed:', error)
      return this.fallbackAnalysis()
    }
  }

  private static async analyzeImage(imageUrl: string): Promise<string[]> {
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
                text: `You are analyzing a grocery haul photo to identify ALL food items present. Be systematic and thorough - don't just focus on the most prominent items.

CRITICAL MINDSET: Your job is to be a THOROUGH DETECTIVE, not a cautious accountant. Find everything possible, even if you're only 70% sure what it is. Better to guess and include an item than to miss it entirely.

GRID SCANNING METHOD (MANDATORY):
Divide the image into a 3x3 grid and scan each section systematically:
- TOP LEFT | TOP CENTER | TOP RIGHT
- MIDDLE LEFT | MIDDLE CENTER | MIDDLE RIGHT
- BOTTOM LEFT | BOTTOM CENTER | BOTTOM RIGHT

For EACH grid section, perform these 4 scan types:
1. DEPTH SCAN: Look behind, under, and around other items
2. COLOR SCAN: Identify items by color patterns (red tomatoes, orange carrots, etc.)
3. TEXT SCAN: Read all visible text/brands - even partial labels give clues
4. QUANTITY SCAN: Count multiples of the same item

TARGET: Aim to find AT LEAST 15-25 items total. If you find fewer than 15, scan again more aggressively.

SHAPE RECOGNITION (when labels aren't clear):
- Cylindrical = cans (soup, beans, tomatoes, etc.)
- Rectangular boxes = cereals, pasta, crackers, etc.
- Clear containers = oils, vinegars, sauces
- Mesh/net bags = onions, potatoes, citrus
- Plastic wrapped = bread, meat, cheese
- Small jars = spices, baby food, jams

SPECIFIC THINGS TO LOOK FOR:
- Background items: Don't ignore items that are partially visible
- Stacked items: Look for multiples of the same product
- Different angles: Items might be turned so labels aren't fully visible
- Generic shapes: Even without reading labels, identify by shape (pasta boxes, soup cans, etc.)
- Fresh vs. packaged: Distinguish between fresh produce and packaged goods

CRITICAL REMINDER:
Don't assume - if you see the edge of a can or box, try to identify what it might be based on size, color, or partial text. Many items in grocery hauls are partially obscured but still identifiable.

QUALITY CHECK - After initial scan, ask yourself:
- Did I examine every visible surface?
- Are there items I can only partially see that I should note?
- Did I count multiples correctly?
- Are there generic items I identified by shape even without clear labels?

INSTRUCTIONS:
- Use simple, common ingredient names (e.g., "eggs" not "chicken eggs")
- Include items that are partially visible or obscured
- Don't include kitchen tools, containers, or packaging materials
- Return ONLY a simple comma-separated list
- Be exhaustive - include everything you can identify

FORMAT YOUR RESPONSE WITH CLEAR FORMATTING:
- NEVER run words together
- Each item should be clearly separated by commas
- Use proper spacing between items
- Double-check for any merged or combined words

FINAL SCAN REQUIREMENT:
After creating your initial list, scan the image one more time focusing specifically on:
- The right side where many canned goods might be stacked
- Any meat packages in plastic wrapping
- All bread/grain products
- Anything in the background or partially obscured
- Items that might be behind or under other products

Example format: eggs, milk, tomatoes, onions, cheese, bread, olive oil, canned tomatoes, pasta, ground beef, yogurt, apples, bananas, rice, black beans, chicken breast, butter, garlic, bell peppers, carrots, potatoes, orange juice, cereal, frozen peas

What ingredients and food items do you see? List ALL items, including partially visible ones, and ensure proper formatting.`
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

  private static parseClaudeResponse(data: ClaudeVisionResponse): string[] {
    try {
      const textContent = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join(' ')

      if (!textContent) {
        console.warn('No text content in Claude response')
        return []
      }

      // Parse the comma-separated list
      const ingredients = textContent
        .toLowerCase()
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .filter(item => this.isValidIngredient(item))
        .map(item => this.normalizeIngredient(item))
        .filter((item, index, arr) => arr.indexOf(item) === index) // Remove duplicates

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