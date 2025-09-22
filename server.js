const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'Backend server running',
    endpoints: ['/api/analyze-ingredients', '/api/generate-recipes', '/api/create-payment-intent', '/api/create-subscription']
  });
});

// Stripe payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', subscription_tier } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        subscription_tier: subscription_tier || 'basic'
      }
    });

    res.json({
      client_secret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe subscription endpoint (for recurring payments)
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { price_id, customer_email, subscription_tier } = req.body;

    if (!price_id || !customer_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customer_email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customer_email,
        metadata: {
          subscription_tier: subscription_tier || 'basic'
        }
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    res.json({
      subscription_id: subscription.id,
      client_secret: subscription.latest_invoice.payment_intent.client_secret,
      customer_id: customer.id
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Claude Vision API endpoint
app.post('/api/analyze-ingredients', async (req, res) => {
  try {
    const { imageUrls, dietaryRestrictions, cuisinePreferences } = req.body;

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

    res.json({
      ingredients: finalResult,
      metadata: {
        detected: result.length,
        withStaples: finalResult.length,
        staples: assumedStaples
      }
    });

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

    console.log('🍽️ Recipe generation request:');
    console.log('- Ingredients:', ingredientList);
    console.log('- Dietary restrictions:', dietaryRestrictions);
    console.log('- Cuisine preferences:', cuisinePrefs);
    console.log('- Full preferences object:', JSON.stringify(preferences, null, 2));

    // Build dietary restriction rules
    let dietaryRules = '';
    if (dietaryRestrictions && dietaryRestrictions !== 'none') {
      const restrictions = dietaryRestrictions.toLowerCase();
      if (restrictions.includes('vegetarian')) {
        dietaryRules = `
CRITICAL DIETARY RESTRICTIONS - MUST FOLLOW:
- VEGETARIAN: NO meat, poultry, fish, or seafood of any kind
- Do NOT include: chicken, beef, pork, lamb, turkey, duck, fish, salmon, tuna, shrimp, etc.
- Use only plant-based proteins: beans, lentils, tofu, tempeh, nuts, seeds, eggs (if lacto-ovo)`;
      } else if (restrictions.includes('vegan')) {
        dietaryRules = `
CRITICAL DIETARY RESTRICTIONS - MUST FOLLOW:
- VEGAN: NO animal products whatsoever
- Do NOT include: meat, poultry, fish, dairy, eggs, honey, gelatin
- Use only plant-based ingredients: vegetables, fruits, grains, legumes, nuts, seeds`;
      } else if (restrictions.includes('gluten-free')) {
        dietaryRules = `
CRITICAL DIETARY RESTRICTIONS - MUST FOLLOW:
- GLUTEN-FREE: NO wheat, barley, rye, or gluten-containing ingredients
- Do NOT include: bread, pasta, flour, soy sauce (unless gluten-free)
- Use: rice, quinoa, corn, potatoes, gluten-free alternatives`;
      }
    }

    const prompt = `You are a professional chef helping someone create delicious recipes using their available ingredients.

AVAILABLE INGREDIENTS: ${ingredientList}

USER PREFERENCES:
- Preferred cuisines: ${cuisinePrefs}
- Dietary restrictions: ${dietaryRestrictions}
${dietaryRules}

CRITICAL CONSTRAINTS:
🚫 ONLY use ingredients from the available list above
🚫 Do NOT add ANY ingredients not in the list
🚫 If a recipe needs something not available, put it under "missing_ingredients"
🚫 Do NOT assume basic ingredients like garlic, onion, ginger unless they're in the list

Please generate ${count} creative, practical recipes that:
1. STRICTLY follow all dietary restrictions - this is mandatory
2. Use ONLY ingredients from the available list
3. Respect the user's cuisine preferences
4. Include authentic cooking techniques when relevant
5. If a recipe absolutely needs an ingredient not in the list, add it to "missing_ingredients" array

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

CRITICAL REQUIREMENTS:
- MUST strictly follow dietary restrictions - NO exceptions
- Only suggest recipes you can make with the available ingredients (plus common pantry staples like salt, pepper, oil)
- Include appropriate dietary_tags for each recipe
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