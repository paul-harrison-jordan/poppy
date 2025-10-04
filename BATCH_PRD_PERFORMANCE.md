# Batch PRD Generation - Performance & Architecture

## Overview

The batch PRD generation system is optimized for **maximum PM productivity** by allowing PMs to draft multiple PRDs simultaneously with all their accumulated context.

---

## Performance Architecture

### **Single API Call Per PRD** ✅

Each PRD requires exactly **1 call** to `generateContent()`:

```typescript
// For N features, we make N parallel calls
const prdPromises = features.map(async (feature) => {
  const contentResponse = await generateContent({...}); // 1 call
  const markdown = await collectStream(contentResponse);
  await saveToGoogleDocs(...);
  return { featureId, title, markdown, googleDocUrl };
});

const prds = await Promise.all(prdPromises); // Execute in parallel
```

### **Parallel Execution** 🚀

All PRD generations happen **in parallel** using `Promise.all()`:

- **3 PRDs** = 3 parallel API calls (not 9 sequential)
- **10 PRDs** = 10 parallel API calls (not 30 sequential)

**Time Savings:**
- Sequential: `N × generation_time`
- Parallel: `max(generation_times)` ≈ single PRD time

### **Context Reuse** 📦

All PRDs share the same context (fetched once from localStorage):

```typescript
// Client-side (page.tsx) - fetch once
const teamTerms = localStorage.getItem('teamTerms');
const personalContext = localStorage.getItem('personalContext');

// Server-side - use for all PRDs
features.map(feature => {
  generateContent({
    teamTerms,           // Shared
    storedContext,       // Shared
    questionAnswers,     // Feature-specific
    ...
  });
});
```

---

## Context Sources

### **Consolidated from 3 Sources:**

1. **localStorage** (from onboarding)
   - `teamTerms`: Vocabulary glossary
   - `personalContext`: Team strategy, product thinking, pillar goals

2. **PM Profile** (from batch wizard)
   - Product vision
   - Team strategy
   - Trade-off preferences
   - Decision frameworks
   - Product area personas

3. **Approved Content** (from current session)
   - Newly approved vocabulary terms
   - Q&A with reasoning and sources

### **Merge Priority:**

```typescript
const teamTerms = {
  ...localStorageTeamTerms,   // Base layer
  ...pmProfile.vocabulary,     // Middle layer
  ...approvedTerms            // Top layer (highest priority)
};
```

---

## Full Context Passed to Each PRD

### **Team Vocabulary**
- All terms from onboarding
- PM profile glossary
- Session-approved terms

### **Strategic Context**
- Team strategy (localStorage + PM profile)
- Product vision
- How you think about product
- Pillar goals & key terms
- Product philosophy
- Decision frameworks
- Recurring themes

### **Preferences**
- Speed vs Quality preference
- Risk tolerance level
- User focus (internal/external)

### **Personas**
- Customer-facing persona
- Customer-impacting persona
- Infrastructure persona

### **Feature-Specific**
- Approved Q&A with reasoning
- Web-researched sources
- Feature name & JTBD

---

## API Call Breakdown

### **Total API Calls for N Features:**

| Operation | Calls | Type | Timing |
|-----------|-------|------|--------|
| Generate PRD content | N | OpenAI `gpt-4o` | Parallel |
| Save to Google Docs | N | Google Drive API | Sequential per PRD |
| Save to database | N | Supabase | Non-blocking |

### **Example: 5 Features**

```
5 × generateContent() calls (parallel)
  ↓
5 × saveToGoogleDocs() calls (per PRD)
  ↓
5 × database saves (non-blocking)
```

**Total time ≈ time for 1 PRD** (due to parallelization)

---

## Optimization Strategies

### ✅ **What We Do:**

1. **Parallel execution** - All PRDs at once
2. **Context reuse** - Fetch localStorage once
3. **Single LLM call** - One `generateContent()` per PRD
4. **Minimal overhead** - No redundant API calls

### ❌ **What We Don't Do:**

1. ~~Sequential generation~~ (would be N× slower)
2. ~~Multiple LLM calls per PRD~~ (would waste tokens)
3. ~~Re-fetch context per PRD~~ (would waste time)
4. ~~Blocking database saves~~ (would add latency)

---

## Real-World Performance

### **Expected Times** (estimated)

| # PRDs | Sequential (old) | Parallel (current) | Speedup |
|--------|------------------|-------------------|---------|
| 1 PRD  | 30s | 30s | 1× |
| 3 PRDs | 90s | 35s | 2.6× |
| 5 PRDs | 150s | 40s | 3.8× |
| 10 PRDs | 300s | 50s | 6× |

**Key Insight:** Time grows sub-linearly with # of PRDs due to parallelization.

---

## Monitoring & Debugging

### **Console Logs:**

```typescript
[generate-prds] Starting PRD generation for 5 features
[generate-prds] Generating PRD for feature: Payment Gateway
[generate-prds] Generated PRD for "Payment Gateway" with 15 sources
[generate-prds] Saved PRD to Google Docs: https://docs.google.com/...
[generate-prds] PRD stored in database with ID: 123
[generate-prds] Generated 5 PRDs in 42,351ms
```

### **Performance Metrics:**

```typescript
const startTime = Date.now();
// ... generate PRDs ...
const totalTime = Date.now() - startTime;
console.log(`Generated ${successfulPRDs.length} PRDs in ${totalTime}ms`);
```

### **Average Time Per PRD:**

```typescript
const avgTime = totalTime / successfulPRDs.length;
// Typically: 30-50s per PRD (including Google Docs save)
```

---

## Scalability

### **Current Limits:**

- **No artificial limit** on # of PRDs per batch
- **API rate limits** are the only constraint
- **Parallel execution** scales well up to ~20 PRDs

### **Recommended Batch Sizes:**

- **1-5 PRDs**: Optimal for most PMs
- **5-10 PRDs**: Still fast, good for sprint planning
- **10+ PRDs**: Possible but may hit rate limits

### **Future Optimizations:**

- Batch size warning if > 10 PRDs
- Progress indicators during generation
- Retry logic for failed PRDs
- Queueing for very large batches

---

## PM Productivity Impact

### **Time Savings Example:**

**Traditional Flow (manual):**
- Research: 30 min/PRD
- First draft: 45 min/PRD
- Revisions: 30 min/PRD
- **Total: ~105 min per PRD**

**Batch PRD Flow (automated):**
- Define features: 5 min total
- Review Q&A: 2 min/PRD
- Approve & generate: ~30s/PRD
- **Total: ~5 min + 2N min ≈ 10-20 min for 5 PRDs**

**ROI: 10-20 min vs 525 min = 26-52× faster** 🚀

---

## Summary

✅ **Single API call per PRD** - No redundant calls
✅ **Parallel execution** - All PRDs generated at once
✅ **Full context included** - localStorage + PM profile + approved content
✅ **Optimized for PM productivity** - Draft 5-10 PRDs in minutes
✅ **Scales well** - Time grows sub-linearly with # of PRDs

The batch PRD system is designed to **amplify PM performance** by leveraging all accumulated context and parallel processing.
