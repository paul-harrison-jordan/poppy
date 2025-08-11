-- AI Evaluations table for storing evaluation results
CREATE TABLE IF NOT EXISTS ai_evaluations (
    id SERIAL PRIMARY KEY,
    eval_id TEXT UNIQUE NOT NULL,
    operation TEXT NOT NULL,
    model TEXT NOT NULL,
    input_data JSONB,
    output_data JSONB,
    metrics JSONB NOT NULL,
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    metadata JSONB,
    user_id TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_operation ON ai_evaluations(operation);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_model ON ai_evaluations(model);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_user_id ON ai_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_session_id ON ai_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_created_at ON ai_evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_overall_score ON ai_evaluations(overall_score);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_operation_user_created 
ON ai_evaluations(operation, user_id, created_at DESC);

-- Search analyses table for storing competitive intelligence
CREATE TABLE IF NOT EXISTS search_analyses (
    id SERIAL PRIMARY KEY,
    analysis_id TEXT UNIQUE NOT NULL,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('competitor', 'market', 'feature', 'comprehensive')),
    company_name TEXT NOT NULL,
    industry TEXT,
    domain TEXT,
    search_queries JSONB NOT NULL,
    results JSONB NOT NULL,
    analysis JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    user_id TEXT,
    session_id TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search analyses
CREATE INDEX IF NOT EXISTS idx_search_analyses_type ON search_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_search_analyses_company ON search_analyses(company_name);
CREATE INDEX IF NOT EXISTS idx_search_analyses_industry ON search_analyses(industry);
CREATE INDEX IF NOT EXISTS idx_search_analyses_user_id ON search_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analyses_status ON search_analyses(status);
CREATE INDEX IF NOT EXISTS idx_search_analyses_created_at ON search_analyses(created_at DESC);

-- Search cache table for caching search results
CREATE TABLE IF NOT EXISTS search_cache (
    id SERIAL PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    search_query JSONB NOT NULL,
    results JSONB NOT NULL,
    provider TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_created_at ON search_cache(created_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_ai_evaluations_updated_at 
    BEFORE UPDATE ON ai_evaluations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_analyses_updated_at 
    BEFORE UPDATE ON search_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_evaluations IS 'Stores AI model evaluation results for quality monitoring';
COMMENT ON TABLE search_analyses IS 'Stores competitive intelligence and market analysis results';
COMMENT ON TABLE search_cache IS 'Caches search results to reduce API calls and improve performance';

COMMENT ON COLUMN ai_evaluations.eval_id IS 'Unique identifier for the evaluation';
COMMENT ON COLUMN ai_evaluations.operation IS 'Type of operation (e.g. generate-content, brainstorm)';
COMMENT ON COLUMN ai_evaluations.model IS 'AI model used (e.g. gpt-4o, gpt-4o-mini)';
COMMENT ON COLUMN ai_evaluations.metrics IS 'Array of evaluation metrics with scores and weights';
COMMENT ON COLUMN ai_evaluations.overall_score IS 'Weighted average score from 0 to 1';

COMMENT ON COLUMN search_analyses.analysis_type IS 'Type of analysis performed';
COMMENT ON COLUMN search_analyses.search_queries IS 'Queries used for the search';
COMMENT ON COLUMN search_analyses.results IS 'Raw search results';
COMMENT ON COLUMN search_analyses.analysis IS 'Processed analysis results';
COMMENT ON COLUMN search_analyses.processing_time_ms IS 'Time taken to complete the analysis in milliseconds';