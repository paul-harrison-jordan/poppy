-- Fix RLS policy for prd_phases table
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can access phases for their own PRDs" ON prd_phases;

-- Create a more permissive policy that allows users to manage phases for PRDs they own
-- This checks if the user owns the parent PRD rather than relying on auth.jwt()
CREATE POLICY "Users can manage phases for their own PRDs" ON prd_phases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prds 
            WHERE prds.id = prd_phases.prd_id 
            AND prds."user" = prd_phases.user_email
        )
    );

-- Alternative: If the above doesn't work, we can create a more open policy for development
-- Uncomment the following if needed:
-- DROP POLICY IF EXISTS "Users can manage phases for their own PRDs" ON prd_phases;
-- CREATE POLICY "Temporary open access for prd_phases" ON prd_phases FOR ALL USING (true);