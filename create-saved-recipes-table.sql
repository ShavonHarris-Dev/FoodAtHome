-- Create saved_recipes table
CREATE TABLE saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL,
  instructions TEXT[] NOT NULL,
  prep_time INTEGER NOT NULL,
  cook_time INTEGER NOT NULL,
  servings INTEGER NOT NULL,
  cuisine TEXT[] NOT NULL DEFAULT '{}',
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  tips TEXT[],
  variations TEXT[],
  is_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recipes
CREATE POLICY "Users can view their own recipes" ON saved_recipes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own recipes
CREATE POLICY "Users can insert their own recipes" ON saved_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recipes
CREATE POLICY "Users can update their own recipes" ON saved_recipes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own recipes
CREATE POLICY "Users can delete their own recipes" ON saved_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX idx_saved_recipes_created_at ON saved_recipes(created_at);