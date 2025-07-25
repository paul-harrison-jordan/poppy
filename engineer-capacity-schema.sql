-- Engineer Capacity Management Schema Extension
-- Adds engineer assignment and capacity tracking to the existing roadmap system

-- Engineers Table
-- Stores information about team members who can be assigned to features
CREATE TABLE IF NOT EXISTS engineers (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL, -- PM who manages this team
    engineer_email TEXT NOT NULL,
    engineer_name TEXT NOT NULL,
    title TEXT, -- e.g., "Senior Software Engineer", "Engineering Manager"
    team TEXT, -- e.g., "Platform", "Frontend", "Backend", "Full Stack"
    skill_tags TEXT[], -- e.g., ["React", "Python", "AWS", "Database Design"]
    capacity_hours_per_week INTEGER DEFAULT 40, -- Available working hours per week
    utilization_target DECIMAL(3,2) DEFAULT 0.80 CHECK (utilization_target >= 0 AND utilization_target <= 1), -- Target utilization (0.8 = 80%)
    is_active BOOLEAN DEFAULT true, -- Whether engineer is currently available
    hire_date DATE,
    notes TEXT, -- PM notes about engineer strengths, preferences, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, engineer_email) -- One record per engineer per PM
);

-- Feature Engineer Assignments Table
-- Links features (PRDs) to assigned engineers with estimated time allocation
CREATE TABLE IF NOT EXISTS feature_engineer_assignments (
    id BIGSERIAL PRIMARY KEY,
    prd_id INTEGER NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    engineer_id INTEGER NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL, -- PM who owns this assignment
    
    -- Time allocation
    estimated_weeks DECIMAL(4,2) NOT NULL CHECK (estimated_weeks > 0), -- Time this engineer will spend on this feature
    actual_weeks DECIMAL(4,2), -- Actual time spent (for historical tracking)
    percentage_allocation INTEGER DEFAULT 100 CHECK (percentage_allocation > 0 AND percentage_allocation <= 100), -- % of engineer's time (100 = full time)
    
    -- Scheduling
    start_date DATE, -- When engineer should start working on this
    end_date DATE, -- Expected completion date
    
    -- Assignment details
    role_on_feature TEXT, -- e.g., "Lead Developer", "Backend Support", "Code Reviewer"
    assignment_notes TEXT, -- Specific notes about this assignment
    assignment_status TEXT DEFAULT 'planned' CHECK (assignment_status IN ('planned', 'active', 'completed', 'on_hold', 'cancelled')),
    
    -- Metadata
    assigned_by TEXT NOT NULL, -- Email of PM who made the assignment
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(prd_id, engineer_id) -- One assignment per engineer per feature
);

-- Engineer Capacity Snapshots Table
-- Tracks historical capacity utilization for reporting and planning
CREATE TABLE IF NOT EXISTS engineer_capacity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    engineer_id INTEGER NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    
    -- Snapshot period
    snapshot_date DATE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('weekly', 'monthly', 'quarterly')),
    
    -- Capacity metrics
    total_capacity_hours DECIMAL(6,2) NOT NULL, -- Total available hours in period
    allocated_hours DECIMAL(6,2) NOT NULL DEFAULT 0, -- Hours allocated to features
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_capacity_hours > 0 THEN (allocated_hours / total_capacity_hours * 100)
            ELSE 0 
        END
    ) STORED, -- Calculated utilization percentage
    
    -- Feature breakdown
    active_features_count INTEGER DEFAULT 0,
    completed_features_count INTEGER DEFAULT 0,
    
    -- Metadata
    snapshot_data JSONB, -- Detailed breakdown of assignments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(engineer_id, snapshot_date, period_type)
);

-- Team Capacity Planning Table
-- Stores capacity planning scenarios and "what-if" analyses
CREATE TABLE IF NOT EXISTS team_capacity_plans (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    plan_description TEXT,
    
    -- Planning period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Plan data
    plan_data JSONB NOT NULL, -- Stores the full capacity plan (engineers, features, assignments)
    total_capacity_weeks DECIMAL(10,2), -- Total team capacity in this period
    allocated_capacity_weeks DECIMAL(10,2), -- Allocated capacity in this period
    utilization_target DECIMAL(3,2) DEFAULT 0.80,
    
    -- Plan status
    is_active BOOLEAN DEFAULT false, -- Is this the current active plan
    plan_status TEXT DEFAULT 'draft' CHECK (plan_status IN ('draft', 'active', 'completed', 'archived')),
    
    -- Metadata
    created_by TEXT NOT NULL,
    last_modified_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_email, plan_name) -- Unique plan names per PM
);

