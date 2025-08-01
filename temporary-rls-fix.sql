-- Temporary fix for prd_phases RLS issue
-- Option 1: Disable RLS temporarily (for development only)
ALTER TABLE prd_phases DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS but make it permissive for now
-- ALTER TABLE prd_phases ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users can access phases for their own PRDs" ON prd_phases;
-- DROP POLICY IF EXISTS "Public can read PRD phases for features page" ON prd_phases;
-- CREATE POLICY "Allow all operations on prd_phases" ON prd_phases FOR ALL USING (true);

-- Option 3: Match the exact pattern from prds table if using Supabase Auth
-- ALTER TABLE prd_phases ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users can access phases for their own PRDs" ON prd_phases;
-- CREATE POLICY "Users can access phases for their own PRDs" ON prd_phases
--     FOR ALL USING (user_email = auth.jwt() ->> 'email');
-- CREATE POLICY "Public can read PRD phases for features page" ON prd_phases
--     FOR SELECT USING (true);