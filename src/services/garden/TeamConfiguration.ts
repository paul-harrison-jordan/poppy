import { AgentDefinition, AgentType } from './types';
import { 
  PLANNING_AGENT,
  STRATEGY_AGENT, 
  RESEARCH_AGENT,
  DESIGN_AGENT,
  SCOPING_AGENT,
  WRITING_AGENT
} from './agents';

/**
 * Team Configuration System
 * Allows customization of agents for different PM teams and contexts
 */

export interface TeamConfig {
  name: string;
  domain: string;
  description: string;
  agents: Partial<Record<AgentType, AgentDefinition>>;
  terminology?: Record<string, string>;
  frameworks?: string[];
  decisionStyle?: 'data-driven' | 'intuition-based' | 'consensus';
  stakeholders?: Record<string, string>;
}

/**
 * Pre-built team configurations for common use cases
 */
export const TEAM_CONFIGURATIONS: Record<string, TeamConfig> = {
  // Default configuration
  'default': {
    name: 'Default PM Team',
    domain: 'General Product Management',
    description: 'Generic PM agents suitable for most product teams',
    agents: {
      planning: PLANNING_AGENT,
      strategy: STRATEGY_AGENT,
      research: RESEARCH_AGENT,
      design: DESIGN_AGENT,
      scoping: SCOPING_AGENT,
      writing: WRITING_AGENT
    }
  },

  // Email marketing / Klaviyo team
  'email-marketing': {
    name: 'Email Marketing Team',
    domain: 'Email Marketing Platform',
    description: 'Specialized for email marketing, ESP, and ecommerce teams',
    agents: {
      // Will be loaded from klaviyo-customized-agents.ts
      planning: enhanceAgentForDomain(PLANNING_AGENT, 'email-marketing'),
      strategy: enhanceAgentForDomain(STRATEGY_AGENT, 'email-marketing'),
      research: enhanceAgentForDomain(RESEARCH_AGENT, 'email-marketing'),
      design: enhanceAgentForDomain(DESIGN_AGENT, 'email-marketing'),
      scoping: SCOPING_AGENT,
      writing: WRITING_AGENT
    },
    terminology: {
      'Flow': 'Automated email sequence triggered by customer behavior',
      'Campaign': 'One-time email broadcast to selected audience',
      'Segment': 'Dynamic group of contacts based on criteria',
      'ESP': 'Email Service Provider',
      'CTR': 'Click-through rate',
      'Deliverability': 'Inbox placement rate and sender reputation'
    },
    frameworks: ['Email Marketing Funnel', 'Customer Journey Mapping', 'A/B Testing', 'Segmentation Strategy'],
    decisionStyle: 'data-driven'
  },

  // B2B SaaS team
  'b2b-saas': {
    name: 'B2B SaaS Team',
    domain: 'B2B Software as a Service',
    description: 'Optimized for B2B SaaS product management',
    agents: {
      planning: enhanceAgentForDomain(PLANNING_AGENT, 'b2b-saas'),
      strategy: enhanceAgentForDomain(STRATEGY_AGENT, 'b2b-saas'),
      research: enhanceAgentForDomain(RESEARCH_AGENT, 'b2b-saas'),
      design: enhanceAgentForDomain(DESIGN_AGENT, 'b2b-saas'),
      scoping: SCOPING_AGENT,
      writing: WRITING_AGENT
    },
    terminology: {
      'PLG': 'Product-Led Growth strategy',
      'TTV': 'Time to Value for new users',
      'Churn': 'Customer attrition rate',
      'MRR': 'Monthly Recurring Revenue',
      'CAC': 'Customer Acquisition Cost',
      'LTV': 'Customer Lifetime Value'
    },
    frameworks: ['AARRR (Pirate Metrics)', 'Product-Led Growth', 'Freemium Strategy', 'Enterprise Sales Cycle']
  },

  // Ecommerce team
  'ecommerce': {
    name: 'Ecommerce Team',
    domain: 'Ecommerce Platform',
    description: 'Specialized for ecommerce and retail product teams',
    agents: {
      planning: enhanceAgentForDomain(PLANNING_AGENT, 'ecommerce'),
      strategy: enhanceAgentForDomain(STRATEGY_AGENT, 'ecommerce'),
      research: enhanceAgentForDomain(RESEARCH_AGENT, 'ecommerce'),
      design: enhanceAgentForDomain(DESIGN_AGENT, 'ecommerce'),
      scoping: SCOPING_AGENT,
      writing: WRITING_AGENT
    },
    terminology: {
      'Conversion Rate': 'Percentage of visitors who complete a purchase',
      'Cart Abandonment': 'Users who add items but don\'t complete checkout',
      'GMV': 'Gross Merchandise Value',
      'AOV': 'Average Order Value',
      'ROAS': 'Return on Advertising Spend'
    },
    frameworks: ['Conversion Funnel', 'Customer Journey', 'Retention Cohorts', 'Seasonal Planning']
  },

  // Mobile app team
  'mobile-app': {
    name: 'Mobile App Team', 
    domain: 'Mobile Application',
    description: 'Focused on mobile app product management',
    agents: {
      planning: enhanceAgentForDomain(PLANNING_AGENT, 'mobile-app'),
      strategy: enhanceAgentForDomain(STRATEGY_AGENT, 'mobile-app'),
      research: enhanceAgentForDomain(RESEARCH_AGENT, 'mobile-app'),
      design: enhanceAgentForDomain(DESIGN_AGENT, 'mobile-app'),
      scoping: SCOPING_AGENT,
      writing: WRITING_AGENT
    },
    terminology: {
      'DAU': 'Daily Active Users',
      'Retention': 'User return rate over time periods',
      'Push Notification': 'Mobile alerts sent to users',
      'In-App Purchase': 'Monetization within mobile application',
      'App Store Optimization': 'Improving app discoverability'
    },
    frameworks: ['Mobile User Acquisition', 'App Store Optimization', 'Push Notification Strategy', 'Mobile UX Patterns']
  }
};

