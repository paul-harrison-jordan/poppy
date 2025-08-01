-- Teams Feature Database Schema
-- This extends the existing engineers system with proper team structure

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  team_name VARCHAR(255) NOT NULL,
  team_description TEXT,
  user_email VARCHAR(255) NOT NULL, -- PM who owns this team
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Team settings
  default_capacity_hours_per_week INTEGER DEFAULT 40,
  default_utilization_target DECIMAL(3,2) DEFAULT 0.80,
  
  UNIQUE(team_name, user_email)
);

-- 2. Create team_members table (replaces the simple 'team' field in engineers)
CREATE TABLE IF NOT EXISTS team_members (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
  engineer_id BIGINT REFERENCES engineers(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL, -- For RLS
  
  -- Role in team
  role VARCHAR(50) NOT NULL DEFAULT 'engineer', -- 'engineering_manager', 'designer', 'engineer', 'tech_lead'
  is_primary_role BOOLEAN DEFAULT true, -- Can be on multiple teams, but one primary
  
  -- Member-specific settings
  joining_date DATE,
  capacity_override INTEGER, -- Override team default if needed
  utilization_override DECIMAL(3,2), -- Override team default if needed
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(team_id, engineer_id)
);

-- 3. Create team_performance_metrics table (foundation for future AI suggestions)
CREATE TABLE IF NOT EXISTS team_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  team_member_id BIGINT REFERENCES team_members(id) ON DELETE CASCADE,
  prd_id BIGINT REFERENCES prds(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL, -- For RLS
  
  -- Performance tracking
  estimated_weeks DECIMAL(4,2),
  actual_weeks DECIMAL(4,2),
  complexity_rating INTEGER CHECK (complexity_rating >= 1 AND complexity_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  
  -- Skill assessment
  primary_technologies TEXT[], -- JSON array of tech used
  skill_improvement_areas TEXT[], -- Areas engineer grew in
  
  -- Timeline tracking
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update existing feature_engineer_assignments to reference team_members
-- (This will be done via API migration to maintain data integrity)

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_user_email ON teams(user_email);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_engineer_id ON team_members(engineer_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_email ON team_members(user_email);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_performance_metrics_team_member ON team_performance_metrics(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_metrics_prd ON team_performance_metrics(prd_id);

-- 6. Row Level Security (RLS) Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can manage their own teams" ON teams
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- Team members policies  
CREATE POLICY "Users can manage their team members" ON team_members
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- Performance metrics policies
CREATE POLICY "Users can manage their team performance metrics" ON team_performance_metrics
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- 7. Updated triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_performance_metrics_updated_at BEFORE UPDATE ON team_performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();