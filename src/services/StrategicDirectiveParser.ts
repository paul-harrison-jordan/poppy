// Strategic Directive Parser - converts high-level PM inputs into tactical agent missions

export interface ParsedDirective {
  intent: 'analyze' | 'optimize' | 'investigate' | 'build' | 'research' | 'compare' | 'solve';
  domain: 'retention' | 'growth' | 'revenue' | 'product' | 'market' | 'competitive' | 'technical' | 'ux';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: number;
  keyEntities: string[];
  success_metrics: string[];
  constraints: string[];
  timeline_expectation: string;
}

export interface AgentPlan {
  interpretation: string;
  recommendedSquad: string;
  squadAgents: string[];
  timeline: string;
  deliverables: string[];
  successCriteria: string[];
  estimatedEffort: 'XS' | 'S' | 'M' | 'L' | 'XL';
}

export class StrategicDirectiveParser {
  private intentPatterns = {
    analyze: ['analyze', 'understand', 'figure out', 'investigate', 'research', 'study', 'examine'],
    optimize: ['improve', 'optimize', 'increase', 'reduce', 'enhance', 'boost', 'maximize'],
    investigate: ['why', 'what\'s happening', 'root cause', 'identify', 'discover', 'find out'],
    build: ['build', 'create', 'develop', 'implement', 'design', 'make', 'launch'],
    research: ['research', 'survey', 'interview', 'test', 'validate', 'explore'],
    compare: ['competitive', 'benchmark', 'compare', 'versus', 'against', 'competitor'],
    solve: ['solve', 'fix', 'address', 'resolve', 'tackle', 'handle']
  };

  private domainPatterns = {
    retention: ['churn', 'retention', 'lifecycle', 'renewal', 'stay', 'leave', 'drop off', 'abandon'],
    growth: ['growth', 'acquisition', 'scaling', 'expand', 'viral', 'referral', 'conversion', 'funnel'],
    revenue: ['revenue', 'pricing', 'monetization', 'arr', 'mrr', 'sales', 'income', 'profit'],
    product: ['feature', 'product', 'functionality', 'capability', 'roadmap', 'development'],
    market: ['market', 'segment', 'customer', 'user', 'persona', 'target'],
    competitive: ['competitor', 'competitive', 'market share', 'differentiation', 'positioning'],
    technical: ['platform', 'architecture', 'scalability', 'performance', 'infrastructure', 'tech debt'],
    ux: ['user experience', 'usability', 'interface', 'design', 'workflow', 'journey']
  };

  private urgencyPatterns = {
    critical: ['urgent', 'critical', 'immediately', 'asap', 'emergency', 'crisis'],
    high: ['high priority', 'important', 'soon', 'quickly', 'fast'],
    medium: ['medium', 'normal', 'standard'],
    low: ['low priority', 'when possible', 'eventually', 'nice to have']
  };

  private complexityIndicators = {
    high: ['multiple', 'various', 'complex', 'comprehensive', 'enterprise', 'large scale'],
    medium: ['some', 'several', 'moderate', 'typical'],
    low: ['simple', 'basic', 'straightforward', 'quick', 'minimal']
  };

  parseDirective(directive: string, explicitUrgency?: 'low' | 'medium' | 'high' | 'critical'): ParsedDirective {
    const directiveLower = directive.toLowerCase();

    return {
      intent: this.extractIntent(directiveLower),
      domain: this.extractDomain(directiveLower),
      urgency: explicitUrgency || this.extractUrgency(directiveLower),
      complexity: this.calculateComplexity(directiveLower),
      keyEntities: this.extractKeyEntities(directive),
      success_metrics: this.inferSuccessMetrics(directiveLower),
      constraints: this.extractConstraints(directiveLower),
      timeline_expectation: this.inferTimelineExpectation(directiveLower)
    };
  }

