const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Ingredient processing utilities
function parseIngredientsFromResponse(textContent, dietaryRestrictions = null) {
  try {
    // Try to parse as JSON first
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);

      const allItems = [];

      // Process high confidence items (0.95 confidence)
      if (jsonData.high_confidence && Array.isArray(jsonData.high_confidence)) {
        jsonData.high_confidence
          .filter(item => item.name && isValidIngredient(item.name.toLowerCase().trim(), dietaryRestrictions))
          .forEach(item => allItems.push(normalizeIngredient(item.name.toLowerCase().trim())));
      }

      // Process medium confidence items (0.8 confidence)
      if (jsonData.medium_confidence && Array.isArray(jsonData.medium_confidence)) {
        jsonData.medium_confidence
          .filter(item => item.name && isValidIngredient(item.name.toLowerCase().trim(), dietaryRestrictions))
          .forEach(item => allItems.push(normalizeIngredient(item.name.toLowerCase().trim())));
      }

      return allItems;
    }
  } catch (jsonError) {
    console.warn('Failed to parse JSON response, falling back to text parsing');
  }

  // Fallback to comma-separated parsing
  return textContent
    .toLowerCase()
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0 && isValidIngredient(item, dietaryRestrictions))
    .map(item => normalizeIngredient(item));
}

function normalizeIngredient(item) {
  let normalized = item.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');

  // Enhanced normalizations
  const normalizations = {
    // Unify singular/plural
    'tomato': 'tomatoes', 'onion': 'onions', 'carrot': 'carrots',
    'apple': 'apples', 'orange': 'oranges', 'lemon': 'lemons', 'lime': 'limes',
    'potato': 'potatoes', 'yams': 'yam',

    // Collapse oil variants
    'vegetable oil': 'olive oil', 'cooking oil': 'olive oil',

    // Consolidate leafy greens
    'leafy greens': 'lettuce', 'salad greens': 'lettuce',

    // Pepper variants
    'bell pepper': 'peppers', 'green pepper': 'peppers', 'red pepper': 'peppers',

    // Cheese variants
    'cheddar cheese': 'cheese', 'mozzarella cheese': 'cheese'
  };

  for (const [key, value] of Object.entries(normalizations)) {
    if (normalized === key || normalized.includes(key)) {
      normalized = value;
      break;
    }
  }

  return normalized;
}

function isValidIngredient(item, dietaryRestrictions = null) {
  const itemLower = item.toLowerCase().trim();

  if (item.length < 2 || !/[a-zA-Z]/.test(item)) return false;

  const blockedTerms = [
    'fruit', 'fruits', 'vegetables', 'veggies', 'leafy greens', 'condiments',
    'sauces', 'dressings', 'grains', 'nuts', 'herbs', 'spices', 'oils',
    'cereals', 'legumes', 'dairy', 'produce', 'meat', 'seafood', 'beverages',
    'drinks', 'juice', 'root vegetables', 'oil', 'seasonings', 'cereal',
    'bowls', 'baskets', 'containers', 'bottle', 'jar', 'package', 'can', 'box',
    'various', 'some', 'many', 'different', 'other', 'items', 'food', 'ingredients'
  ];

  if (blockedTerms.includes(itemLower)) return false;

  // Apply dietary restriction filtering
  if (dietaryRestrictions) {
    const restrictions = dietaryRestrictions.toLowerCase();

    if (restrictions.includes('vegan')) {
      const veganBlocked = ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs', 'honey', 'meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'bacon'];
      if (veganBlocked.some(blocked => itemLower.includes(blocked))) {
        console.log(`🌱 Filtered out non-vegan ingredient: ${item}`);
        return false;
      }
    } else if (restrictions.includes('vegetarian')) {
      const vegetarianBlocked = ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'bacon', 'ham', 'turkey'];
      if (vegetarianBlocked.some(blocked => itemLower.includes(blocked))) {
        console.log(`🥗 Filtered out non-vegetarian ingredient: ${item}`);
        return false;
      }
    }

    if (restrictions.includes('gluten-free')) {
      const glutenBlocked = ['bread', 'pasta', 'flour', 'wheat', 'barley', 'rye', 'soy sauce'];
      if (glutenBlocked.some(blocked => itemLower.includes(blocked))) {
        console.log(`🌾 Filtered out gluten-containing ingredient: ${item}`);
        return false;
      }
    }
  }

  return true;
}

