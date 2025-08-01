-- PRD Phases Table Migration
CREATE TABLE IF NOT EXISTS prd_phases (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    customer_value TEXT,
    features TEXT[] NOT NULL DEFAULT '{}',
    complexity TEXT NOT NULL DEFAULT 'Medium' CHECK (complexity IN ('Low', 'Medium', 'High')),
    dependencies TEXT[] DEFAULT '{}',
    priority INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prd_phases_prd_id ON prd_phases(prd_id);
CREATE INDEX IF NOT EXISTS idx_prd_phases_user_email ON prd_phases(user_email);
CREATE INDEX IF NOT EXISTS idx_prd_phases_priority ON prd_phases(priority);

-- Enable Row Level Security
ALTER TABLE prd_phases ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Users can access phases for their own PRDs
CREATE POLICY "Users can access phases for their own PRDs" ON prd_phases
    FOR ALL USING (user_email = (auth.jwt() ->> 'email'));

-- Allow public read access for viewing phases on features page
CREATE POLICY "Public can read PRD phases for features page" ON prd_phases
    FOR SELECT USING (true);

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_prd_phases_updated_at 
    BEFORE UPDATE ON prd_phases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();