  async generateAgentPlan(parsed: ParsedDirective): Promise<AgentPlan> {
    const squadMapping = {
      retention: {
        name: "Retention Squad",
        agents: ["ChurnAnalyzer", "UserJourneyMapper", "FeatureUsageAnalyzer", "RetentionStrategist"]
      },
      growth: {
        name: "Growth Squad", 
        agents: ["GrowthAnalyzer", "AcquisitionStrategist", "ConversionOptimizer", "ViralityExpert"]
      },
      revenue: {
        name: "Revenue Squad",
        agents: ["RevenueAnalyzer", "PricingStrategist", "MonetizationExpert", "ARROptimizer"]
      },
      competitive: {
        name: "Competitive Intel Squad",
        agents: ["CompetitiveAnalyzer", "MarketResearcher", "FeatureGapAnalyzer", "DifferentiationStrategist"]
      },
      technical: {
        name: "Platform Squad",
        agents: ["ArchitectureAnalyzer", "TechnicalDebtAssessor", "ScalabilityExpert", "IntegrationSpecialist"]
      },
      ux: {
        name: "UX Research Squad",
        agents: ["UserResearcher", "UsabilityAnalyzer", "JTBDExpert", "PersonaStrategist"]
      },
      product: {
        name: "Product Strategy Squad",
        agents: ["ProductStrategist", "RoadmapAnalyzer", "FeaturePrioritizer", "StakeholderAligner"]
      },
      market: {
        name: "Market Research Squad",
        agents: ["MarketAnalyzer", "CustomerInsightExpert", "SegmentationStrategist", "TrendAnalyzer"]
      }
    };

    const squad = squadMapping[parsed.domain];
    const deliverables = this.generateDeliverables(parsed);
    const timeline = this.calculateTimeline(parsed);

    return {
      interpretation: this.generateInterpretation(parsed),
      recommendedSquad: squad.name,
      squadAgents: squad.agents,
      timeline,
      deliverables,
      successCriteria: this.generateSuccessCriteria(parsed),
      estimatedEffort: this.calculateEffort(parsed)
    };
  }