/**
 * Enhance an agent with domain-specific context
 */
function enhanceAgentForDomain(baseAgent: AgentDefinition, domain: string): AgentDefinition {
  const domainEnhancements = getDomainEnhancements(domain);
  
  return {
    ...baseAgent,
    name: `${baseAgent.name} (${domain})`,
    systemPrompt: `${baseAgent.systemPrompt}

${domainEnhancements.context}

DOMAIN-SPECIFIC CONSIDERATIONS:
${domainEnhancements.considerations.map(c => `- ${c}`).join('\n')}

KEY METRICS FOR THIS DOMAIN:
${domainEnhancements.metrics.map(m => `- ${m}`).join('\n')}

FRAMEWORKS TO PRIORITIZE:
${domainEnhancements.frameworks.map(f => `- ${f}`).join('\n')}`
  };
}

/**
 * Get domain-specific enhancements
 */
function getDomainEnhancements(domain: string) {
  const enhancements: Record<string, { context: string; considerations: string[]; terminology: Record<string, string> }> = {
    'email-marketing': {
      context: `EMAIL MARKETING DOMAIN: You specialize in email service providers, marketing automation, and customer communication platforms.`,
      considerations: [
        'Email deliverability and sender reputation impact',
        'Compliance with email regulations (CAN-SPAM, GDPR)',
        'Integration with ecommerce platforms and customer data',
        'Segmentation and personalization capabilities',
        'Cross-channel marketing orchestration'
      ],
      metrics: [
        'Email open rates and click-through rates',
        'List growth and segmentation effectiveness', 
        'Automation flow performance',
        'Customer lifetime value from email marketing',
        'Deliverability scores and spam rates'
      ],
      frameworks: [
        'Email Marketing Funnel (Send → Deliver → Open → Click → Convert)',
        'Customer Journey Email Mapping',
        'Segmentation Strategy Framework',
        'A/B Testing for Email Optimization'
      ]
    },
    'b2b-saas': {
      context: `B2B SAAS DOMAIN: You focus on business software, subscription models, and enterprise customer success.`,
      considerations: [
        'Product-led growth vs sales-led acquisition',
        'Enterprise security and compliance requirements',
        'API-first architecture and developer experience',
        'Multi-tenant scalability and performance',
        'Customer success and churn prevention'
      ],
      metrics: [
        'Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR)',
        'Customer Acquisition Cost (CAC) and Lifetime Value (LTV)',
        'Product adoption and feature usage rates',
        'Time to value and onboarding completion',
        'Net Revenue Retention and expansion rates'
      ],
      frameworks: [
        'AARRR (Acquisition, Activation, Retention, Referral, Revenue)',
        'Product-Led Growth Strategy',
        'Enterprise Sales Cycle Management',
        'Customer Health Scoring'
      ]
    },
    'ecommerce': {
      context: `ECOMMERCE DOMAIN: You understand online retail, conversion optimization, and shopping experiences.`,
      considerations: [
        'Conversion funnel optimization and cart abandonment',
        'Mobile commerce and cross-device experiences',
        'Payment processing and checkout optimization',
        'Inventory management and fulfillment integration',
        'Seasonal and promotional campaign planning'
      ],
      metrics: [
        'Conversion rate and average order value',
        'Cart abandonment rate and recovery',
        'Customer acquisition cost and return on ad spend',
        'Repeat purchase rate and customer lifetime value',
        'Mobile vs desktop performance metrics'
      ],
      frameworks: [
        'Ecommerce Conversion Funnel',
        'Customer Journey Mapping for Retail',
        'Seasonal Planning and Inventory Strategy',
        'Mobile Commerce Optimization'
      ]
    },
    'mobile-app': {
      context: `MOBILE APP DOMAIN: You specialize in mobile user experience, app store dynamics, and mobile-first product strategy.`,
      considerations: [
        'App store guidelines and review processes',
        'Mobile device capabilities and limitations',
        'Battery usage and performance optimization',
        'Offline functionality and data synchronization',
        'Platform-specific design patterns (iOS vs Android)'
      ],
      metrics: [
        'Daily and monthly active users (DAU/MAU)',
        'App store ratings and review sentiment',
        'User session length and screen engagement',
        'Push notification open rates and conversion',
        'In-app purchase conversion and retention'
      ],
      frameworks: [
        'Mobile User Acquisition and Retention',
        'App Store Optimization (ASO)',
        'Mobile UX Design Patterns',
        'Cross-Platform Development Strategy'
      ]
    }
  };

  return enhancements[domain] || {
    context: 'GENERAL DOMAIN: Standard product management approach.',
    considerations: ['User needs and business goals', 'Technical feasibility', 'Market competitiveness'],
    metrics: ['User engagement', 'Business impact', 'Technical performance'],
    frameworks: ['User-Centered Design', 'Agile Development', 'Data-Driven Decisions']
  };
}