function deduplicateIngredients(ingredients) {
  const seen = new Set();
  const duplicateGroups = [
    ['lemon', 'lemons'], ['lime', 'limes'], ['fruit', 'fruits'],
    ['oil', 'oils', 'olive oil'], ['milk', 'milk.'], ['juice', 'juices']
  ];

  return ingredients.filter(ingredient => {
    const normalized = ingredient.toLowerCase().trim();

    // Check if we've seen this or a duplicate
    if (seen.has(normalized)) return false;

    // Check duplicate groups
    for (const group of duplicateGroups) {
      if (group.includes(normalized)) {
        const alreadyHasFromGroup = Array.from(seen).some(seenItem => group.includes(seenItem));
        if (alreadyHasFromGroup) return false;
      }
    }

    seen.add(normalized);
    return true;
  });
}

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { imageUrls, dietaryRestrictions, cuisinePreferences } = JSON.parse(event.body);

    if (!process.env.REACT_APP_CLAUDE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Claude API key not configured' })
      };
    }

    const allIngredients = new Set();

    // Process images in batches
    for (const imageUrl of imageUrls.slice(0, 5)) {
      try {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.warn(`Failed to fetch image: ${imageUrl}`);
          continue;
        }

        const imageBuffer = await imageResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Call Claude Vision API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1000,
            messages: [{
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
                  text: `You are an ingredient detector. Analyze this fridge image systematically.

STRICT CONSTRAINTS:
- List only ingredients you can see with 90%+ confidence
- Do NOT guess items that "should" be in fridges
- Do NOT use generic terms like "fruit" - specify "apple" or say nothing
- Maximum 15 items total
- Only include food items, not containers

PROCESS:
1. HIGH CONFIDENCE: Items with visible labels or unmistakable shapes
2. MEDIUM CONFIDENCE: Partially visible items you can reasonably identify
3. EXCLUDE: Generic categories, duplicates, unclear items

FORBIDDEN TERMS: fruit, fruits, vegetables, veggies, condiments, sauces, dressings, grains, nuts, herbs, spices, oils, dairy, produce, meat, beverages

SPECIFIC FOODS TO DETECT (if visible):
✅ Root vegetables: yam, cassava, sweet potato, taro, plantain
✅ International foods: okra, bok choy, napa cabbage, daikon
✅ Specific varieties: gala apples, roma tomatoes, yukon potatoes

FORMAT (JSON only):
{
  "high_confidence": [
    {"name": "hellmann's mayonnaise", "evidence": "clear label visible"},
    {"name": "avocados", "evidence": "distinctive green shape and texture"}
  ],
  "medium_confidence": [
    {"name": "red bell peppers", "evidence": "red color visible but partially obscured"}
  ]
}

EXAMPLES:
✅ GOOD: "chobani greek yogurt", "carbone marinara sauce", "gala apples", "yam", "cassava", "okra"
❌ BAD: "yogurt", "sauce", "fruit", "condiments", "vegetables", "root vegetables"`
                }
              ]
            }]
          })
        });

        if (!claudeResponse.ok) {
          console.error(`Claude API error: ${claudeResponse.status}`);
          continue;
        }

        const data = await claudeResponse.json();
        const textContent = data.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join(' ');

        console.log('🔍 Raw Claude Response for image:', imageUrl.substring(0, 50) + '...');
        console.log('📝 Text content:', textContent);

        // Parse ingredients with improved handling
        const ingredients = parseIngredientsFromResponse(textContent, dietaryRestrictions);
        console.log('🥕 Parsed ingredients:', ingredients);

        ingredients.forEach(ingredient => allIngredients.add(ingredient));

      } catch (error) {
        console.error('Error processing image:', error);
        continue;
      }
    }

    // Convert to array, deduplicate, and add assumed staples
    let result = Array.from(allIngredients);
    result = deduplicateIngredients(result);

    // Add assumed staples that are always available
    const assumedStaples = ['salt', 'pepper', 'olive oil', 'water'];
    const finalResult = [...new Set([...result, ...assumedStaples])].sort();

    console.log('🥕 Final ingredients after processing:', {
      detected: result,
      withStaples: finalResult,
      deduplicated: allIngredients.size !== result.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ingredients: finalResult,
        metadata: {
          detected: result.length,
          withStaples: finalResult.length,
          staples: assumedStaples
        }
      })
    };

  } catch (error) {
    console.error('Error in analyze-ingredients:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze ingredients' })
    };
  }
};