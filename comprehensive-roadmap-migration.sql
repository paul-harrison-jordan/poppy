-- Comprehensive migration for roadmap functionality
-- Run this in your Supabase SQL editor

-- 1. Add new columns to PRDs table for roadmap functionality
ALTER TABLE prds 
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS estimated_weeks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_engineer TEXT;

-- 2. Add is_complete column to prd_phases table
ALTER TABLE prd_phases 
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prds_release_date ON prds(release_date);
CREATE INDEX IF NOT EXISTS idx_prds_assigned_engineer ON prds(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);
CREATE INDEX IF NOT EXISTS idx_prd_phases_is_complete ON prd_phases(is_complete);

-- 4. Update any existing NULL assigned_engineer values to be consistent
UPDATE prds SET assigned_engineer = NULL WHERE assigned_engineer = '';

-- 5. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prds' 
AND column_name IN ('release_date', 'estimated_weeks', 'assigned_engineer')
ORDER BY column_name;

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prd_phases' 
AND column_name = 'is_complete';

-- 6. Check for any existing data that might need cleanup
SELECT 
    id, 
    title, 
    release_date, 
    estimated_weeks, 
    assigned_engineer,
    status
FROM prds 
WHERE release_date IS NOT NULL OR estimated_weeks > 0 OR assigned_engineer IS NOT NULL
LIMIT 10;