# Garden Mode V2 Migration Guide

## Overview
Garden Mode V2 introduces deep research capabilities, vectorDB integration, and a significantly improved UI that matches Poppy's design system.

## Key Improvements

### 1. Deep Research Phase (Like OpenAI's Approach)
- **Before**: Agents executed immediately with limited context
- **Now**: Comprehensive research phase that:
  - Analyzes problem space
  - Retrieves from vectorDB (previous PRDs, team knowledge)
  - Conducts targeted external research
  - Synthesizes all findings before agent execution

### 2. VectorDB Integration
- Stores and retrieves previous PRDs
- Searches team knowledge sessions
- Uses embeddings for semantic similarity
- Provides relevant context automatically

### 3. Enhanced UI/UX
- **Poppy Design System**: Lavender, poppy, and sprout color scheme
- **Dynamic Progress Tracking**: Shows actual workflow phases, not generic steps
- **Dual View**: Progress view for users, audit log for detailed tracking
- **Research Insights**: Visual cards showing sources and confidence
- **Quality Metrics**: Real-time completeness and confidence scores

### 4. Intelligent Question Generation
- Questions only for critical unknowns
- Non-blocking workflow continues without answers
- Default assumptions if not answered
- Clear explanation of why each question matters

### 5. Quality Validation
- Automatic quality scoring
- Gap identification and follow-up research
- Validation against PRD best practices
- Iterative improvement loop

## Implementation Steps

### Step 1: Update API Route
Update `/api/garden/chat/route.ts` to support version flag:

```typescript
const { query, storedContext, teamTerms, existingDocument, version } = body;

if (version === 'v2') {
  // Use new orchestrator
  yield* GardenOrchestratorV2.streamWorkflow({
    query,
    storedContext,
    teamTerms,
    existingDocument
  });
} else {
  // Use existing orchestrator for backward compatibility
  yield* GardenOrchestrator.streamWorkflow({
    query,
    storedContext,
    teamTerms,
    existingDocument
  });
}
```

### Step 2: Create Documents Table
Add to your Supabase schema:

```sql
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  query_origin TEXT,
  context_used TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_created_at ON documents(created_at);
```

### Step 3: Add VectorDB Search Function
Add to Supabase:

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  type text,
  title text,
  content jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.type,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM documents d
  WHERE 
    1 - (d.embedding <=> query_embedding) > match_threshold
    AND (filter = '{}' OR d.metadata @> filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Step 4: Update Frontend
Replace `GardenChat` with `GardenChatV2` in your page:

```typescript
import GardenChatV2 from '@/components/garden/GardenChatV2';

export default function GardenPage() {
  return (
    <GardenChatV2 
      storedContext={storedContext}
      teamTerms={teamTerms}
    />
  );
}
```

### Step 5: Environment Variables
Ensure you have:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
OPENAI_API_KEY=your_key
```

## Testing the New Features

### Test Deep Research
1. Submit a PRD request
2. Watch the "Deep Research" phase execute
3. Observe research findings appear in real-time
4. Check that context is enhanced before agents run

### Test VectorDB Integration
1. Create a PRD
2. Create another similar PRD
3. Verify the second one references the first
4. Check quality improvements from historical context

### Test UI Improvements
1. Toggle between Progress and Audit views
2. Expand/collapse workflow phases
3. Observe dynamic step updates
4. Review quality metrics display

## Rollback Plan
If issues arise, you can rollback by:
1. Remove `version: 'v2'` from frontend API calls
2. Use original `GardenChat` component
3. Original orchestrator remains functional

## Performance Considerations
- VectorDB queries add ~200-500ms latency
- Deep research phase adds 5-10s upfront
- Overall quality improvement worth the tradeoff
- Consider caching frequent queries

## Next Steps
1. Monitor quality scores to validate improvements
2. Gather user feedback on new UI
3. Fine-tune research depth based on usage patterns
4. Consider adding more specialist agents