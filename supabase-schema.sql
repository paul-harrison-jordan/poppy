-- Feature Comments Table
-- This table stores comments for each feature/PRD
CREATE TABLE IF NOT EXISTS feature_comments (
    id BIGSERIAL PRIMARY KEY,
    feature_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_comments_feature_id ON feature_comments(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_comments_created_at ON feature_comments(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE feature_comments ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read comments (since features page is public)
CREATE POLICY "Anyone can read feature comments" ON feature_comments
    FOR SELECT USING (true);

-- Policy to allow authenticated users to insert comments
CREATE POLICY "Authenticated users can insert comments" ON feature_comments
    FOR INSERT WITH CHECK (true);

-- Policy to allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON feature_comments
    FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

-- Policy to allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON feature_comments
    FOR DELETE USING (user_email = auth.jwt() ->> 'email');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row changes
CREATE TRIGGER update_feature_comments_updated_at BEFORE UPDATE
    ON feature_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();