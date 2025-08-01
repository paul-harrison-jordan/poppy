-- Add is_complete column to prd_phases table
ALTER TABLE prd_phases 
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- Add index for better performance when filtering by completion status
CREATE INDEX IF NOT EXISTS idx_prd_phases_is_complete ON prd_phases(is_complete);