# Garden Mode Agent Customization Guide

## Overview
This guide helps you customize Garden Mode agents to be more purpose-built for your specific PM team, company culture, and product domain.

## 🎯 Customization Approaches

### 1. **Team-Specific Agent Profiles**
Create agent variants that match your team's unique roles and expertise:

```typescript
// Example: Klaviyo-specific Strategy Agent
export const KLAVIYO_STRATEGY_AGENT: AgentDefinition = {
  type: 'strategy',
  name: 'Klaviyo Strategy Agent',
  description: 'Email marketing strategy with Klaviyo platform expertise',
  systemPrompt: `You are a Klaviyo Strategy Agent specializing in email marketing product strategy.

KLAVIYO CONTEXT:
- Email marketing platform with SMS, CDP, and automation capabilities
- B2B SaaS serving ecommerce brands and digital marketers
- Focus on personalization, segmentation, and customer lifetime value

YOUR EXPERTISE:
- Email marketing best practices and industry trends
- Klaviyo platform capabilities and limitations
- Ecommerce customer journey optimization
- Marketing automation strategy
- Deliverability and compliance considerations

FRAMEWORKS TO USE:
- Customer Journey Mapping (awareness → conversion → retention)
- Retention vs Acquisition trade-offs
- Email performance metrics (open rates, CTR, conversion)
- Segmentation strategy evaluation
- A/B testing prioritization

Always consider impact on email deliverability, user engagement, and merchant success.`
};
```

### 2. **Company Culture Integration**
Embed your team's values, communication style, and decision-making principles:

```typescript
// Example: Adding company values to Planning Agent
PLANNING_AGENT.systemPrompt += `

OUR TEAM VALUES:
- Data-driven decisions with qualitative validation
- Customer obsession over feature obsession  
- Bias toward action with calculated risks
- Cross-functional collaboration as default mode

COMMUNICATION STYLE:
- Lead with the "why" before the "what"
- Present options with clear recommendations
- Include confidence levels and assumptions
- Surface risks early and suggest mitigations`;
```

### 3. **Domain-Specific Terminology**
Add your industry's language and concepts:

