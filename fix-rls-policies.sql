-- Fix RLS policies for proper user data isolation

-- Add missing SELECT policy for profiles table
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Add missing policies for user_images table
CREATE POLICY "Users can view own images"
ON user_images FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
ON user_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images"
ON user_images FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verify the saved_recipes policy is working (it should be fine with ALL command)
-- But let's check it exists:
-- The existing "Users can manage their own recipes" policy should work for ALL operations