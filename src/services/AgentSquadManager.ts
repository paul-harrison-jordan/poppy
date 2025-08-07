import type { 
  StrategicDirective, 
  AgentSquad, 
  MorningBrief
} from '@/types/agentMode';

export interface AgentSquadConfig {
  name: string;
  agents: string[];
  specialty: string;
  estimatedDuration: number; // in days
  triggers: string[]; // keywords that activate this squad
}

export class AgentSquadManager {
  private squads: Map<string, AgentSquad> = new Map();
  private squadConfigs: AgentSquadConfig[] = [
    {
      name: "Retention Squad",
      agents: ["ChurnAnalyzer", "UserJourneyMapper", "FeatureUsageAnalyzer", "RetentionStrategist"],
      specialty: "customer retention, churn analysis, lifecycle optimization",
      estimatedDuration: 3,
      triggers: ["churn", "retention", "lifecycle", "user journey", "drop off"]
    },
    {
      name: "Competitive Intel Squad",
      agents: ["CompetitiveAnalyzer", "MarketResearcher", "FeatureGapAnalyzer", "DifferentiationStrategist"],
      specialty: "competitive analysis, market positioning, differentiation strategy",
      estimatedDuration: 2,
      triggers: ["competitor", "competitive", "market share", "differentiation", "positioning"]
    },
    {
      name: "Growth Squad",
      agents: ["GrowthAnalyzer", "AcquisitionStrategist", "ConversionOptimizer", "ViralityExpert"],
      specialty: "user acquisition, conversion optimization, growth loops",
      estimatedDuration: 4,
      triggers: ["growth", "acquisition", "conversion", "funnel", "viral", "scaling"]
    },
    {
      name: "Revenue Squad",
      agents: ["RevenueAnalyzer", "PricingStrategist", "MonetizationExpert", "ARROptimizer"],
      specialty: "revenue optimization, pricing strategy, monetization",
      estimatedDuration: 3,
      triggers: ["revenue", "pricing", "monetization", "arr", "mrr", "pricing model"]
    },
    {
      name: "Platform Squad",
      agents: ["ArchitectureAnalyzer", "TechnicalDebtAssessor", "ScalabilityExpert", "IntegrationSpecialist"],
      specialty: "platform architecture, technical strategy, scalability",
      estimatedDuration: 5,
      triggers: ["platform", "architecture", "scalability", "technical debt", "infrastructure"]
    },
    {
      name: "UX Research Squad",
      agents: ["UserResearcher", "UsabilityAnalyzer", "JTBDExpert", "PersonaStrategist"],
      specialty: "user research, usability analysis, jobs-to-be-done framework",
      estimatedDuration: 2,
      triggers: ["user research", "usability", "ux", "user experience", "persona", "jtbd"]
    }
  ];

  constructor() {
    // Initialize with some mock active squads for demo
    this.initializeMockSquads();
  }

  private initializeMockSquads() {
    const mockSquad: AgentSquad = {
      id: "retention-squad-1",
      name: "Retention Squad",
      agents: ["ChurnAnalyzer", "UserJourneyMapper", "FeatureUsageAnalyzer", "RetentionStrategist"],
      mission: "Analyze SMB churn and identify features to improve retention",
      status: "3 proposals ready for review",
      progress: 85,
      deliverables: ["Churn root cause analysis", "Feature gap analysis", "Retention strategy proposals"],
      needsInput: true,
      estimatedCompletion: "Today 3pm"
    };

    this.squads.set(mockSquad.id, mockSquad);
  }

  async processDirective(directive: StrategicDirective): Promise<{
    interpretation: string;
    squad: AgentSquad;
    timeline: string;
    deliverables: string[];
  }> {
    // Analyze directive to determine best squad
    const bestSquad = this.selectBestSquad(directive.directive);
    
    // Create new squad instance
    const squadId = `${bestSquad.name.toLowerCase().replace(' ', '-')}-${Date.now()}`;
    const newSquad: AgentSquad = {
      id: squadId,
      name: bestSquad.name,
      agents: bestSquad.agents,
      mission: this.generateMission(directive.directive, bestSquad),
      status: "Initializing analysis",
      progress: 0,
      deliverables: this.generateDeliverables(directive.directive, bestSquad),
      needsInput: false,
      estimatedCompletion: this.calculateCompletion(bestSquad.estimatedDuration, directive.urgency)
    };

    this.squads.set(squadId, newSquad);

    // Simulate starting the squad work
    this.startSquadWork(squadId);

    return {
      interpretation: this.interpretDirective(directive.directive, bestSquad),
      squad: newSquad,
      timeline: `${bestSquad.estimatedDuration} days for initial proposals`,
      deliverables: newSquad.deliverables
    };
  }

  private selectBestSquad(directive: string): AgentSquadConfig {
    const directiveLower = directive.toLowerCase();
    
    // Score each squad based on keyword matches
    const scores = this.squadConfigs.map(config => {
      const matchCount = config.triggers.reduce((count, trigger) => {
        return count + (directiveLower.includes(trigger) ? 1 : 0);
      }, 0);
      return { config, score: matchCount };
    });

    // Sort by score and return the best match, or default to first squad
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.config || this.squadConfigs[0];
  }

