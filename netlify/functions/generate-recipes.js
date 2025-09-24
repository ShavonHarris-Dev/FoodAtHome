const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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
    const { ingredients, preferences, count = 5 } = JSON.parse(event.body);

    if (!process.env.REACT_APP_CLAUDE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Claude API key not configured' })
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recipes: recipesWithIds })
    };

  } catch (error) {
    console.error('Error in generate-recipes:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate recipes' })
    };
  }
};