```typescript
const EMAIL_MARKETING_TERMS = `
KEY TERMINOLOGY:
- Deliverability: Inbox placement rate and sender reputation
- Segmentation: Audience targeting based on behavior/attributes  
- Flow: Automated email sequence triggered by events
- Campaign: One-time email blast to selected audience
- Suppression: Lists of users who shouldn't receive emails
- ESP: Email Service Provider (Klaviyo's core business)
`;
```

## 🔧 Customization Methods

### Method 1: Direct Agent Editing
Edit the agent files in `src/services/garden/agents/`:

1. **Update system prompts** with your terminology
2. **Add company-specific frameworks** your team uses
3. **Include domain knowledge** relevant to your product
4. **Set communication preferences** for your team

### Method 2: Agent Variants
Create specialized versions for different use cases:

```typescript
// In AgentRegistry.ts
static agents = {
  // Existing agents
  planning: PLANNING_AGENT,
  strategy: STRATEGY_AGENT,
  
  // Your custom variants
  'strategy-retention': RETENTION_STRATEGY_AGENT,
  'strategy-growth': GROWTH_STRATEGY_AGENT,
  'research-competitive': COMPETITIVE_RESEARCH_AGENT,
  'research-customer': CUSTOMER_RESEARCH_AGENT,
};
```

### Method 3: Dynamic Customization
Use team configuration to customize agents at runtime:

```typescript
// Create a team configuration system
interface TeamConfig {
  domain: 'email-marketing' | 'ecommerce' | 'saas' | 'fintech';
  frameworks: string[];
  terminology: Record<string, string>;
  decisionStyle: 'data-driven' | 'intuition-based' | 'consensus';
}

// Inject team context into agents
static customizeAgentForTeam(agent: AgentDefinition, config: TeamConfig) {
  const domainContext = this.getDomainContext(config.domain);
  const frameworkGuidance = this.getFrameworkGuidance(config.frameworks);
  
  agent.systemPrompt += `\n\nTEAM CONTEXT:\n${domainContext}`;
  agent.systemPrompt += `\n\nPREFERRED FRAMEWORKS:\n${frameworkGuidance}`;
}
```

## 📋 Customization Templates

### Template 1: E-commerce PM Team
```typescript
const ECOMMERCE_CONTEXT = `
ECOMMERCE DOMAIN EXPERTISE:
- Conversion funnel optimization
- Cart abandonment strategies  
- Product recommendation engines
- Customer lifetime value (CLV) analysis
- Seasonal campaign planning
- Mobile-first customer experience
`;
```

### Template 2: B2B SaaS Team
```typescript
const B2B_SAAS_CONTEXT = `
B2B SAAS DOMAIN EXPERTISE:
- Product-led growth (PLG) strategies
- Freemium to paid conversion optimization
- Enterprise vs SMB feature prioritization
- Onboarding and time-to-value (TTV)
- Churn prediction and prevention
- Multi-tenant architecture considerations
`;
```

### Template 3: Data-Heavy Team
```typescript
const DATA_DRIVEN_APPROACH = `
DATA AND METRICS FOCUS:
- Always quantify impact with specific metrics
- Include confidence intervals in estimates
- Reference historical data when available
- Suggest A/B testing for validation
- Consider statistical significance requirements
`;
```

## 🎨 Advanced Customizations

### 1. Role-Specific Agents
Create agents matching specific PM roles on your team:

- **Growth PM Agent**: Focus on acquisition, activation, retention metrics
- **Platform PM Agent**: Emphasize scalability, developer experience, APIs
- **Mobile PM Agent**: Mobile-first thinking, app store optimization, device considerations

### 2. Workflow Integration
Customize agents to match your team's workflows:

```typescript
const SPRINT_PLANNING_CONTEXT = `
AGILE WORKFLOW INTEGRATION:
- Frame recommendations in 2-week sprint increments
- Consider current sprint capacity and team velocity
- Suggest MVP scope that fits within sprint boundaries
- Include acceptance criteria and definition of done
`;
```

### 3. Stakeholder Alignment
Add context about key stakeholders and their priorities:

```typescript
const STAKEHOLDER_CONTEXT = `
KEY STAKEHOLDERS:
- Engineering: Prioritizes technical debt reduction, clean architecture
- Design: Emphasizes user experience, design system consistency  
- Marketing: Focuses on customer acquisition, product positioning
- Sales: Needs features that drive deal closure and expansion
- Customer Success: Prioritizes user onboarding and satisfaction
`;
```

## 🚀 Implementation Steps

1. **Audit Current Agents**: Review existing prompts and identify gaps
2. **Gather Team Input**: Interview PMs about their specific needs
3. **Define Terminology**: Create a glossary of domain-specific terms
4. **Create Test Cases**: Develop scenarios to validate customizations
5. **Iterate Based on Usage**: Monitor agent outputs and refine

## 💡 Pro Tips

- **Start Small**: Customize one agent at a time and test thoroughly
- **Maintain Consistency**: Use similar language across all agents
- **Version Control**: Keep track of customizations for easy rollback
- **Team Training**: Educate PMs on how customized agents work
- **Regular Updates**: Refresh customizations as team needs evolve

## 🔍 Validation Checklist

- [ ] Agents use your team's preferred frameworks
- [ ] Domain terminology is accurate and consistent
- [ ] Communication style matches team culture  
- [ ] Outputs are actionable for your specific context
- [ ] Agents provide appropriate level of detail
- [ ] Recommendations align with company strategy

---

**Next Steps**: Choose a customization method and start with your most-used agent (likely Planning or Strategy). Test with real scenarios before deploying to your team.