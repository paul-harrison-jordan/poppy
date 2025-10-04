# Garden Multi-Agent Feature - Individual APIs + Writing Agent Architecture

## Overview
Garden is a **multi-agent PM assistant** with individual API endpoints for each specialist agent and a dedicated Writing Agent that creates Google Docs. This provides better observability, independent scaling, and refined document output.

## Architecture

### Core Components
- **Garden Orchestrator**: Coordinates workflow and delegates to individual agent APIs
- **5 Specialist Agent APIs**: Independent endpoints for Planning, Strategy, Research, Design, Engineering
- **Writing Agent**: Synthesizes specialist outputs into structured Google Docs
- **Google Doc Creation**: Automated document creation and rendering
- **Individual Observability**: Each agent call tracked separately for better debugging

## File Structure - Abstracted Services Architecture

```
src/
├── services/garden/
│   ├── index.ts                   # Main exports
│   ├── types.ts                   # TypeScript definitions
│   ├── GardenOrchestrator.ts      # Main orchestration service
│   ├── AgentRegistry.ts           # Centralized agent management
│   └── agents/                    # Individual agent definitions
│       ├── index.ts               # Agent exports
│       ├── orchestrator.ts        # Orchestrator prompts
│       ├── planning.ts            # Planning agent
│       ├── strategy.ts            # Strategy agent  
│       ├── research.ts            # Research agent
│       ├── design.ts              # Design agent
│       └── engineering.ts         # Engineering agent
│
├── app/api/garden/
│   ├── chat/route.ts              # Main workflow endpoint
│   ├── create-doc/route.ts        # Google Doc creation
│   └── agents/                    # Individual agent APIs
│       ├── planning/route.ts      # Planning agent endpoint
│       ├── strategy/route.ts      # Strategy agent endpoint
│       ├── research/route.ts      # Research agent endpoint
│       ├── design/route.ts        # Design agent endpoint
│       ├── engineering/route.ts   # Engineering agent endpoint
│       └── writing/route.ts       # Writing agent endpoint
│
├── lib/services/
│   └── openaiService.ts           # Delegates to Garden services
│
├── components/
│   ├── ChatInterface.tsx          # Garden mode integration
│   ├── ChatInput.tsx              # Garden mode button
│   └── garden/
│       └── GardenChat.tsx         # Garden UI component
```

**Benefits of New Architecture:**
- ✅ **Individual Observability**: Each agent call tracked separately with timing/tokens
- ✅ **Independent Scaling**: Agent APIs can be optimized/cached individually  
- ✅ **Document Creation**: Writing Agent creates structured Google Docs
- ✅ **Better UX**: Users get polished documents, not just chat responses
- ✅ **Service Abstraction**: Clean separation between orchestration and execution
- ✅ **Easy Maintenance**: Agent prompts centralized in dedicated files

## Key Types & Interfaces

```typescript
// Core Garden types
interface GardenSession {
  id: string;
  userId: string;
  title?: string;
  status: 'active' | 'completed' | 'archived';
  messages: GardenMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface GardenMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'orchestrator' | 'agent' | 'system';
  content: string;
  agentType?: AgentType;
  toolCalls?: ToolCall[];
  thinking?: string; // Agent reasoning process
  createdAt: Date;
}

type AgentType = 'planning' | 'strategy' | 'research' | 'design' | 'engineering';

interface ToolCall {
  id: string;
  name: string;
  description: string;
  status: 'thinking' | 'executing' | 'completed' | 'failed';
  input?: any;
  output?: any;
  startTime: Date;
  endTime?: Date;
}

// Agent definitions
interface GardenAgent {
  type: AgentType;
  name: string;
  description: string;
  tools: Tool[];
  prompt: string;
  execute(input: string, context: GardenContext): Promise<AgentResponse>;
}

interface AgentResponse {
  content: string;
  toolCalls: ToolCall[];
  thinking: string;
  confidence: number;
  nextActions?: string[];
}
```

## Integration Points

### 1. LangChain Integration
```typescript
// Extend existing openaiService.ts
export class GardenOrchestrator extends BaseAgent {
  private specialists: Map<AgentType, GardenAgent>;
  
  async executeWorkflow(query: string, context: GardenContext) {
    // Use parallel tool calls similar to OpenAI example
    const results = await this.callMultipleAgents(query, context);
    return this.synthesizeResponse(results);
  }
}
```