-- Add weeks_to_ship field to PRDs if it doesn't exist
-- This represents the total estimated time for the feature
ALTER TABLE prds ADD COLUMN IF NOT EXISTS weeks_to_ship DECIMAL(4,2) CHECK (weeks_to_ship > 0);

-- Add engineer assignment summary fields to PRDs for quick access
ALTER TABLE prds ADD COLUMN IF NOT EXISTS assigned_engineers_count INTEGER DEFAULT 0;
ALTER TABLE prds ADD COLUMN IF NOT EXISTS total_estimated_weeks DECIMAL(6,2) DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_engineers_user_email ON engineers(user_email);
CREATE INDEX IF NOT EXISTS idx_engineers_engineer_email ON engineers(engineer_email);
CREATE INDEX IF NOT EXISTS idx_engineers_team ON engineers(team);
CREATE INDEX IF NOT EXISTS idx_engineers_is_active ON engineers(is_active);

CREATE INDEX IF NOT EXISTS idx_feature_assignments_prd_id ON feature_engineer_assignments(prd_id);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_engineer_id ON feature_engineer_assignments(engineer_id);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_user_email ON feature_engineer_assignments(user_email);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_status ON feature_engineer_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_dates ON feature_engineer_assignments(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_engineer_id ON engineer_capacity_snapshots(engineer_id);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_date ON engineer_capacity_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_user_email ON engineer_capacity_snapshots(user_email);

CREATE INDEX IF NOT EXISTS idx_capacity_plans_user_email ON team_capacity_plans(user_email);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_active ON team_capacity_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_dates ON team_capacity_plans(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_engineer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_capacity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_capacity_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for engineers
CREATE POLICY "PMs can manage their team engineers" ON engineers
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for feature_engineer_assignments
CREATE POLICY "PMs can manage their feature assignments" ON feature_engineer_assignments
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for engineer_capacity_snapshots
CREATE POLICY "PMs can view their team capacity snapshots" ON engineer_capacity_snapshots
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- RLS Policies for team_capacity_plans
CREATE POLICY "PMs can manage their capacity plans" ON team_capacity_plans
    FOR ALL USING (user_email = auth.jwt() ->> 'email');

-- Triggers to update updated_at timestamps
CREATE TRIGGER update_engineers_updated_at BEFORE UPDATE
    ON engineers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_assignments_updated_at BEFORE UPDATE
    ON feature_engineer_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacity_plans_updated_at BEFORE UPDATE
    ON team_capacity_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions to automatically update PRD assignment summary fields
CREATE OR REPLACE FUNCTION update_prd_assignment_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the PRD's assignment summary when assignments change
    UPDATE prds SET 
        assigned_engineers_count = (
            SELECT COUNT(DISTINCT engineer_id) 
            FROM feature_engineer_assignments 
            WHERE prd_id = COALESCE(NEW.prd_id, OLD.prd_id)
              AND assignment_status IN ('planned', 'active')
        ),
        total_estimated_weeks = (
            SELECT COALESCE(SUM(estimated_weeks), 0)
            FROM feature_engineer_assignments 
            WHERE prd_id = COALESCE(NEW.prd_id, OLD.prd_id)
              AND assignment_status IN ('planned', 'active')
        )
    WHERE id = COALESCE(NEW.prd_id, OLD.prd_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain assignment summary
CREATE TRIGGER trigger_update_prd_assignment_summary_insert
    AFTER INSERT ON feature_engineer_assignments
    FOR EACH ROW EXECUTE FUNCTION update_prd_assignment_summary();

CREATE TRIGGER trigger_update_prd_assignment_summary_update
    AFTER UPDATE ON feature_engineer_assignments
    FOR EACH ROW EXECUTE FUNCTION update_prd_assignment_summary();

CREATE TRIGGER trigger_update_prd_assignment_summary_delete
    AFTER DELETE ON feature_engineer_assignments
    FOR EACH ROW EXECUTE FUNCTION update_prd_assignment_summary();