import { AgentDefinition, AgentType } from './types';
import { PLANNING_AGENT } from './agents/planning';
import { STRATEGY_AGENT } from './agents/strategy';
import { RESEARCH_AGENT } from './agents/research';
import { DESIGN_AGENT } from './agents/design';
import { SCOPING_AGENT } from './agents/scoping';
import { WRITING_AGENT } from './agents/writing';

/**
 * Central registry for all Garden agents
 * Makes it easy to add/remove/modify agents in one place
 */
export class AgentRegistry {
  private static agents: Record<AgentType, AgentDefinition> = {
    orchestrator: {
      type: 'orchestrator',
      name: 'Garden Orchestrator',
      description: 'Coordinates specialist agents',
      systemPrompt: '' // Set by orchestrator
    },
    planning: PLANNING_AGENT,
    strategy: STRATEGY_AGENT, 
    research: RESEARCH_AGENT,
    design: DESIGN_AGENT,
    scoping: SCOPING_AGENT,
    writing: WRITING_AGENT
  };

  /**
   * Get agent definition by type
   */
  static getAgent(type: AgentType): AgentDefinition {
    const agent = this.agents[type];
    if (!agent) {
      throw new Error(`Unknown agent type: ${type}`);
    }
    return agent;
  }

  /**
   * Get all available specialist agents (excludes orchestrator)
   */
  static getSpecialistAgents(): AgentDefinition[] {
    return Object.values(this.agents).filter(agent => 
      agent.type !== 'orchestrator' && agent.type !== 'writing'
    );
  }

  /**
   * Get analysis agents (excludes orchestrator and writing)
   */
  static getAnalysisAgents(): AgentDefinition[] {
    return Object.values(this.agents).filter(agent => 
      !['orchestrator', 'writing'].includes(agent.type)
    );
  }

  /**
   * Get agent system prompt
   */
  static getPrompt(type: AgentType): string {
    return this.getAgent(type).systemPrompt;
  }

  /**
   * Check if agent type exists
   */
  static hasAgent(type: string): type is AgentType {
    return type in this.agents;
  }

  /**
   * Get list of all agent types
   */
  static getAgentTypes(): AgentType[] {
    return Object.keys(this.agents) as AgentType[];
  }
}