-- PRDs Table
-- Main table for storing Product Requirements Documents - Single Source of Truth
CREATE TABLE IF NOT EXISTS prds (
    id BIGSERIAL PRIMARY KEY,
    "drive-link" TEXT NOT NULL, -- Google Docs URL (primary artifact)
    "v0-link" TEXT DEFAULT '', -- Design mockup URL
    "v0-chat-id" TEXT DEFAULT '', -- V0 chat session ID for continued editing
    "user" TEXT NOT NULL, -- User email who owns this PRD
    "title" TEXT, -- Title of the PRD
    "description" TEXT, -- Brief description/summary
    
    -- Roadmap/Project Management Fields (moved here for single source of truth)
    "status" TEXT NOT NULL DEFAULT 'planned' CHECK ("status" IN ('planned', 'in_progress', 'in_review', 'shipped', 'on_hold')),
    "priority_order" INTEGER DEFAULT 0, -- For drag-drop ordering in roadmap
    "target_quarter" TEXT, -- e.g., "Q1 2024"
    "estimated_effort_points" INTEGER, -- Story points or effort estimation
    "business_value_score" INTEGER CHECK (business_value_score >= 1 AND business_value_score <= 10), -- 1-10 business impact score
    "technical_complexity_score" INTEGER CHECK (technical_complexity_score >= 1 AND technical_complexity_score <= 10), -- 1-10 technical complexity score
    "dependencies" TEXT[], -- Array of dependency descriptions
    "risks" JSONB DEFAULT '[]', -- [{risk: string, mitigation: string, impact: string}]
    "success_metrics" JSONB DEFAULT '[]', -- [{metric: string, target: string, measurement: string}]
    "roadmap_notes" TEXT, -- PM notes for roadmap discussions
    
    -- Deprecated: keeping for backward compatibility, but "status" above replaces this
    "shipped" BOOLEAN GENERATED ALWAYS AS ("status" = 'shipped') STORED,
    
    "last_updated_by" TEXT, -- Email of last updater
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prds_user ON prds("user");
CREATE INDEX IF NOT EXISTS idx_prds_created_at ON prds(created_at);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds("status");
CREATE INDEX IF NOT EXISTS idx_prds_priority_order ON prds("priority_order");
CREATE INDEX IF NOT EXISTS idx_prds_shipped ON prds(shipped); -- For backward compatibility

-- Enable Row Level Security
ALTER TABLE prds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prds table
CREATE POLICY "Users can access their own PRDs" ON prds
    FOR ALL USING ("user" = auth.jwt() ->> 'email');

-- Allow public read access for the features page (non-authenticated users can view)
CREATE POLICY "Public can read PRDs for features page" ON prds
    FOR SELECT USING (true);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_prds_updated_at BEFORE UPDATE
    ON prds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Knowledge Tracking System Tables
-- This system tracks user learning progress and knowledge to improve PRD generation

-- User Knowledge Sessions Table
-- Tracks overall learning sessions and their context
CREATE TABLE IF NOT EXISTS user_knowledge_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('vocabulary', 'questions', 'brainstorm', 'prd_generation')),
    context_data JSONB,
    duration_seconds INTEGER,
    completion_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vocabulary Definitions Table
-- Stores PM's authoritative vocabulary and terminology for their domain
CREATE TABLE IF NOT EXISTS vocabulary_definitions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES user_knowledge_sessions(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    term TEXT NOT NULL,
    user_definition TEXT NOT NULL,
    domain_tags TEXT[],
    usage_context TEXT, -- Context where this term is typically used
    related_terms TEXT[], -- Terms that often appear together
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, term) -- One definition per user per term
);