  private extractIntent(directive: string): ParsedDirective['intent'] {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      if (patterns.some(pattern => directive.includes(pattern))) {
        return intent as ParsedDirective['intent'];
      }
    }
    return 'analyze'; // default
  }

  private extractDomain(directive: string): ParsedDirective['domain'] {
    for (const [domain, patterns] of Object.entries(this.domainPatterns)) {
      if (patterns.some(pattern => directive.includes(pattern))) {
        return domain as ParsedDirective['domain'];
      }
    }
    return 'product'; // default
  }

  private extractUrgency(directive: string): ParsedDirective['urgency'] {
    for (const [urgency, patterns] of Object.entries(this.urgencyPatterns)) {
      if (patterns.some(pattern => directive.includes(pattern))) {
        return urgency as ParsedDirective['urgency'];
      }
    }
    return 'medium'; // default
  }

  private calculateComplexity(directive: string): number {
    let complexity = 0.5; // baseline

    // Check for complexity indicators
    if (this.complexityIndicators.high.some(indicator => directive.includes(indicator))) {
      complexity += 0.3;
    }
    if (this.complexityIndicators.low.some(indicator => directive.includes(indicator))) {
      complexity -= 0.3;
    }

    // Word count factor
    const wordCount = directive.split(' ').length;
    if (wordCount > 20) complexity += 0.2;
    if (wordCount < 10) complexity -= 0.1;

    return Math.min(1, Math.max(0, complexity));
  }

  private extractKeyEntities(directive: string): string[] {
    // Simple keyword extraction - in production would use NLP
    const keywords = directive
      .split(' ')
      .filter(word => word.length > 4)
      .filter(word => !['what', 'when', 'where', 'why', 'how', 'should', 'could', 'would'].includes(word.toLowerCase()))
      .slice(0, 5);
    
    return keywords;
  }

  private inferSuccessMetrics(directive: string): string[] {
    const metrics = [];
    
    if (directive.includes('churn') || directive.includes('retention')) {
      metrics.push('Churn rate reduction', 'Customer lifetime value');
    }
    if (directive.includes('growth') || directive.includes('acquisition')) {
      metrics.push('User acquisition rate', 'Growth rate');
    }
    if (directive.includes('revenue') || directive.includes('arr')) {
      metrics.push('Revenue growth', 'Customer value');
    }
    if (directive.includes('competitive')) {
      metrics.push('Market share', 'Win rate');
    }
    
    return metrics.length > 0 ? metrics : ['Strategic objective achievement'];
  }

  private extractConstraints(directive: string): string[] {
    const constraints = [];
    
    if (directive.includes('budget') || directive.includes('cost')) {
      constraints.push('Budget limitations');
    }
    if (directive.includes('time') || directive.includes('deadline')) {
      constraints.push('Timeline constraints');
    }
    if (directive.includes('resource') || directive.includes('capacity')) {
      constraints.push('Resource constraints');
    }
    
    return constraints;
  }

  private inferTimelineExpectation(directive: string): string {
    if (this.urgencyPatterns.critical.some(pattern => directive.includes(pattern))) {
      return 'Within 1-2 days';
    }
    if (this.urgencyPatterns.high.some(pattern => directive.includes(pattern))) {
      return 'Within 1 week';
    }
    if (this.urgencyPatterns.low.some(pattern => directive.includes(pattern))) {
      return 'Within 2-3 weeks';
    }
    return 'Within 1-2 weeks'; // default
  }

  private generateInterpretation(parsed: ParsedDirective): string {
    const templates = {
      analyze: `This directive requires ${parsed.domain} analysis to ${parsed.intent} the situation`,
      optimize: `Strategic optimization needed in ${parsed.domain} domain to ${parsed.intent} performance`,
      investigate: `Deep investigation into ${parsed.domain} challenges to identify root causes`,
      build: `Product development initiative requiring ${parsed.domain} expertise`,
      research: `Research initiative to gather ${parsed.domain} insights`,
      compare: `Competitive analysis needed to understand ${parsed.domain} positioning`,
      solve: `Problem-solving approach required for ${parsed.domain} challenges`
    };

    return templates[parsed.intent];
  }

  private generateDeliverables(parsed: ParsedDirective): string[] {
    const baseDeliverables = {
      analyze: ['Analysis report', 'Key findings summary', 'Recommendations'],
      optimize: ['Optimization strategy', 'Implementation roadmap', 'Success metrics'],
      investigate: ['Investigation findings', 'Root cause analysis', 'Solution proposals'],
      build: ['Product requirements', 'Development roadmap', 'Success criteria'],
      research: ['Research findings', 'Market insights', 'Strategic recommendations'],
      compare: ['Competitive analysis', 'Market positioning', 'Differentiation strategy'],
      solve: ['Problem assessment', 'Solution options', 'Implementation plan']
    };

    return baseDeliverables[parsed.intent];
  }

  private calculateTimeline(parsed: ParsedDirective): string {
    const baseTime = {
      'critical': 1,
      'high': 3,
      'medium': 5,
      'low': 7
    }[parsed.urgency];

    const complexityMultiplier = 1 + (parsed.complexity * 0.5);
    const adjustedDays = Math.ceil(baseTime * complexityMultiplier);

    return `${adjustedDays} days for initial deliverables`;
  }

  private generateSuccessCriteria(parsed: ParsedDirective): string[] {
    return [
      'Stakeholder alignment on findings',
      'Actionable strategic recommendations',
      'Clear next steps identified',
      ...parsed.success_metrics
    ];
  }

  private calculateEffort(parsed: ParsedDirective): 'XS' | 'S' | 'M' | 'L' | 'XL' {
    const effort = parsed.complexity + (parsed.urgency === 'critical' ? 0.3 : 0);
    
    if (effort < 0.2) return 'XS';
    if (effort < 0.4) return 'S';
    if (effort < 0.6) return 'M';
    if (effort < 0.8) return 'L';
    return 'XL';
  }
}