/**
 * Team Configuration Manager
 */
export class TeamConfigurationManager {
  private static currentConfig: TeamConfig = TEAM_CONFIGURATIONS.default;

  /**
   * Set active team configuration
   */
  static setTeamConfig(configName: string): void {
    if (!TEAM_CONFIGURATIONS[configName]) {
      throw new Error(`Unknown team configuration: ${configName}`);
    }
    this.currentConfig = TEAM_CONFIGURATIONS[configName];
  }

  /**
   * Get current team configuration
   */
  static getCurrentConfig(): TeamConfig {
    return this.currentConfig;
  }

  /**
   * Get agent for current team configuration
   */
  static getTeamAgent(agentType: AgentType): AgentDefinition {
    const teamAgent = this.currentConfig.agents[agentType];
    if (!teamAgent) {
      throw new Error(`Agent type ${agentType} not configured for team ${this.currentConfig.name}`);
    }
    return teamAgent;
  }

  /**
   * List available team configurations
   */
  static getAvailableConfigs(): Array<{name: string, description: string}> {
    return Object.entries(TEAM_CONFIGURATIONS).map(([key, config]) => ({
      name: key,
      description: config.description
    }));
  }

  /**
   * Create custom team configuration
   */
  static createCustomConfig(config: TeamConfig): void {
    TEAM_CONFIGURATIONS[config.name.toLowerCase().replace(/\s+/g, '-')] = config;
  }
}

export default TeamConfigurationManager;