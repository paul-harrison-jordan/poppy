# Integration Examples

This document shows how to integrate the new evaluation system, request validation, and web search capabilities with your existing API routes.

## 1. Adding Evaluation to Existing Routes

### Before (src/app/api/brainstorm/route.ts):
```typescript
export async function POST(request: Request) {
  const { messages, additionalContext, teamTerms, storedContext, startPrd } = await request.json();
  return await brainstorm({ messages, additionalContext, teamTerms, storedContext, startPrd });
}
```

### After:
```typescript
import { withAuthAndValidation, brainstormRequestSchema } from '@/lib/validation';
import { EvaluatedOperations } from '@/lib/evaluation';
import { getAuthServerSession } from '@/lib/auth';

export const POST = withAuthAndValidation(
  getAuthServerSession,
  brainstormRequestSchema
)(async ({ body, session }) => {
  const { messages, additionalContext, teamTerms, storedContext, startPrd } = body!;
  
  return await EvaluatedOperations.brainstorm(
    'gpt-4o',
    JSON.stringify({ messages, additionalContext }),
    async () => {
      return await brainstorm({ messages, additionalContext, teamTerms, storedContext, startPrd });
    },
    {
      userId: session.user?.email,
      sessionId: `brainstorm-${Date.now()}`
    }
  );
});
```

## 2. Adding Validation to Generate Content

### Before (src/app/api/generate-content/route.ts):
```typescript
export const POST = withAuth(async (session: Session, request: Request) => {
  const body = (await request.json()) as GenerateContentRequest;
  // ... rest of function
});
```

### After:
```typescript
import { withAuthAndValidation, generateContentRequestSchema } from '@/lib/validation';

export const POST = withAuthAndValidation(
  getAuthServerSession,
  generateContentRequestSchema
)(async ({ body, session }) => {
  // body is now type-safe and validated
  const { type, title, query, questions, questionAnswers, storedContext, additionalContext, teamTerms, pmProfile } = body!;
  
  // Build context properly
  const context = ContextBuilder.create()
    .withUser(session.user!.email!)
    .withSession(`generate-${Date.now()}`)
    .buildPRDContext({ teamTerms, storedContext, pmProfile, additionalContext });
  
  // ... rest with validated data
});
```

## 3. Competitive Analysis Integration

### New Agent (src/agents/CompetitiveResearchAgent.ts):
```typescript
import { LLMAgent } from './LLMAgent';
import { SearchAnalysisService } from '@/lib/integrations';

export class CompetitiveResearchAgent extends LLMAgent {
  private searchService: SearchAnalysisService;

  constructor() {
    super(
      'CompetitiveResearchAgent',
      'Analyze competitors and market landscape',
      'gpt-4o',
      2000,
      `Analyze the competitive landscape for {{companyName}} in {{industry}}.
      
      Search Results: {{searchResults}}
      
      Provide:
      1. Key competitors and their positioning
      2. Market opportunities and threats
      3. Competitive advantages to leverage
      4. Strategic recommendations
      
      Format as structured JSON with clear sections.`,
      false,
      { type: 'analysis', criticality: 0.8, outputComplexity: 0.8 }
    );
    
    this.searchService = new SearchAnalysisService();
  }

  async execute(context: { companyName: string; industry: string; domain?: string }) {
    // First get competitive intelligence
    const competitorAnalysis = await this.searchService.analyzeCompetitors(
      context.companyName,
      context.domain,
      context.industry
    );
    
    // Then analyze with LLM
    return await super.execute({
      ...context,
      searchResults: JSON.stringify(competitorAnalysis, null, 2)
    });
  }
}
```

## 4. Enhanced PRD Generation with Competitive Intelligence

### Updated PRDOrchestrator:
```typescript
// In PRDOrchestrator.ts, add competitive analysis
async generateEnhancedAnalysisBundle(
  initialInput: string,
  companyName?: string,
  industry?: string,
  pmProfile?: PMPreferenceProfile
): Promise<AnalysisBundle & { competitive?: CompetitorProfile[] }> {
  const baseBundle = await this.generateAnalysisBundle(initialInput, pmProfile);
  
  // Add competitive intelligence if company context provided
  if (companyName && industry) {
    const searchService = new SearchAnalysisService();
    const competitorAnalysis = await searchService.analyzeCompetitors(
      companyName,
      undefined, // domain
      industry
    );
    
    return {
      ...baseBundle,
      competitive: competitorAnalysis.competitors
    };
  }
  
  return baseBundle;
}
```

## 5. Quality Monitoring Dashboard Data

### New API endpoint (src/app/api/quality/metrics/route.ts):
```typescript
import { withAuthAndValidation } from '@/lib/validation';
import { EvalService } from '@/lib/evaluation';
import { z } from 'zod';

const metricsQuerySchema = z.object({
  operation: z.string().optional(),
  days: z.string().optional().transform(val => val ? parseInt(val) : 7)
});

export const GET = withAuthAndValidation(
  getAuthServerSession,
  undefined,
  metricsQuerySchema
)(async ({ session, query }) => {
  const evalService = EvalService.getInstance();
  
  const [trends, operationStats, history] = await Promise.all([
    evalService.getQualityTrends(
      query?.operation || 'generate-content',
      query?.days || 7,
      session.user?.email
    ),
    evalService.getOperationStats(session.user?.email),
    evalService.getEvaluationHistory(
      query?.operation,
      session.user?.email,
      50
    )
  ]);
  
  return NextResponse.json({
    trends,
    operationStats,
    history: history.slice(0, 10), // Latest 10 for dashboard
    summary: {
      totalEvaluations: history.length,
      avgScore: history.reduce((sum, eval) => sum + eval.overallScore, 0) / history.length,
      lastWeekImprovement: trends.length > 0 ? 
        trends[trends.length - 1].avgScore - trends[0].avgScore : 0
    }
  });
});
```

## 6. Environment Variables

Add these to your `.env`:
```bash
# Google Search (optional - falls back to mock)
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# Feature flags
ENABLE_COMPETITIVE_ANALYSIS=true
ENABLE_EVAL_SYSTEM=true
ENABLE_SEARCH_CACHE=true
```

## 7. Testing Integration

### Test the new systems:
```bash
# Test competitive analysis
curl -X POST http://localhost:3000/api/competitive-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Klaviyo",
    "industry": "Email Marketing",
    "keyFeatures": ["segmentation", "automation"],
    "analysisType": "quick"
  }'

# Test quality metrics
curl http://localhost:3000/api/quality/metrics?operation=generate-content&days=7
```

## Key Benefits Achieved

1. **Quality Visibility**: Every AI operation is now evaluated and tracked
2. **Type Safety**: All API requests are validated with proper error messages
3. **Competitive Intelligence**: Web search provides market insights for better PRDs
4. **Maintainable Code**: Clear separation of concerns with reusable services
5. **Performance**: Caching and rate limiting prevent API abuse
6. **Scalable Architecture**: Easy to extend with new search providers or evaluation metrics

## Next Steps

1. Run the database migration: `psql -f ai-evaluations-schema.sql`
2. Update existing API routes gradually using the patterns above
3. Add monitoring dashboards using the quality metrics
4. Extend search providers (Bing, DuckDuckGo) as needed
5. Create specialized agents for Slack/Jira orchestration