const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Claude Vision API endpoint
app.post('/api/analyze-ingredients', async (req, res) => {
  try {
    const { imageUrls } = req.body;

    if (!process.env.REACT_APP_CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured' });
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
                  text: `Analyze this kitchen/fridge/pantry photo and list ALL ingredients and food items you can see.

Instructions:
- Look carefully at all visible food items
- Include fresh produce, packaged goods, condiments, spices
- Use simple, common ingredient names (e.g., "eggs" not "chicken eggs")
- Include items that are partially visible
- Don't include kitchen tools or containers
- Return ONLY a simple comma-separated list

Example format: eggs, milk, tomatoes, onions, cheese, bread, olive oil

What ingredients do you see?`
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

        // Parse ingredients
        const ingredients = textContent
          .toLowerCase()
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0 && isValidIngredient(item));

        ingredients.forEach(ingredient => allIngredients.add(ingredient));

      } catch (error) {
        console.error('Error processing image:', error);
        continue;
      }
    }

    const result = Array.from(allIngredients);
    console.log('Claude Vision detected ingredients:', result);
    res.json({ ingredients: result });

  } catch (error) {
    console.error('Error in analyze-ingredients:', error);
    res.status(500).json({ error: 'Failed to analyze ingredients' });
  }
});

// Claude Recipe Generation API endpoint
app.post('/api/generate-recipes', async (req, res) => {
  try {
    const { ingredients, preferences, count = 5 } = req.body;

    if (!process.env.REACT_APP_CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured' });
    }

    const ingredientList = ingredients.join(', ');
    const cuisinePrefs = preferences.food_genres?.join(', ') || 'any';
    const dietaryRestrictions = preferences.dietary_preferences || 'none';

    const prompt = `You are a professional chef helping someone create delicious recipes using their available ingredients.

AVAILABLE INGREDIENTS: ${ingredientList}

USER PREFERENCES:
- Preferred cuisines: ${cuisinePrefs}
- Dietary restrictions: ${dietaryRestrictions}

Please generate ${count} creative, practical recipes that:
1. Use as many of the available ingredients as possible
2. Respect the user's cuisine and dietary preferences
3. Include authentic cooking techniques when relevant (especially for Korean, Moroccan, West African, Caribbean, Panamanian dishes)
4. Minimize the need for additional ingredients

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
- Return valid JSON only - no extra text before or after`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const data = await claudeResponse.json();
    const textContent = data.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join(' ');

    // Extract JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Add IDs to recipes
    const recipesWithIds = parsedData.recipes.map((recipe, index) => ({
      ...recipe,
      id: `generated_${Date.now()}_${index}`
    }));

    res.json({ recipes: recipesWithIds });

  } catch (error) {
    console.error('Error in generate-recipes:', error);
    res.status(500).json({ error: 'Failed to generate recipes' });
  }
});

function isValidIngredient(item) {
  const invalidItems = [
    'kitchen', 'fridge', 'refrigerator', 'shelf', 'container', 'bottle', 'jar', 'package',
    'can', 'box', 'bag', 'plastic', 'glass', 'metal', 'wood', 'counter', 'table',
    'wall', 'door', 'light', 'label', 'brand', 'see', 'visible', 'appears', 'looks',
    'various', 'some', 'many', 'several', 'different', 'other', 'items', 'food',
    'ingredients', 'products', 'goods'
  ];

  const itemLower = item.toLowerCase();

  if (item.length < 2 || invalidItems.some(invalid => itemLower.includes(invalid))) {
    return false;
  }

  if (!/[a-zA-Z]/.test(item)) {
    return false;
  }

  return true;
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});