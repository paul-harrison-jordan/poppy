# Poppy LLM Integration Guide: Complete Implementation Details

## Table of Contents
1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [User Flow 1: Creating a PRD](#user-flow-1-creating-a-prd)
4. [User Flow 2: Decomposing PRD into Steps](#user-flow-2-decomposing-prd-into-steps)
5. [User Flow 3: PM Profile Creation & Updates](#user-flow-3-pm-profile-creation--updates)
6. [Complete Prompt Templates](#complete-prompt-templates)
7. [Data Structures & Schemas](#data-structures--schemas)
8. [Implementation Examples](#implementation-examples)
9. [Best Practices](#best-practices)

## Overview

Poppy is a RAG-driven platform that leverages Large Language Models (LLMs) to help Product Managers draft PRDs, generate mock designs, decompose work for engineering, and act as their operating system from idea to shipped feature.

### Key Differentiators
- **Personalization at Scale**: Every LLM interaction is enriched with PM profile data
- **Progressive Context Building**: Multi-phase flows that build rich context before generation
- **Domain-Specific Vocabulary**: 100+ built-in Klaviyo terms + custom team vocabulary
- **Sophisticated Model Selection**: Different models for different cognitive tasks

## Core Architecture

### Models in Use

| Model | Purpose | Cost/Performance | Example Usage |
|-------|---------|-----------------|---------------|
| **o3** | Complex reasoning & generation | Highest cost, best quality | PRD generation, PRD decomposition |
| **gpt-4o** | Balanced tasks | Medium cost/performance | Brainstorming, chat, roadmap |
| **gpt-4o-mini** | Fast, focused tasks | Low cost, high speed | Questions, vocabulary, analysis |
| **o4-mini** | Comprehensive analysis | Medium cost | PM profile analysis |
| **text-embedding-3-small** | Embeddings | Optimized for retrieval | All vector operations |

### Integration Architecture

```
User Input → Context Enrichment → LLM Processing → Response Streaming
     ↓              ↓                    ↓                ↓
Local Storage  Supabase DB      OpenAI Direct      Server-Sent Events
                Vector Store     (No LangChain)
```

## User Flow 1: Creating a PRD

This is Poppy's core value proposition - a sophisticated multi-phase process that generates highly personalized PRDs.

### Phase 1: Initial Context & Embedding

**Entry Point**: User provides product idea in draft mode

```typescript
// User input example:
{
  "title": "AI-Powered Customer Segmentation",
  "query": "I want to build a feature that uses AI to automatically segment our customers based on their behavior patterns and predict which segment they'll move to next"
}
```

**Backend Processing**:
```typescript
// Embed the query using OpenAI
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: query
});

// Vector search against knowledge base
const matchedContext = await vectorStore.search(embedding);
```

### Phase 2: Vocabulary Definition

**Purpose**: Ensure shared understanding of domain-specific terms

**API Call**: `POST /api/generate-vocabulary`

**Actual Prompt Template**:
```typescript
{
  role: 'system',
  content: `You are a system that helps a product manager write a PRD. You will be given a title and query for a new PRD, as well as relevant context from previous PRDs or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of terms over time.

You must respond with a JSON object containing a terms_to_define array of terms that need definitions. you must only return 5 terms. you must only return terms that are relevant to the user's query. these terms should be the most important terms that the user is likely to use in the PRD. For example:
{
  "terms_to_define": ["Service Level Agreement (SLA)", "Round-robin Assignment", "Office Hours"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
${Object.keys(terms).join(', ')}

PM Profile Context:
- Product Philosophy: ${pmProfile.product_philosophy || 'Not defined'}
- Domain Expertise: ${pmProfile.domain_expertise?.join(', ') || 'Not defined'}
- Recurring Themes: ${pmProfile.recurring_themes?.join(', ') || 'Not defined'}
- Decision Frameworks: ${Object.keys(pmProfile.decision_frameworks || {}).join(', ') || 'Not defined'}
- Trade-off Preferences: ${Object.keys(pmProfile.trade_off_preferences || {}).join(', ') || 'Not defined'}

Use this PM profile to generate questions that align with their expertise, thinking style, and decision-making approach. Tailor questions to their domain expertise and recurring themes.`
},
{
  role: 'user',
  content: `Title: ${title}
Query: ${query}
Context: ${matchedContext}`
}
```

**Example Response**:
```json
{
  "terms_to_define": [
    "Behavioral Segmentation",
    "Predictive Analytics",
    "Customer Lifetime Value (CLV)",
    "Churn Prediction",
    "Segment Migration"
  ]
}
```

### Phase 3: Targeted Question Generation

**Purpose**: Gather missing requirements through intelligent questioning

**API Call**: `POST /api/generate-questions`

**Complete Prompt with Real Data**:
```typescript
{
  role: 'system',
  content: `You are a system that helps a product manager write a PRD. You will be given a title and query for a new PRD, as well as relevant context from previous PRDs or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of terms over time.

You must respond with a JSON object containing two arrays:
1. questions: An array of question objects, each with id, text, and reasoning fields. you must return 5 questions. you must only return questions that are relevant to the user's query. these questions should be the most important questions that you need answers to in order to write a good PRD that solves the stated customer probelm in the job to be done statement. It's important that these questions steer the user towards the best possible PRD.
2. internalTerms: An array of terms that need clarification

Example JSON response:
{
  "questions": [
    {
      "id": "1",
      "text": "What is the primary problem this feature solves?",
      "reasoning": "Understanding the core problem helps ensure we're building the right solution."
    },
    {
      "id": "2",
      "text": "Who are the primary users of this feature?",
      "reasoning": "Identifying target users helps tailor the solution to their needs."
    }
  ],
  "internalTerms": ["Profile", "Active profile", "Suppressed profile"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
Profile, Active profile, Suppressed profile, List, Segment, Flow, Campaign, Metric, Event, Catalog, Form, Sign-up unit...

PM Profile Context:
- Product Philosophy: Build products that grow with their users, focusing on incremental value delivery
- Domain Expertise: B2B SaaS, Marketing Automation, Data Analytics
- Recurring Themes: data-driven decisions, user empathy, scalability considerations
- Decision Frameworks: Jobs-to-be-Done, North Star metrics
- Trade-off Preferences: speedVsQuality: balanced, riskTolerance: medium`
},
{
  role: 'user',
  content: `Title: AI-Powered Customer Segmentation
Query: I want to build a feature that uses AI to automatically segment our customers based on their behavior patterns and predict which segment they'll move to next
Context: Previous PRDs show focus on data-driven features and predictive analytics
teamTerms: {"Customer Health Score": "Composite metric indicating customer engagement", "Segment Rules": "Conditions that define segment membership"}
storedContext: PM has previously worked on recommendation engines and personalization features
klaviyoTerms: ${JSON.stringify(terms)}`
}
```

**Actual Response Example**:
```json
{
  "questions": [
    {
      "id": "1",
      "text": "What specific customer behaviors should the AI analyze to create meaningful segments (e.g., purchase frequency, email engagement, product usage)?",
      "reasoning": "Defining the input signals helps ensure the AI creates actionable segments aligned with business goals."
    },
    {
      "id": "2",
      "text": "How should the system handle segment transitions - should it notify users, trigger automated campaigns, or update customer profiles?",
      "reasoning": "Understanding the desired actions helps design the right integration points with existing workflows."
    },
    {
      "id": "3",
      "text": "What level of explainability do users need - should they see why a customer is in a segment and the predicted migration path?",
      "reasoning": "Transparency requirements affect both the AI model choice and the UI design."
    },
    {
      "id": "4",
      "text": "How frequently should the AI re-evaluate segments, and what's the acceptable latency for predictions?",
      "reasoning": "Performance requirements determine the technical architecture and resource needs."
    },
    {
      "id": "5",
      "text": "What safeguards should prevent incorrect segmentation, and how can users override AI decisions?",
      "reasoning": "Human oversight mechanisms ensure the system remains trustworthy and correctable."
    }
  ],
  "internalTerms": ["Predictive model", "Segment migration", "Behavioral signals"]
}
```

### Phase 4: PRD Content Generation

**The Magic Moment**: This is where all context comes together

**API Call**: `POST /api/generate-content`

**The Complete PRD Generation Prompt**:
```typescript
const messages = [{
  role: 'user',
  content: `I have included a list of key terms that you may need to use to generate your response. Use this as background information to help you understand the rest of the prompt. Profile, Active profile, Suppressed profile, List, Segment, Flow, Campaign, Metric, Event, Catalog, Form, Sign-up unit, Preference page, Email capture form, CDP, Data warehouse, Webhook, API, SDK, Server-side, Client-side, OAuth, Private API key, Public API key, Site ID, Company ID, Template, Block, Section, Dynamic content, Personalization, A/B test, Smart sending, Quiet hours, Rate limiting, Double opt-in, Single opt-in, Implied consent, Explicit consent, GDPR, CCPA, CAN-SPAM, CASL, Deliverability, Bounce rate, Open rate, Click rate, Conversion rate, Revenue attribution, CLV, Cohort analysis, RFM analysis, Churn prediction, Winback, Abandoned cart, Browse abandonment, Post-purchase, Welcome series, Sunset flow, VIP, Re-engagement, Cross-sell, Upsell, Product recommendation, Back in stock, Price drop, Review request, Birthday, Anniversary, Replenishment, Lead capture, Lead nurture, Lead scoring, Progressive profiling, Custom properties, Predictive analytics, Benchmarks, Smart suggestions, AI-powered, Machine learning, Automation, Triggered, Batch, Transactional, Marketing, Lifecycle, Behavioral, Demographic, Firmographic, Psychographic, Geolocation, Weather-based, Real-time, Near real-time, Historical, Predictive, Prescriptive, Omnichannel, Multichannel, Cross-channel

I've also included a list of key terms that my team has defined for our product. Use this as background information to help you understand the rest of the prompt. Customer Health Score, Segment Rules

PM Profile Context:
- Product Philosophy: Build products that grow with their users, focusing on incremental value delivery
- Domain Expertise: B2B SaaS, Marketing Automation, Data Analytics
- Recurring Themes: data-driven decisions, user empathy, scalability considerations
- Decision Frameworks: Jobs-to-be-Done, North Star metrics
- Trade-off Preferences: speedVsQuality: balanced, riskTolerance: medium

Use this PM profile to generate questions that align with their expertise, thinking style, and decision-making approach. Tailor questions to their domain expertise and recurring themes.

I've included instructions for how to think and write PRDs like a product manager with" Build products that grow with their users. Start with solving the immediate pain point but architect for extensibility. Every feature should teach us something about user needs. Balance speed of delivery with scalability - we can refactor later but can't recover from poor user trust. "I've also included background on how to think like my product team" Our north star is increasing customer lifetime value through intelligent automation. We believe in progressive disclosure of complexity - simple for beginners, powerful for experts. Data should drive decisions but not replace product intuition. "I've included an example document to demonstrate my personal philosophy on how we should approach building a product to cross sell to existing users" Focus on natural extension points where users are already achieving success. The best cross-sell doesn't feel like selling - it feels like unlocking the next level of capability they naturally need. "I've included a doc that outlines the strategic goals of the my product team for the rest of the year" Q4 2024: Launch predictive analytics suite, Improve platform performance by 30%, Expand integration ecosystem I've included example text from work that my team has already done that I want for you to use as additional context for relevant features and terms" Our recommendation engine uses collaborative filtering to suggest products. Segment builder allows drag-and-drop rule creation with real-time preview. "I've asked you to write a PRD for the following question" I want to build a feature that uses AI to automatically segment our customers based on their behavior patterns and predict which segment they'll move to next "I've also included a list of questions and answers about the PRD to provide additional clarity around how we should approach the PRD." Q: What specific customer behaviors should the AI analyze to create meaningful segments?
A: Purchase frequency, email engagement rates, product category preferences, average order value trends, and support ticket patterns

Q: How should the system handle segment transitions - should it notify users, trigger automated campaigns, or update customer profiles?
A: All three, but with user controls. Default to updating profiles silently, optional notifications for major transitions, and ability to trigger campaigns based on migrations

Q: What level of explainability do users need?
A: High transparency - show top 3 factors for current segment, confidence score, and predicted next segment with probability

Q: How frequently should the AI re-evaluate segments?
A: Daily batch processing with option for real-time triggers on key events (large purchase, support escalation)

Q: What safeguards should prevent incorrect segmentation?
A: Minimum data thresholds, human review queue for edge cases, one-click override with reason tracking "When I ask you to write a doc, I want you to evaluate the Job to be Done statement I provide from each perspective (Product Manager, My product team, and Building a product that grows with its users) before beginning to write the PRD. Once done with that step, I want you to write the document with a focus on narrow scope, highly detailed breakdowns of which feature will support which part of the JTBD, and an open questions section that interrogates the JTBD from each of your perspectives (my product team, Product Manager, my philosophy) our edits should be returned in markdown format`
}]

// Then call OpenAI with model 'o3' for maximum quality
```

**Example PRD Output Structure**:
```markdown
# AI-Powered Customer Segmentation PRD

## Executive Summary
This PRD outlines an AI-driven customer segmentation feature that automatically categorizes customers based on behavioral patterns and predicts future segment transitions, enabling proactive engagement strategies.

## Job to be Done Analysis

### Product Manager Perspective
**JTBD**: Help marketers identify and act on customer behavior patterns before they impact business outcomes

**Supporting Features**:
- Real-time behavior tracking across all customer touchpoints
- ML model that identifies segment membership based on configurable behaviors
- Predictive engine for segment transition probability

### Product Team Perspective  
**JTBD**: Increase customer lifetime value through intelligent automation that scales

**Supporting Features**:
- Automated segment assignment reducing manual work by 80%
- Integration with existing flows for transition-based campaigns
- Performance dashboard showing CLV impact by segment

### Growing Product Perspective
**JTBD**: Start with basic segmentation, evolve to predictive customer journey orchestration

**Supporting Features**:
- Phase 1: Rule-based segments with AI suggestions
- Phase 2: Fully automated AI segmentation
- Phase 3: Predictive journey mapping

## Problem Statement
Marketers currently spend 15+ hours weekly manually analyzing customer data to create segments. They miss 67% of transition opportunities due to delayed identification. This results in $2.3M annual revenue loss from poor timing of engagement campaigns.

## Solution Overview

### Core Capabilities
1. **Behavioral Signal Processing**
   - Ingests: purchases, email engagement, site activity, support interactions
   - Updates segments within 1 hour of significant events
   - Maintains 90-day rolling behavior window

2. **AI Segmentation Engine**
   - Unsupervised clustering for natural segment discovery
   - Supervised learning for business-defined segments
   - Explainable AI showing top 3 factors per assignment

3. **Transition Prediction**
   - 30-day lookahead for segment changes
   - Confidence scoring (High >80%, Medium 50-80%, Low <50%)
   - Trigger alerts for high-value transition risks

### User Experience

**Segment Dashboard**
- Visual segment distribution with period-over-period trends
- Drill-down to individual customer segment history
- One-click campaign creation from segment

**Configuration Interface**
- Behavior weight adjustment sliders
- Minimum data thresholds
- Override rules manager

**Integration Points**
- Auto-trigger flows on transitions
- Update customer properties in real-time
- Export predictions to data warehouse

## Success Metrics

### Primary KPIs
- Segment transition prediction accuracy: >75%
- Time saved on manual segmentation: >12 hours/week
- Revenue from transition campaigns: +15% QoQ

### Secondary Metrics
- Segment stability (% remaining 30 days): >60%
- User adoption rate: 80% of eligible accounts
- API latency for updates: <100ms p99

## Technical Requirements

### Performance
- Process 1M customer updates/hour
- Segment assignment latency <1 second
- Model retraining daily, hot-swappable

### Data Requirements
- Minimum 90 days history for AI segments
- 1000+ customers for reliable predictions
- GDPR-compliant data retention

### Security & Compliance
- Audit trail for all overrides
- PII handling in compliance with regulations
- Role-based access to sensitive segments

## Implementation Phases

### Phase 1: Foundation (6 weeks)
- Basic behavioral tracking infrastructure
- Manual segment creation with AI assists
- Simple transition notifications

### Phase 2: Automation (8 weeks)
- Full AI segmentation engine
- Predictive transitions with confidence scores
- Campaign trigger integration

### Phase 3: Intelligence (6 weeks)
- Advanced explainability features
- Multi-step journey predictions
- Self-optimizing segment definitions

## Open Questions

### From Product Team Perspective
1. How do we handle segments that naturally have high churn (e.g., "New Customer" → "Active")?
2. Should AI segments replace or augment user-defined segments?
3. What's our stance on showing customers their predicted segment transitions?

### From PM Philosophy
1. How do we ensure this doesn't become a "black box" that users don't trust?
2. Where's the line between automation and user control?
3. How do we validate that AI segments are more effective than manual ones?

### From Growing Product Perspective
1. What hooks do we need for future journey orchestration features?
2. How do we design APIs that third-party tools can leverage?
3. What data should we collect now for features we'll build in 2 years?

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI bias in segmentation | High | Regular bias audits, diverse training data |
| User distrust of automation | Medium | High explainability, easy overrides |
| Performance at scale | High | Distributed processing, caching layer |

## Dependencies
- Data Pipeline Team: Streaming behavior events
- ML Platform Team: Model serving infrastructure  
- Marketing Team: Segment strategy alignment

## Timeline & Milestones
- Week 1-2: Technical design review
- Week 3-6: Phase 1 development
- Week 7: Internal alpha testing
- Week 8-13: Phase 2 development
- Week 14-15: Beta customer rollout
- Week 16-20: Phase 3 & GA launch
```

## User Flow 2: Decomposing PRD into Steps

### Overview
Takes a complete PRD and intelligently breaks it down into phased releases for engineering implementation.

### API Details
**Endpoint**: `POST /api/decompose-prd`

### The Complete Decomposition Prompt

```typescript
const decompositionPrompt = `# PRD Decomposition Prompt for Phased Releases

You are a product strategist specializing in breaking down Product Requirement Documents (PRDs) into sequential, narrow releases that enable faster development and early learning. Your goal is to transform a comprehensive PRD into a phased release plan that delivers value incrementally while reducing risk.

## Input
Here is a Product Requirement Document  ${content}

## Your Task
Analyze the PRD and create a phased release plan that:
1. Breaks down the full scope into 3-7 sequential phases
2. Each phase should be independently valuable and testable
3. Earlier phases should de-risk and inform later phases
4. Focus on product maturity milestones, not just technical implementation

## Analysis Framework

### Step 1: Core Capability Extraction
First, identify:
- What is the absolute minimum capability that proves the concept?
- What's the riskiest assumption that needs validation?
- What's the simplest version that delivers user value?

### Step 2: Decomposition Principles
Apply these principles when breaking down the PRD:

1. **Crawl → Walk → Run**: Start with basic functionality, add complexity gradually
2. **Visibility Before Automation**: Build observability before automated workflows
3. **Manual Before Magical**: Implement manual processes before automating
4. **Learn Before Scale**: Prioritize learning and feedback loops early
5. **Narrow Before Wide**: Focus on one use case before generalizing

### Step 3: Phase Structure
For each phase, provide:

**Phase [N]: [Descriptive Name]**
- **Goal**: What specific outcome this phase achieves
- **Scope**: 2-3 bullet points of what's included
- **Success Criteria**: How you'll know this phase is working
- **Learning Objectives**: What you'll learn to inform the next phase
- **Dependencies**: What must exist before starting this phase
- **Estimated Effort**: T-shirt size (S/M/L)

### Step 4: Risk-Based Sequencing
Order phases to:
- Validate riskiest assumptions first
- Build foundational capabilities before advanced features
- Enable continuous value delivery
- Create natural breaking points for pivot decisions

### Step 5: Example Patterns

**For a New Integration:**
- Phase 1: Read-only data sync
- Phase 2: Bi-directional sync with manual triggers
- Phase 3: Automated workflows with error handling
- Phase 4: Advanced features and optimizations

**For a New User Feature:**
- Phase 1: Core functionality, manual configuration
- Phase 2: Self-service setup, basic customization
- Phase 3: Advanced options, automation
- Phase 4: AI/ML enhancements, optimization

**For a Platform Capability:**
- Phase 1: API with single use case
- Phase 2: Generalized API with SDK
- Phase 3: UI for configuration
- Phase 4: Multi-tenant, scalable solution

## Output Requirements

For each phase, explain:
1. Why this phase boundary makes sense
2. What specific value it delivers independently
3. How it reduces risk or validates assumptions
4. What feedback loops it enables

Remember:
- Each phase should be shippable and provide value
- Phases should build on each other logically
- Earlier phases inform and de-risk later ones
- Focus on learning velocity, not just feature velocity

## IMPORTANT: Response Format
Respond with ONLY a valid JSON array of phase objects. Each phase object should have this structure:
{
  "name": "Phase name",
  "description": "Detailed description of what this phase accomplishes",
  "customer_value": "Justification and explination of customer value achieved by releasing this phase"
  "priority": 1
}

Do not include any markdown formatting, explanations, or text outside the JSON array. Return only the JSON array.`
```

### Example Decomposition Output

For the AI-Powered Customer Segmentation PRD above, the decomposition would return:

```json
[
  {
    "name": "Foundation - Manual Segments with AI Insights",
    "description": "Build core behavioral tracking infrastructure and allow users to create manual segments while AI provides insights about natural groupings in their customer base. Users can see AI-suggested segments but maintain full control over segment definitions. Includes basic reporting on segment performance.",
    "customer_value": "Marketers immediately save 5+ hours weekly by seeing AI-suggested segments alongside their manual analysis. They gain confidence in the AI's recommendations by comparing them to their own intuition, building trust for future automation. Early access to behavioral insights improves campaign targeting by 20%.",
    "priority": 1
  },
  {
    "name": "Automation - AI-Driven Segmentation",
    "description": "Enable fully automated segment creation and assignment based on AI analysis. Implement real-time segment updates as customer behaviors change. Add explainability features showing why customers are in specific segments. Include manual override capabilities and audit trails.",
    "customer_value": "Reduces manual segmentation work by 80%, freeing marketers to focus on strategy over analysis. Real-time updates mean campaigns reach customers at the perfect moment, increasing conversion rates by 35%. Explainability builds trust and helps marketers understand their customer base more deeply.",
    "priority": 2
  },
  {
    "name": "Prediction - Segment Transition Intelligence",
    "description": "Implement predictive engine that forecasts segment transitions 30 days in advance. Add confidence scoring and automated alerts for high-value transitions. Enable campaign triggers based on predicted transitions. Include feedback loops to improve prediction accuracy.",
    "customer_value": "Proactive engagement based on predicted transitions prevents 40% of potential churn cases and increases customer lifetime value by 25%. Marketers can plan campaigns weeks in advance with confidence. Automated triggers ensure no opportunity is missed due to human oversight.",
    "priority": 3
  },
  {
    "name": "Intelligence - Journey Orchestration",
    "description": "Expand from single transitions to multi-step journey predictions. Add self-optimizing segment definitions based on business outcomes. Implement advanced ML features like lookalike modeling and anomaly detection. Enable cross-channel orchestration based on predicted paths.",
    "customer_value": "Transform from reactive to truly predictive marketing with full customer journey visibility. Self-optimizing segments continuously improve performance without manual intervention. Advanced features like anomaly detection catch opportunities that rule-based systems miss, driving additional 15% revenue growth.",
    "priority": 4
  }
]
```

## User Flow 3: PM Profile Creation & Updates

### Overview
Builds a persistent understanding of each PM's style, preferences, and expertise to personalize all LLM interactions.

### Data Collection Pipeline

```typescript
// 1. Session Recording (every interaction)
const session = await supabase
  .from('user_knowledge_sessions')
  .insert({
    user_email: session.user.email,
    session_type: 'questions', // or 'vocabulary', 'brainstorm', 'prd_generation'
    context_data: {
      title: "AI-Powered Customer Segmentation",
      query: "I want to build a feature that uses AI...",
      timestamp: new Date().toISOString()
    },
    completion_status: 'in_progress'
  });

// 2. Vocabulary Definition Storage
const vocabDef = await supabase
  .from('vocabulary_definitions')
  .insert({
    session_id: session.id,
    user_email: session.user.email,
    term: "Behavioral Segmentation",
    user_definition: "Grouping customers based on their actions and engagement patterns rather than demographics",
    domain_tags: ["analytics", "marketing"],
    usage_context: "AI-powered segmentation PRD"
  });

// 3. Question Response Recording with Insight Extraction
const questionResponse = await supabase
  .from('question_responses')
  .insert({
    session_id: session.id,
    user_email: session.user.email,
    question_text: "What specific customer behaviors should the AI analyze?",
    question_reasoning: "Defining the input signals helps ensure the AI creates actionable segments",
    user_answer: "Purchase frequency, email engagement rates, product category preferences, average order value trends",
    domain_category: "analytics",
    extracted_insights: await extractInsights(answer) // AI analysis
  });
```

### PM Insight Extraction Process

**Step 1: Real-time Insight Extraction from Answers**

```typescript
// Prompt for extracting insights from a question response
const insightExtractionPrompt = {
  role: 'system',
  content: `You are an expert at analyzing product manager decision-making patterns and preferences. 

Analyze the PM's response to extract:
1. Decision-making frameworks they use
2. Trade-off preferences (speed vs quality, user research vs speed, technical debt vs features, etc.)
3. Mental models and approaches to product thinking
4. Values and priorities they demonstrate
5. Recurring themes in their reasoning

Return a JSON object with these keys:
- "frameworks": Array of mental models/frameworks used
- "tradeoff_preferences": Object mapping tradeoff types to their preferred approach
- "values": Array of core values demonstrated  
- "themes": Array of recurring themes
- "reasoning_style": Description of their problem-solving approach

Focus on extracting actionable insights that would help generate better PRDs aligned with their thinking.`
};

// Example extraction from actual answer
const userAnswer = "Purchase frequency, email engagement rates, product category preferences, average order value trends, and support ticket patterns";

// AI extracts:
{
  "frameworks": ["Data-driven decision making", "Holistic customer view"],
  "tradeoff_preferences": {
    "comprehensiveness_vs_simplicity": "comprehensive",
    "leading_vs_lagging_indicators": "balanced"
  },
  "values": ["thoroughness", "customer-centricity", "measurability"],
  "themes": ["behavioral analytics", "multi-dimensional analysis"],
  "reasoning_style": "Systematic and comprehensive, considering both transactional and engagement metrics"
}
```

**Step 2: Profile Generation/Update**

```typescript
// Aggregate all session data for profile generation
const allSessionData = await supabase
  .from('question_responses')
  .select('*')
  .eq('user_email', userEmail);

const vocabularyData = await supabase
  .from('vocabulary_definitions')
  .select('*')
  .eq('user_email', userEmail);

// Generate comprehensive PM profile using o4-mini model
const profileGenerationPrompt = {
  role: 'system',
  content: `You are an expert at understanding product manager thinking patterns and preferences. Your goal is to take in information, and generate durable and valuable insights about how the PM thinks about building products and making decisions. This will be used to generate future PRDs that align with their thinking style and preferences.

Analyze this PM's complete question-answer history and vocabulary to create a comprehensive preference profile.

Generate:
1. PRODUCT_PHILOSOPHY: A 2-3 sentence summary of their overall approach to product management
2. DECISION_FRAMEWORKS: They will always use Jobs-to-be-done framework to make decisions. But how do they use it, how are they honing in and prioritizing the jobs to be done?  
3. TRADE_OFF_PREFERENCES: How they typically navigate common PM trade-offs (speed vs quality, research vs intuition, technical debt vs features, etc.). Specific examples are helpful.
4. RECURRING_THEMES: Common patterns across their answers (e.g., "data-driven decisions", "user empathy", "technical feasibility focus"). Help the PM build a more complete picture of their thinking style.

This profile will be used to generate future PRDs that align with their thinking style and preferences.

Return JSON with keys: product_philosophy, decision_frameworks, trade_off_preferences, recurring_themes`
};

// Example generated profile:
{
  "product_philosophy": "Build products that grow with their users, focusing on incremental value delivery. Start with solving the immediate pain point but architect for extensibility. Every feature should teach us something about user needs.",
  "decision_frameworks": {
    "jobs_to_be_done_approach": "Focuses on outcome-based jobs rather than functional tasks. Prioritizes jobs that have high frequency and high importance scores. Always considers the emotional and social dimensions alongside functional.",
    "prioritization_method": "Uses ICE scoring (Impact, Confidence, Effort) with heavy weight on Impact as measured by user outcome metrics"
  },
  "trade_off_preferences": {
    "speedVsQuality": "balanced - 'We can refactor later but can't recover from poor user trust'",
    "researchVsIntuition": "research-backed intuition - Uses data to validate but doesn't paralyze decision-making",
    "technicalDebtVsFeatures": "conscious debt - Takes on debt strategically for market opportunities",
    "buildVsBuy": "build for core competencies, buy for commodities"
  },
  "recurring_themes": [
    "data-driven decisions",
    "user empathy", 
    "scalability considerations",
    "incremental delivery",
    "learning loops",
    "cross-functional collaboration"
  ]
}
```

**Step 3: Domain Expertise Extraction**

```typescript
// Extract domain expertise from vocabulary and answers
const domainExtractionPrompt = {
  role: 'system',
  content: `Based on the vocabulary terms defined and questions answered, identify the PM's domain expertise areas.
  
  Common domains include:
  - B2B SaaS
  - B2C Mobile
  - E-commerce
  - Marketplace
  - Data/Analytics Products
  - Developer Tools
  - Marketing Technology
  - FinTech
  - HealthTech
  - EdTech
  
  Return array of relevant domains based on evidence in their responses.`
};

// Results in:
["B2B SaaS", "Marketing Technology", "Data/Analytics Products"]
```

### Profile Storage and Usage

**Database Schema**:
```typescript
interface PMPreferenceProfile {
  id: number;
  user_email: string;
  vocabulary_glossary: Record<string, string>; // All terms they've defined
  decision_frameworks: {
    jobs_to_be_done_approach: string;
    prioritization_method: string;
    [key: string]: any;
  };
  trade_off_preferences: {
    speedVsQuality: 'speed' | 'quality' | 'balanced';
    researchVsIntuition: 'research' | 'intuition' | 'balanced';
    riskTolerance: 'low' | 'medium' | 'high';
    [key: string]: string;
  };
  product_philosophy: string;
  recurring_themes: string[];
  domain_expertise: string[];
  personal_context: {
    examples_of_how_you_think: string;
    how_you_think_about_product: string;
    pillar_goals_key_terms_background: string;
    team_strategy: string;
  };
  total_sessions: number;
  total_vocabulary_terms: number;
  total_questions_answered: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}
```

**Profile Integration in Every LLM Call**:
```typescript
// Profile is fetched and injected into every prompt
const pmProfile = await getProfile(userEmail);

const enrichedPrompt = `
${basePrompt}

PM Profile Context:
- Product Philosophy: ${pmProfile.product_philosophy}
- Domain Expertise: ${pmProfile.domain_expertise.join(', ')}
- Recurring Themes: ${pmProfile.recurring_themes.join(', ')}
- Decision Frameworks: ${JSON.stringify(pmProfile.decision_frameworks)}
- Trade-off Preferences: ${JSON.stringify(pmProfile.trade_off_preferences)}

Use this PM profile to generate [questions/content/suggestions] that align with their expertise, thinking style, and decision-making approach.
`;
```

## Complete Prompt Templates

### 1. PRD Generation (Most Complex)

The full PRD generation prompt incorporates:
- 100 Klaviyo-specific terms dictionary
- Team-defined custom vocabulary
- PM profile (philosophy, frameworks, preferences)
- Session context (questions & answers)
- Historical examples and patterns
- Multi-perspective evaluation framework

Total prompt size: ~3,000-4,000 tokens

### 2. Brainstorming Assistant

```typescript
const brainstormPrompt = `You are a tool being used by a product manager to brainstorm. You may get messages that are about an idea, a problem they're trying to solve, or a feature they're trying to build. Your mission is to expertly coax great ideas out of the user with short, pointed questions and comments that help them think through their idea. Over time, the user should be able to summarize the conversation and use it to draft a PRD.

PMs are trusting you to help them think through their ideas, and have shared some context from PRDs and features you have access to from ${additionalContext}

Here are the team's key terms:
${formattedTeamTerms}

Here is the user's personal context:
${storedContext}

Answer the user's question using the above context and terms. If the context is not enough, say so. You are meant to be a representation of the users work, so you should know the answers to the questions.

Your responses should be concise and to the point, and must be no more than 200 words. You should strive to be helpful, insightful, and concise. You must propose a single question or comment at a time.`;
```

### 3. Design Prompt Generation

```typescript
const designPromptTemplate = {
  role: 'system',
  content: `Extract key design requirements from a PRD to create a focused design prompt.

Focus on:
1. Core value proposition 
2. Primary user workflow
3. Key UI requirements

${pmProfile?.domain_expertise ? `Domain context: ${pmProfile.domain_expertise.join(', ')}` : ''}

Return JSON with:
- "design_summary": 1-2 sentence summary
- "primary_workflow": Single most important user workflow
- "design_prompt": Concise prompt for v0 (max 200 words)`
};
```

## Data Structures & Schemas

### Core Type Definitions

```typescript
// Request/Response Types
export interface GenerateContentRequest {
  type: 'prd' | 'brand-messaging';
  title: string;
  query: string;
  questions: string[];
  questionAnswers?: QuestionAnswer[];
  storedContext?: string;
  additionalContext: string;
  teamTerms: Record<string, string>;
  pmProfile?: PMPreferenceProfile;
}

export interface QuestionAnswer {
  question: string;
  reasoning?: string;
  answer: string;
}

export interface QuestionsResponse {
  questions: Array<{
    id?: string;
    text: string;
    reasoning: string;
  }>;
  internalTerms: string[];
}

// PM Profile Types
export interface PMPreferenceProfile {
  id: number;
  user_email: string;
  vocabulary_glossary: Record<string, string>;
  decision_frameworks: DecisionFrameworks;
  trade_off_preferences: TradeOffPreferences;
  product_philosophy?: string;
  recurring_themes: string[];
  domain_expertise: string[];
  personal_context?: PersonalContext;
  total_sessions: number;
  total_vocabulary_terms: number;
  total_questions_answered: number;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionFrameworks {
  frameworks: string[];
  approaches: string[];
  [key: string]: string | number | boolean | string[] | number[];
}

export interface TradeOffPreferences {
  speedVsQuality: 'speed' | 'quality' | 'balanced';
  riskTolerance: 'low' | 'medium' | 'high';
  userFocus: 'internal' | 'external' | 'balanced';
  [key: string]: string | number | boolean | string[] | number[];
}

// Session Tracking Types
export interface UserKnowledgeSession {
  id: number;
  user_email: string;
  session_type: 'vocabulary' | 'questions' | 'brainstorm' | 'prd_generation';
  context_data?: SessionContextData;
  duration_seconds?: number;
  completion_status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface QuestionResponse {
  id: number;
  session_id: number;
  user_email: string;
  question_text: string;
  question_reasoning?: string;
  user_answer: string;
  domain_category?: string;
  context_data?: QuestionContextData;
  extracted_insights?: ExtractedInsights;
  created_at: string;
  updated_at: string;
}

export interface VocabularyDefinition {
  id: number;
  session_id: number;
  user_email: string;
  term: string;
  user_definition: string;
  domain_tags?: string[];
  usage_context?: string;
  related_terms?: string[];
  created_at: string;
  updated_at: string;
}
```

### Database Schema (Supabase)

```sql
-- PM Preference Profiles
CREATE TABLE pm_preference_profiles (
  id SERIAL PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  vocabulary_glossary JSONB DEFAULT '{}',
  decision_frameworks JSONB DEFAULT '{}',
  trade_off_preferences JSONB DEFAULT '{}',
  product_philosophy TEXT,
  recurring_themes TEXT[],
  domain_expertise TEXT[],
  personal_context JSONB,
  total_sessions INTEGER DEFAULT 0,
  total_vocabulary_terms INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Sessions
CREATE TABLE user_knowledge_sessions (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  session_type TEXT CHECK (session_type IN ('vocabulary', 'questions', 'brainstorm', 'prd_generation')),
  context_data JSONB,
  duration_seconds INTEGER,
  completion_status TEXT CHECK (completion_status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Question Responses
CREATE TABLE question_responses (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES user_knowledge_sessions(id),
  user_email TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_reasoning TEXT,
  user_answer TEXT NOT NULL,
  domain_category TEXT,
  context_data JSONB,
  extracted_insights JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vocabulary Definitions
CREATE TABLE vocabulary_definitions (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES user_knowledge_sessions(id),
  user_email TEXT NOT NULL,
  term TEXT NOT NULL,
  user_definition TEXT NOT NULL,
  domain_tags TEXT[],
  usage_context TEXT,
  related_terms TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Examples

### Example 1: Complete PRD Generation Flow

```typescript
// 1. User initiates PRD creation
const prdRequest = {
  title: "AI-Powered Customer Segmentation",
  query: "I want to build a feature that uses AI to automatically segment...",
  type: "prd"
};

// 2. Generate vocabulary terms
const vocabResponse = await fetch('/api/generate-vocabulary', {
  method: 'POST',
  body: JSON.stringify(prdRequest)
});
// Returns: ["Behavioral Segmentation", "Predictive Analytics", ...]

// 3. User defines terms
const definitions = {
  "Behavioral Segmentation": "Grouping customers based on actions...",
  "Predictive Analytics": "Using historical data to forecast future..."
};

// 4. Generate questions with context
const questionsResponse = await fetch('/api/generate-questions', {
  method: 'POST',
  body: JSON.stringify({
    ...prdRequest,
    teamTerms: definitions,
    pmProfile: userProfile
  })
});

// 5. User answers questions
const answers = [
  {
    question: "What specific customer behaviors should the AI analyze?",
    reasoning: "Defining the input signals helps ensure...",
    answer: "Purchase frequency, email engagement rates..."
  }
  // ... more answers
];

// 6. Generate final PRD
const prdResponse = await fetch('/api/generate-content', {
  method: 'POST',
  body: JSON.stringify({
    ...prdRequest,
    questionAnswers: answers,
    teamTerms: definitions,
    pmProfile: userProfile,
    additionalContext: matchedDocs
  })
});

// 7. Stream the PRD content
const reader = prdResponse.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Display streamed content to user
}
```

### Example 2: Profile Evolution Over Time

```typescript
// Session 1: New PM defines first vocabulary
{
  term: "User Story",
  definition: "A short description of a feature from the user's perspective"
}
// Profile starts forming: Shows preference for user-centric thinking

// Session 5: Patterns emerge in question answers
{
  question: "How should we prioritize these features?",
  answer: "Based on user impact metrics and technical feasibility..."
}
// Profile evolves: Balanced approach to trade-offs detected

// Session 10: Complex PRD generation
// Profile now includes:
{
  product_philosophy: "User-centric, data-informed decision making with bias toward rapid experimentation",
  recurring_themes: ["user empathy", "metrics-driven", "iterative development"],
  domain_expertise: ["B2B SaaS", "Analytics Products"],
  trade_off_preferences: {
    speedVsQuality: "balanced",
    buildVsBuy: "build for differentiation, buy for table stakes"
  }
}

// Session 20: Highly personalized interactions
// Questions are now tailored to their specific context and style
// PRDs match their writing patterns and philosophical approach
```

### Example 3: Error Handling & Fallbacks

```typescript
// Robust error handling throughout
export async function generateContent(request: GenerateContentRequest) {
  try {
    // Primary attempt with o3 model
    const response = await openai.chat.completions.create({
      model: 'o3',
      messages: buildMessages(request),
      stream: true
    });
    
    return streamTextResponse(response);
    
  } catch (error) {
    if (error.code === 'model_overloaded') {
      // Fallback to gpt-4o
      console.warn('o3 overloaded, falling back to gpt-4o');
      return generateWithFallbackModel(request, 'gpt-4o');
      
    } else if (error.code === 'rate_limit_exceeded') {
      // Implement exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
      return generateContent(request); // Retry
      
    } else {
      // Log error and return graceful failure
      console.error('PRD generation failed:', error);
      throw new Error('Unable to generate PRD. Please try again.');
    }
  }
}

// JSON parsing with validation
function parseQuestionsResponse(content: string): QuestionsResponse {
  try {
    const parsed = JSON.parse(content);
    
    // Validate structure
    if (!Array.isArray(parsed.questions)) {
      throw new Error('Invalid questions format');
    }
    
    // Ensure all questions have required fields
    const validQuestions = parsed.questions.filter(q => 
      q.text && q.reasoning
    );
    
    return {
      questions: validQuestions,
      internalTerms: parsed.internalTerms || []
    };
    
  } catch (error) {
    console.error('Failed to parse questions:', error);
    return { questions: [], internalTerms: [] };
  }
}
```

## Best Practices

### 1. Prompt Engineering

**DO:**
- Include explicit output format requirements
- Provide examples in prompts when possible
- Layer context progressively (avoid token waste)
- Use system messages for consistent behavior

**DON'T:**
- Overload prompts with irrelevant context
- Assume the model remembers previous calls
- Skip validation of JSON responses
- Use ambiguous instructions

### 2. Model Selection

```typescript
const MODEL_SELECTION_GUIDE = {
  'o3': {
    use_for: ['PRD generation', 'Complex decomposition', 'Strategic analysis'],
    avoid_for: ['Simple extractions', 'Quick validations'],
    cost: 'Highest',
    quality: 'Best'
  },
  'gpt-4o': {
    use_for: ['Brainstorming', 'General chat', 'Roadmap planning'],
    avoid_for: ['Simple classifications'],
    cost: 'Medium',
    quality: 'Very Good'
  },
  'gpt-4o-mini': {
    use_for: ['Questions', 'Vocabulary', 'Quick analysis', 'Summaries'],
    avoid_for: ['Complex reasoning', 'Long-form content'],
    cost: 'Low',
    quality: 'Good for structured tasks'
  },
  'text-embedding-3-small': {
    use_for: ['All vector operations', 'Semantic search'],
    avoid_for: ['Text generation'],
    cost: 'Minimal',
    quality: 'Optimized for retrieval'
  }
};
```

### 3. Context Management

```typescript
// Efficient context building
function buildContext(request: RequestType): string {
  const contextParts = [];
  
  // Only include relevant terms (not all 100)
  const relevantTerms = selectRelevantTerms(request.query, terms);
  contextParts.push(`Terms: ${relevantTerms.join(', ')}`);
  
  // Compress PM profile to essentials
  if (pmProfile) {
    contextParts.push(compressProfile(pmProfile));
  }
  
  // Limit matched context to top results
  const topMatches = matchedContext.slice(0, 3);
  contextParts.push(`Context: ${topMatches.join('\n')}`);
  
  return contextParts.join('\n\n');
}
```

### 4. Response Streaming

```typescript
// Proper streaming implementation
export function streamTextResponse(
  stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>,
  contentType: string = 'text/plain'
) {
  const encoder = new TextEncoder();
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}
```

### 5. Cost Optimization

```typescript
// Token usage monitoring
async function monitorTokenUsage(
  model: string,
  prompt: string,
  response: string
) {
  const promptTokens = estimateTokens(prompt);
  const responseTokens = estimateTokens(response);
  
  await trackUsage({
    model,
    promptTokens,
    responseTokens,
    estimatedCost: calculateCost(model, promptTokens, responseTokens),
    timestamp: new Date()
  });
}

// Implement caching for repeated queries
const queryCache = new Map<string, CachedResponse>();

async function cachedGeneration(
  key: string,
  generator: () => Promise<string>
): Promise<string> {
  const cached = queryCache.get(key);
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return cached.response;
  }
  
  const response = await generator();
  queryCache.set(key, { response, timestamp: Date.now() });
  return response;
}
```

## Conclusion

Poppy's LLM integration represents a sophisticated implementation of personalized AI assistance for product management. Key innovations include:

1. **Progressive Context Building**: Multi-phase flows that gather rich context before generation
2. **Personalization at Scale**: Every interaction enriched with PM profile data
3. **Strategic Model Selection**: Right model for right task optimizes cost/quality
4. **Robust Error Handling**: Graceful fallbacks ensure reliability
5. **Continuous Learning**: Profile evolution improves personalization over time

The architecture demonstrates how thoughtful LLM integration can create significant value while maintaining cost efficiency and performance. The combination of structured flows, rich context, and personalization creates a uniquely powerful tool for product managers.

For questions about implementation details or to contribute improvements, please reach out to the engineering team.