### 2. tRPC Router Extension
```typescript
// Add to existing tRPC setup
export const gardenRouter = createTRPCRouter({
  startSession: publicProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input }) => {
      // Initialize Garden session
    }),
    
  streamChat: publicProcedure
    .input(z.object({ sessionId: z.string(), message: z.string() }))
    .subscription(async function* ({ input }) {
      // Stream agent thinking and responses
      yield* orchestrator.streamWorkflow(input.message);
    }),
});
```

### 3. Real-time Streaming
```typescript
// Streaming agent thinking and tool execution
export async function* streamAgentWorkflow(query: string) {
  yield { type: 'thinking', content: 'Analyzing your request...' };
  
  yield { type: 'tool_selection', tools: ['planning-agent', 'research-agent'] };
  
  const results = await executeAgentsParallel(['planning', 'research'], query);
  
  for (const result of results) {
    yield { type: 'agent_response', agentType: result.type, content: result.content };
  }
  
  yield { type: 'synthesis', content: synthesizedResponse };
}
```

## Agent Prompt Templates

### Garden Orchestrator Prompt
```markdown
You are the Garden Orchestrator, a senior Product Manager's AI assistant. Your role is to coordinate specialist agents to provide comprehensive PM guidance.

WORKFLOW:
1. Analyze user query and determine required specialist agents
2. Delegate to appropriate agents using parallel execution when possible
3. Synthesize specialist outputs into actionable PM insights
4. Always show your thinking process to the user

AVAILABLE SPECIALIST AGENTS:
- planning-agent: Requirements, scope, task breakdown
- strategy-agent: JTBD, prioritization, scope management
- research-agent: Industry analysis, competitive research
- design-agent: Mock designs, user flows
- engineering-agent: Technical feasibility, work decomposition

RULES:
- Always explain which tools/agents you're considering
- Use parallel execution for independent tasks
- Provide original, actionable insights
- Challenge assumptions and provide multiple perspectives
```

### Specialist Agent Prompts
```typescript
const AGENT_PROMPTS = {
  planning: `You are a Planning Specialist focused on requirements gathering and scope definition...`,
  strategy: `You are a PM Strategy Specialist expert in frameworks like JTBD, RICE, MoSCoW...`,
  research: `You are a Research Specialist focused on industry analysis and competitive intelligence...`,
  design: `You are a Design Strategy Specialist focused on user experience and design thinking...`,
  engineering: `You are an Engineering Specialist focused on technical feasibility and work breakdown...`
};
```

## Implementation Status - COMPLETE ✅

### What's Ready to Use:
- ✅ **Garden Orchestrator**: Coordinates workflow and selects appropriate specialist agents
- ✅ **5 Individual Agent APIs**: Independent endpoints with observability (timing, tokens, errors)
- ✅ **Writing Agent**: Synthesizes agent outputs into structured PM documents
- ✅ **Google Doc Creation**: Automated document creation with preview and editing
- ✅ **Real-time UI**: Agent execution status + Google Doc display
- ✅ **Better Observability**: Individual API calls trackable for debugging/optimization

### Usage Example:
1. Click "Garden" mode button in Poppy chat
2. Ask: "How should I prioritize between improving onboarding vs. adding advanced analytics?"
3. Watch orchestrator select Strategy + Research + Planning agents (individual API calls)
4. See Writing Agent synthesize responses into structured document
5. Get Google Doc with professional PM analysis - ready to share with stakeholders

### How to Add New Agents:
1. Create new agent definition in `src/services/garden/agents/newAgent.ts`
2. Create API endpoint in `src/app/api/garden/agents/newAgent/route.ts`
3. Add to `AgentRegistry.ts` and update types
4. Individual API provides better observability than embedded calls

### How to Modify Agent Behavior:
1. Edit the agent's `systemPrompt` in its dedicated file  
2. Changes automatically apply to individual API endpoint
3. Monitor performance/tokens per agent via individual API metrics

### Individual API Benefits:
- **Better Debugging**: Each agent call traceable with timing/tokens
- **Independent Caching**: Cache successful agent responses individually
- **Scaling**: Optimize/rate-limit agents based on usage patterns
- **Error Handling**: Isolated failures don't break entire workflow

## Success Metrics
- Time to complete PM workflows
- User engagement with agent thinking visibility  
- Quality of multi-agent synthesized outputs
- Adoption of Garden vs. existing Poppy tools

## Next Steps
1. Review and approve architecture
2. Set up database schema
3. Implement basic orchestrator
4. Build first specialist agent
5. Create minimal UI for testing