-- Add only missing policies with IF NOT EXISTS checks

-- For user_images table (likely missing these)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_images'
        AND policyname = 'Users can view own images'
    ) THEN
        CREATE POLICY "Users can view own images"
        ON user_images FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_images'
        AND policyname = 'Users can insert own images'
    ) THEN
        CREATE POLICY "Users can insert own images"
        ON user_images FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;