-- Add new roadmap fields to prds table
ALTER TABLE prds 
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS estimated_weeks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_engineer TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prds_release_date ON prds(release_date);
CREATE INDEX IF NOT EXISTS idx_prds_assigned_engineer ON prds(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);