-- Question Responses Table
-- Stores PM decision-making patterns and preferences from Q&A sessions
CREATE TABLE IF NOT EXISTS question_responses (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES user_knowledge_sessions(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_reasoning TEXT,
    user_answer TEXT NOT NULL,
    domain_category TEXT,
    context_data JSONB,
    extracted_insights JSONB, -- AI-extracted preferences and patterns
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PM Preference Profiles Table
-- Aggregated PM decision-making patterns, preferences, and vocabulary
CREATE TABLE IF NOT EXISTS pm_preference_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL UNIQUE,
    vocabulary_glossary JSONB NOT NULL DEFAULT '{}', -- Term -> Definition mapping
    decision_frameworks JSONB NOT NULL DEFAULT '{}', -- Extracted mental models
    trade_off_preferences JSONB NOT NULL DEFAULT '{}', -- Preference patterns (speed vs quality, etc)
    product_philosophy TEXT, -- Overall product approach summary
    recurring_themes TEXT[], -- Common themes across decisions
    domain_expertise TEXT[], -- Areas of focus/expertise
    personal_context JSONB, -- User's PRD writing context (examplesOfHowYouThink, teamStrategy, etc)
    total_sessions INTEGER DEFAULT 0,
    total_vocabulary_terms INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning Analytics Table
-- Tracks detailed learning patterns and metrics
CREATE TABLE IF NOT EXISTS learning_analytics (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('session_duration', 'completion_rate', 'knowledge_growth', 'engagement_score')),
    metric_value FLOAT NOT NULL,
    context_data JSONB,
    date_recorded DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_sessions_user_email ON user_knowledge_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_knowledge_sessions_type ON user_knowledge_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_sessions_created_at ON user_knowledge_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_vocabulary_definitions_user_email ON vocabulary_definitions(user_email);
CREATE INDEX IF NOT EXISTS idx_vocabulary_definitions_term ON vocabulary_definitions(term);
CREATE INDEX IF NOT EXISTS idx_vocabulary_definitions_session_id ON vocabulary_definitions(session_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_definitions_domain_tags ON vocabulary_definitions USING GIN(domain_tags);

CREATE INDEX IF NOT EXISTS idx_question_responses_user_email ON question_responses(user_email);
CREATE INDEX IF NOT EXISTS idx_question_responses_session_id ON question_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_domain ON question_responses(domain_category);
CREATE INDEX IF NOT EXISTS idx_question_responses_created_at ON question_responses(created_at);

CREATE INDEX IF NOT EXISTS idx_pm_profiles_user_email ON pm_preference_profiles(user_email);
CREATE INDEX IF NOT EXISTS idx_pm_profiles_last_activity ON pm_preference_profiles(last_activity_date);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_email ON learning_analytics(user_email);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_type ON learning_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_date ON learning_analytics(date_recorded);

-- Enable Row Level Security for all knowledge tables
ALTER TABLE user_knowledge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_preference_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_knowledge_sessions
CREATE POLICY "Users can access their own sessions" ON user_knowledge_sessions
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for vocabulary_definitions
CREATE POLICY "Users can access their own vocabulary definitions" ON vocabulary_definitions
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for question_responses
CREATE POLICY "Users can access their own question responses" ON question_responses
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for pm_preference_profiles
CREATE POLICY "Users can access their own preference profile" ON pm_preference_profiles
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for learning_analytics
CREATE POLICY "Users can access their own learning analytics" ON learning_analytics
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- Triggers to update updated_at timestamps
CREATE TRIGGER update_knowledge_sessions_updated_at BEFORE UPDATE
    ON user_knowledge_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_definitions_updated_at BEFORE UPDATE
    ON vocabulary_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_responses_updated_at BEFORE UPDATE
    ON question_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pm_preference_profiles_updated_at BEFORE UPDATE
    ON pm_preference_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Roadmap Management System Tables
-- This system extends the existing PRDs table with roadmap-specific features

-- PRD Roadmap Analytics Table (DEPRECATED - data moved to prds table)
-- Keeping for backward compatibility during migration
-- This table is now used only for historical tracking and analytics
CREATE TABLE IF NOT EXISTS prd_roadmap_data (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    
    -- NOTE: These fields are now stored in the main prds table
    -- Keeping here for migration compatibility only
    priority_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planned',
    target_quarter TEXT,
    estimated_effort_points INTEGER,
    business_value_score INTEGER,
    technical_complexity_score INTEGER,
    dependencies TEXT[],
    risks JSONB DEFAULT '[]',
    success_metrics JSONB DEFAULT '[]',
    roadmap_notes TEXT,
    
    last_updated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Mark as deprecated
    is_migrated BOOLEAN DEFAULT false,
    migration_notes TEXT DEFAULT 'Data moved to prds table for single source of truth',
    
    UNIQUE(prd_id)
);

-- Slack Channel Links Table
-- Links PRDs to relevant Slack channels
CREATE TABLE IF NOT EXISTS prd_slack_channels (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    channel_name TEXT NOT NULL, -- e.g., "#product-feature-x"
    channel_id TEXT, -- Slack channel ID if available
    channel_url TEXT, -- Direct link to channel
    channel_purpose TEXT, -- Description of why this channel is linked
    is_primary BOOLEAN DEFAULT false, -- Is this the main channel for this PRD
    added_by TEXT NOT NULL, -- Email of user who added the link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jira Ticket Links Table
-- Links PRDs to relevant Jira tickets/epics
CREATE TABLE IF NOT EXISTS prd_jira_tickets (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    ticket_key TEXT NOT NULL, -- e.g., "PROJ-123"
    ticket_url TEXT NOT NULL, -- Direct link to Jira ticket
    ticket_type TEXT, -- e.g., "Epic", "Story", "Bug"
    ticket_title TEXT,
    ticket_status TEXT, -- Current Jira status
    is_primary_epic BOOLEAN DEFAULT false, -- Is this the main epic for this PRD
    added_by TEXT NOT NULL, -- Email of user who added the link
    last_synced_at TIMESTAMP WITH TIME ZONE, -- For future Jira sync feature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Feedback Table
-- Stores customer feedback and requests related to PRDs
CREATE TABLE IF NOT EXISTS prd_customer_feedback (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    customer_name TEXT,
    customer_company TEXT,
    customer_email TEXT,
    feedback_source TEXT, -- e.g., "Sales call", "Support ticket", "User interview"
    feedback_type TEXT NOT NULL DEFAULT 'request' CHECK (feedback_type IN ('request', 'pain_point', 'use_case', 'validation', 'concern')),
    feedback_content TEXT NOT NULL,
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    business_impact TEXT, -- Potential revenue/user impact
    feedback_date DATE,
    internal_notes TEXT, -- PM's private notes about this feedback
    is_public BOOLEAN DEFAULT true, -- Whether this can be shared with stakeholders
    added_by TEXT NOT NULL, -- Email of user who added the feedback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stakeholder Sign-offs Table
-- Tracks approvals and sign-offs from key stakeholders
CREATE TABLE IF NOT EXISTS prd_stakeholder_signoffs (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL, -- PM who owns this PRD
    stakeholder_email TEXT NOT NULL,
    stakeholder_name TEXT NOT NULL,
    stakeholder_role TEXT, -- e.g., "Engineering Manager", "Head of Sales"
    signoff_type TEXT NOT NULL CHECK (signoff_type IN ('technical_review', 'business_approval', 'legal_review', 'security_review', 'design_review', 'go_to_market')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_changes')),
    signoff_notes TEXT, -- Stakeholder's comments
    decision_date TIMESTAMP WITH TIME ZONE,
    due_date DATE, -- When signoff is needed by
    reminder_sent_at TIMESTAMP WITH TIME ZONE, -- For reminder tracking
    requested_by TEXT NOT NULL, -- Email of user who requested the signoff
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roadmap Activity Log Table
-- Tracks changes and activity on roadmap items for audit trail
CREATE TABLE IF NOT EXISTS roadmap_activity_log (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('priority_changed', 'status_updated', 'slack_added', 'jira_added', 'feedback_added', 'signoff_requested', 'signoff_completed', 'notes_updated')),
    description TEXT NOT NULL, -- Human-readable description of the change
    old_value TEXT, -- Previous value (if applicable)
    new_value TEXT, -- New value (if applicable)
    metadata JSONB, -- Additional context data
    performed_by TEXT NOT NULL, -- Email of user who made the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance on roadmap tables
CREATE INDEX IF NOT EXISTS idx_prd_roadmap_data_prd_id ON prd_roadmap_data(prd_id);
CREATE INDEX IF NOT EXISTS idx_prd_roadmap_data_user_email ON prd_roadmap_data(user_email);
CREATE INDEX IF NOT EXISTS idx_prd_roadmap_data_priority_order ON prd_roadmap_data(priority_order);
CREATE INDEX IF NOT EXISTS idx_prd_roadmap_data_status ON prd_roadmap_data(status);

CREATE INDEX IF NOT EXISTS idx_prd_slack_channels_prd_id ON prd_slack_channels(prd_id);
CREATE INDEX IF NOT EXISTS idx_prd_slack_channels_user_email ON prd_slack_channels(user_email);

CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_prd_id ON prd_jira_tickets(prd_id);
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_user_email ON prd_jira_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_ticket_key ON prd_jira_tickets(ticket_key);

CREATE INDEX IF NOT EXISTS idx_prd_customer_feedback_prd_id ON prd_customer_feedback(prd_id);
CREATE INDEX IF NOT EXISTS idx_prd_customer_feedback_user_email ON prd_customer_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_prd_customer_feedback_urgency ON prd_customer_feedback(urgency_level);
CREATE INDEX IF NOT EXISTS idx_prd_customer_feedback_type ON prd_customer_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_prd_stakeholder_signoffs_prd_id ON prd_stakeholder_signoffs(prd_id);
CREATE INDEX IF NOT EXISTS idx_prd_stakeholder_signoffs_user_email ON prd_stakeholder_signoffs(user_email);
CREATE INDEX IF NOT EXISTS idx_prd_stakeholder_signoffs_stakeholder ON prd_stakeholder_signoffs(stakeholder_email);
CREATE INDEX IF NOT EXISTS idx_prd_stakeholder_signoffs_status ON prd_stakeholder_signoffs(status);
CREATE INDEX IF NOT EXISTS idx_prd_stakeholder_signoffs_type ON prd_stakeholder_signoffs(signoff_type);

CREATE INDEX IF NOT EXISTS idx_roadmap_activity_log_prd_id ON roadmap_activity_log(prd_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_activity_log_user_email ON roadmap_activity_log(user_email);
CREATE INDEX IF NOT EXISTS idx_roadmap_activity_log_activity_type ON roadmap_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_roadmap_activity_log_created_at ON roadmap_activity_log(created_at);

-- Enable Row Level Security for all roadmap tables
ALTER TABLE prd_roadmap_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_jira_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_stakeholder_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prd_roadmap_data
CREATE POLICY "Users can access their own PRD roadmap data" ON prd_roadmap_data
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for prd_slack_channels
CREATE POLICY "Users can access their own PRD Slack channels" ON prd_slack_channels
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for prd_jira_tickets
CREATE POLICY "Users can access their own PRD Jira tickets" ON prd_jira_tickets
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for prd_customer_feedback
CREATE POLICY "Users can access their own PRD customer feedback" ON prd_customer_feedback
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for prd_stakeholder_signoffs
-- Users can see signoffs for their PRDs, and stakeholders can see signoffs requested from them
CREATE POLICY "Users can access signoffs for their PRDs" ON prd_stakeholder_signoffs
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Stakeholders can access their own signoff requests" ON prd_stakeholder_signoffs
    FOR SELECT USING (stakeholder_email = auth.jwt() ->> 'email');

CREATE POLICY "Stakeholders can update their own signoff requests" ON prd_stakeholder_signoffs
    FOR UPDATE USING (stakeholder_email = auth.jwt() ->> 'email');

-- RLS Policies for roadmap_activity_log
CREATE POLICY "Users can access activity logs for their PRDs" ON roadmap_activity_log
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- Triggers to update updated_at timestamps for roadmap tables
CREATE TRIGGER update_prd_roadmap_data_updated_at BEFORE UPDATE
    ON prd_roadmap_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prd_jira_tickets_updated_at BEFORE UPDATE
    ON prd_jira_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prd_customer_feedback_updated_at BEFORE UPDATE
    ON prd_customer_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prd_stakeholder_signoffs_updated_at BEFORE UPDATE
    ON prd_stakeholder_signoffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();