  private generateMission(directive: string, squad: AgentSquadConfig): string {
    const missions = {
      "Retention Squad": `Analyze the retention challenge: "${directive}" and propose targeted solutions`,
      "Competitive Intel Squad": `Research competitive landscape around: "${directive}" and identify strategic opportunities`,
      "Growth Squad": `Investigate growth opportunities related to: "${directive}" and design acquisition strategies`,  
      "Revenue Squad": `Examine revenue impact of: "${directive}" and optimize monetization approach`,
      "Platform Squad": `Assess platform implications of: "${directive}" and recommend technical strategy`,
      "UX Research Squad": `Research user needs around: "${directive}" and validate problem-solution fit`
    };

    return missions[squad.name as keyof typeof missions] || `Execute strategic analysis of: "${directive}"`;
  }

  private generateDeliverables(directive: string, squad: AgentSquadConfig): string[] {
    const deliverables = {
      "Retention Squad": ["Churn root cause analysis", "User journey mapping", "Retention feature proposals"],
      "Competitive Intel Squad": ["Competitive landscape analysis", "Feature gap assessment", "Differentiation strategy"],
      "Growth Squad": ["Growth opportunity analysis", "Acquisition channel strategy", "Conversion optimization plan"],
      "Revenue Squad": ["Revenue impact analysis", "Pricing strategy recommendations", "Monetization feature specs"],
      "Platform Squad": ["Technical architecture assessment", "Scalability roadmap", "Integration specifications"],
      "UX Research Squad": ["User research findings", "Usability assessment", "Design recommendations"]
    };

    return deliverables[squad.name as keyof typeof deliverables] || ["Strategic analysis", "Recommendations", "Implementation plan"];
  }

  private interpretDirective(directive: string, squad: AgentSquadConfig): string {
    return `Analyzing "${directive}" requires ${squad.specialty} expertise. Deploying ${squad.name} to investigate.`;
  }

  private calculateCompletion(baseDays: number, urgency: string): string {
    const multiplier = {
      'critical': 0.5,
      'high': 0.7,
      'medium': 1.0,
      'low': 1.3
    }[urgency] || 1.0;

    const adjustedDays = Math.ceil(baseDays * multiplier);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + adjustedDays);
    
    return completionDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private async startSquadWork(squadId: string) {
    // Simulate squad work with progress updates
    const squad = this.squads.get(squadId);
    if (!squad) return;

    // Simulate work phases
    setTimeout(() => this.updateSquadProgress(squadId, 25, "Research phase complete"), 2000);
    setTimeout(() => this.updateSquadProgress(squadId, 50, "Analysis in progress"), 5000);
    setTimeout(() => this.updateSquadProgress(squadId, 75, "Generating proposals"), 8000);
    setTimeout(() => this.updateSquadProgress(squadId, 100, "Proposals ready for review", true), 12000);
  }

  private updateSquadProgress(squadId: string, progress: number, status: string, needsInput = false) {
    const squad = this.squads.get(squadId);
    if (squad) {
      squad.progress = progress;
      squad.status = status;
      squad.needsInput = needsInput;
      this.squads.set(squadId, squad);
    }
  }

  getActiveSquads(): AgentSquad[] {
    return Array.from(this.squads.values()).filter(squad => squad.progress < 100);
  }

  getSquadById(squadId: string): AgentSquad | undefined {
    return this.squads.get(squadId);
  }

  async pauseSquad(squadId: string): Promise<void> {
    const squad = this.squads.get(squadId);
    if (squad) {
      squad.status = "Paused - awaiting PM direction";
      this.squads.set(squadId, squad);
    }
  }

  async accelerateSquad(squadId: string): Promise<void> {
    const squad = this.squads.get(squadId);
    if (squad) {
      squad.status = "Accelerated - additional resources deployed";
      // Reduce estimated completion time
      const completion = new Date();
      completion.setHours(completion.getHours() + 4);
      squad.estimatedCompletion = completion.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
      this.squads.set(squadId, squad);
    }
  }

  async redirectSquad(squadId: string, newDirective: string): Promise<void> {
    const squad = this.squads.get(squadId);
    if (squad) {
      const bestSquad = this.selectBestSquad(newDirective);
      squad.mission = this.generateMission(newDirective, bestSquad);
      squad.status = "Redirected - analyzing new directive";
      squad.progress = Math.max(0, squad.progress - 25); // Reset some progress
      this.squads.set(squadId, squad);
    }
  }

  async generateMorningBrief(): Promise<MorningBrief> {
    const activeSquads = this.getActiveSquads();
    
    return {
      date: new Date().toLocaleDateString(),
      squadUpdates: activeSquads.map(squad => ({
        squadId: squad.id,
        squadName: squad.name,
        update: squad.status,
        needsInput: squad.needsInput,
        confidence: Math.min(0.95, squad.progress / 100 + 0.1),
        type: squad.progress >= 100 ? 'completed' : 
              squad.needsInput ? 'decision_needed' : 
              squad.progress > 0 ? 'progress' : 'blocked'
      })),
      proposalsReady: activeSquads
        .filter(squad => squad.progress >= 100)
        .map(squad => ({
          id: `proposal-${squad.id}`,
          title: `${squad.name} Recommendations`,
          tldr: `Strategic recommendations from ${squad.mission}`,
          impact: "High strategic impact on quarterly objectives",
          effort: "M",
          readTime: "5 min",
          status: 'pending_decision' as const
        })),
      opportunities: [], // Would be populated by opportunity scanner
      decisionsNeeded: activeSquads.filter(squad => squad.needsInput).length,
      strategicAlerts: [] // Would be populated by alert system
    };
  }
}