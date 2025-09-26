-- Check existing RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_images', 'saved_recipes')
ORDER BY tablename, policyname;