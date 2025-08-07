// Strategic Agent Mode Types
export interface QuarterlyObjective {
  id: string;
  description: string;
  target?: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
}

export interface AgentProposal {
  id: string;
  title: string;
  tldr: string;
  impact: string;
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL';
  confidence: number;
  readTime: string;
  status: 'draft' | 'ready_for_review' | 'approved' | 'rejected' | 'deferred';
  createdBy: string;
  createdAt: string;
}

export interface QuarterlyPlan {
  quarter: string;
  theme: string;
  objectives: QuarterlyObjective[];
  agent_proposals: AgentProposal[];
  status: 'in_planning' | 'executing' | 'reviewing' | 'completed';
}

export interface ProductVision {
  northStar: string;
  currentProgress: number;
  gaps: string[];
  opportunities: Opportunity[];
  lastUpdated: string;
}

export interface Opportunity {
  id: string;
  headline: string;
  whyNow: string;
  whatItMeans: string;
  recommendation: string;
  effortVsImpact: number;
  confidence: number;
  createdAt: string;
  source: 'competitive_intel' | 'customer_feedback' | 'market_analysis' | 'team_capacity';
}

export interface AgentSquad {
  id: string;
  name: string;
  agents: string[];
  mission: string;
  status: string;
  estimatedCompletion?: string;
  progress: number;
  deliverables: string[];
  needsInput: boolean;
}

export interface StrategicDirective {
  id: string;
  directive: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: number;
  createdAt: string;
  status: 'processing' | 'squad_assigned' | 'in_progress' | 'completed';
  assignedSquad?: string;
}

export interface MorningBriefUpdate {
  squadId: string;
  squadName: string;
  update: string;
  needsInput: boolean;
  confidence: number;
  options?: string[];
  type: 'progress' | 'decision_needed' | 'completed' | 'blocked';
}

export interface ProposalReady {
  id: string;
  title: string;
  tldr: string;
  impact: string;
  effort: string;
  readTime: string;
  status: 'pending_decision';
  dueDate?: string;
}

export interface MorningBrief {
  date: string;
  squadUpdates: MorningBriefUpdate[];
  proposalsReady: ProposalReady[];
  opportunities: Opportunity[];
  decisionsNeeded: number;
  strategicAlerts: StrategicAlert[];
}

export interface StrategicAlert {
  id: string;
  type: 'competitive_move' | 'market_shift' | 'customer_trend' | 'resource_opportunity';
  headline: string;
  summary: string;
  implication: string;
  recommendation: string;
  estimatedImpact: string;
  effortRequired: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface StrategicDashboard {
  quarters: Record<string, QuarterlyPlan>;
  productVision: ProductVision;
  activeSquads: AgentSquad[];
  pendingDirectives: StrategicDirective[];
  recentAlerts: StrategicAlert[];
}

export interface StrategicMetrics {
  visionAlignment: {
    current: number;
    trajectory: 'ahead' | 'on_track' | 'at_risk' | 'behind';
    keyDrivers: string[];
    blockers: string[];
  };
  businessMetrics: {
    arrImpact: string;
    churnReduction: string;
    npsIncrease: string;
    competitiveWins: string;
  };
  pmProductivity: {
    strategicTimeRatio: string;
    decisionsPerWeek: number;
    featuresShippedPerQuarter: number;
    visionToExecutionCycle: string;
  };
}