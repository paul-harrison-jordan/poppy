import { NextRequest, NextResponse } from 'next/server';
import { StrategicDirectiveParser } from '@/services/StrategicDirectiveParser';

export async function POST(request: NextRequest) {
  try {
    const { directive, urgency = 'medium' } = await request.json();

    if (!directive) {
      return NextResponse.json(
        { error: 'Directive is required' },
        { status: 400 }
      );
    }

    // Parse the strategic directive
    const parser = new StrategicDirectiveParser();
    const parsed = parser.parseDirective(directive, urgency);
    
    // Generate agent plan
    const agentPlan = await parser.generateAgentPlan(parsed);

    // Determine which agents to deploy based on parsed directive
    const agentTypes = selectAgentsForDirective(parsed);
    
    // Create a simplified context for agent execution
    const agentContext = {
      input: directive,
      urgency,
      domain: parsed.domain,
      intent: parsed.intent,
      keyEntities: parsed.keyEntities,
      constraints: parsed.constraints
    };

    // Execute relevant agents based on the directive
    const results = await executeAgentSquad(agentTypes, agentContext);

    // Create squad response
    const squad = {
      id: `squad-${Date.now()}`,
      name: agentPlan.recommendedSquad,
      agents: agentPlan.squadAgents,
      mission: `${parsed.intent} ${parsed.domain} challenge: "${directive}"`,
      status: 'Analysis in progress',
      progress: 15,
      deliverables: agentPlan.deliverables,
      needsInput: false,
      estimatedCompletion: calculateCompletion(urgency),
      results: results
    };

    return NextResponse.json({
      success: true,
      squad,
      interpretation: agentPlan.interpretation,
      timeline: agentPlan.timeline,
      parsed: parsed,
      agentResults: results
    });

  } catch (error) {
    console.error('Error deploying squad:', error);
    return NextResponse.json(
      { error: 'Failed to deploy squad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function selectAgentsForDirective(parsed: { domain: string }) {
  const agentMapping: Record<string, string[]> = {
    retention: ['ChurnAnalyzer', 'UserJourneyMapper'],
    growth: ['GrowthAnalyzer', 'AcquisitionStrategist'], 
    revenue: ['RevenueAnalyzer', 'PricingStrategist'],
    competitive: ['CompetitiveAnalyzer', 'MarketResearcher'],
    product: ['JobsExtractorAgent', 'ScopeAnalyzerAgent'],
    ux: ['UserResearcher', 'UsabilityAnalyzer']
  };

  return agentMapping[parsed.domain] || ['JobsExtractorAgent', 'ScopeAnalyzerAgent'];
}

async function executeAgentSquad(agentTypes: string[], context: { input: string }) {
  const results: Array<{
    agent: string;
    result: unknown;
    confidence: number;
    timestamp: string;
  }> = [];

  try {
    // Import and execute relevant agents
    if (agentTypes.includes('JobsExtractorAgent')) {
      const { JobsExtractorAgent } = await import('@/agents/jobsExtractor');
      const agent = new JobsExtractorAgent();
      const result = await agent.execute({ input: context.input });
      results.push({
        agent: 'JobsExtractorAgent',
        result: result.result,
        confidence: 0.85, // Default confidence for now
        timestamp: new Date().toISOString()
      });
    }

    if (agentTypes.includes('ScopeAnalyzerAgent')) {
      const { ScopeAnalyzerAgent } = await import('@/agents/scopeAnalyzer');
      const agent = new ScopeAnalyzerAgent();
      const jobsResult = results.find(r => r.agent === 'JobsExtractorAgent');
      const extractedJobs = (jobsResult?.result as { jobs?: unknown[] })?.jobs || [];
      
      const result = await agent.execute({ 
        input: context.input,
        extractedJobs
      });
      results.push({
        agent: 'ScopeAnalyzerAgent', 
        result: result.result,
        confidence: 0.82, // Default confidence
        timestamp: new Date().toISOString()
      });
    }

    if (agentTypes.includes('CompetitiveAnalyzer')) {
      const { CompetitiveLandscaperAgent } = await import('@/agents/competitiveLandscaper');
      const agent = new CompetitiveLandscaperAgent();
      const result = await agent.execute({ input: context.input });
      results.push({
        agent: 'CompetitiveLandscaperAgent',
        result: result.result,
        confidence: 0.80, // Default confidence
        timestamp: new Date().toISOString()
      });
    }

    if (agentTypes.includes('EngineeringEstimator')) {
      const { EngineeringEstimatorAgent } = await import('@/agents/engineeringEstimator');
      const agent = new EngineeringEstimatorAgent();
      const result = await agent.execute({ 
        input: context.input,
        scope: results.find(r => r.agent === 'ScopeAnalyzerAgent')?.result || {}
      });
      results.push({
        agent: 'EngineeringEstimatorAgent',
        result: result.result, 
        confidence: 0.80, // Default confidence
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error executing agent squad:', error);
    results.push({
      agent: 'ErrorHandler',
      result: { error: 'Failed to execute some agents', details: error instanceof Error ? error.message : 'Unknown error' },
      confidence: 0,
      timestamp: new Date().toISOString()
    });
  }

  return results;
}

function calculateCompletion(urgency: string): string {
  const baseHours = {
    'critical': 2,
    'high': 8,
    'medium': 24,
    'low': 48
  }[urgency] || 24;

  const completionDate = new Date();
  completionDate.setHours(completionDate.getHours() + baseHours);
  
  return completionDate.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}