# Model Usage Map

This document outlines which OpenAI models are used at each step of the PRD generation workflow.

## Overview

We use three models strategically based on task complexity and criticality:

- **`o3`** - Highest quality reasoning model for critical generation tasks
- **`gpt-4o`** - High-quality model for complex analysis and web search
- **`gpt-4o-mini`** - Fast, cost-effective model for simpler extraction tasks

---

## Batch PRD Generation Flow

### Step 1: Generate Questions
**File:** `src/lib/services/openaiService.ts` → `generateQuestions()`
**Model:** `o3`
**Why:** Generates high-quality strategic questions based on JTBD. Requires deep reasoning about product strategy.

### Step 2: Extract Terms
**File:** `src/orchestrators/BatchPRDOrchestrator.ts` → `extractTerms()`
**Model:** `gpt-4o`
**Why:** Identifies technical vocabulary from questions and JTBD. Requires understanding of domain terminology.

### Step 3: Web Search for Term Definitions
**File:** `src/lib/services/openaiWebSearch.ts` → `performOpenAIWebSearch()`
**Model:** `gpt-4o` (with `web_search` tool)
**Why:** Uses Responses API with real web search to find accurate term definitions from live sources.

### Step 4: Web Search for Question Answers
**File:** `src/lib/services/openaiWebSearch.ts` → `searchQuestionWithWebSearch()`
**Model:** `gpt-4o` (with `web_search` tool)
**Why:** Searches web for business case studies and best practices to answer PRD questions with citations.

### Step 5: PRD Section Generation
**File:** `src/agents/prdWriter.ts` → `PRDWriterAgent`
**Model:** `o3` (forced, no fallback)
**Why:** Highest quality needed for final PRD content. Must be comprehensive, well-structured, and actionable for engineering teams.

---

## PRD Analysis Agents

These agents run during the full PRD generation process (called by `PRDOrchestrator`):

### JobsExtractorAgent
**File:** `src/agents/jobsExtractor.ts`
**Model:** `gpt-4o-mini`
**Task:** Extract and rank top 3-5 jobs-to-be-done
**Why:** Simple extraction task, doesn't require heavy reasoning

### ScopeAnalyzerAgent
**File:** `src/agents/scopeAnalyzer.ts`
**Model:** `gpt-4o-mini`
**Task:** Determine what's in-scope vs out-of-scope
**Why:** Straightforward categorization task

### CompetitiveLandscaperAgent
**File:** `src/agents/competitiveLandscaper.ts`
**Model:** `gpt-4o`
**Task:** Analyze competitor help docs and features
**Why:** Complex analysis requiring deep understanding of competitive positioning

### RoadmapPositionerAgent
**File:** `src/agents/roadmapPositioner.ts`
**Model:** `gpt-4o`
**Task:** Position feature within existing product roadmap
**Why:** Requires strategic thinking about product direction and dependencies

### EngineeringEstimatorAgent
**File:** `src/agents/engineeringEstimator.ts`
**Model:** `gpt-4o-mini`
**Task:** Estimate engineering complexity and effort
**Why:** Structured estimation based on scope analysis

### OutcomeAnalyzerAgent
**File:** `src/agents/outcomeAnalyzer.ts`
**Model:** `gpt-4o`
**Task:** Analyze expected outcomes and success metrics
**Why:** Strategic analysis requiring business insight

---

## Supporting Services

### openaiService.ts
**File:** `src/lib/services/openaiService.ts`

Contains multiple helper functions using various models:

- **`generateQuestions()`** → `o3` - Strategic question generation
- **`generateQuestionsForIdea()`** → `o3` - Question generation from initial ideas
- **`generateContent()`** → `gpt-4o` - General PRD content generation
- **`generateVocabulary()`** → `gpt-4o-mini` - Extract vocabulary terms
- **`summarizeComments()`** → `gpt-4o-mini` - Summarize user feedback
- **`analyzeCompetitiveLandscape()`** → `gpt-4o` - Competitive analysis
- **`extractInsights()`** → `gpt-4o-mini` - Extract user insights
- **`classifyQuestionType()`** → `gpt-4o-mini` - Classify question categories
- **`enrichQuestionWithContext()`** → `o3` - Add strategic context to questions

---

## Model Selection Strategy

### When to use `o3`:
- **Critical reasoning tasks** where quality is paramount
- **Final content generation** (PRDs, strategic documents)
- **Deep strategic thinking** (positioning, vision)
- **Complex question generation** requiring product intuition

### When to use `gpt-4o`:
- **Complex analysis** requiring understanding of context
- **Web search tasks** via Responses API
- **Competitive intelligence** and market analysis
- **Multi-faceted evaluation** tasks

### When to use `gpt-4o-mini`:
- **Simple extraction** (terms, categories, insights)
- **Structured data parsing** (JSON extraction)
- **Classification** tasks with clear criteria
- **Summarization** of straightforward content

---

## Cost Optimization

The model selection is optimized for:

1. **Quality where it matters** - Use `o3` only for critical generation
2. **Speed for iteration** - Use `gpt-4o-mini` for fast feedback loops
3. **Balanced performance** - Use `gpt-4o` for complex analysis
4. **Web-enhanced accuracy** - Use `gpt-4o` with `web_search` for real-time data

---

## Future Considerations

- **Model upgrades**: Easy to upgrade agents by changing model parameter
- **A/B testing**: Can test different models for specific agents
- **Dynamic selection**: `ModelSelector.ts` can choose models based on task metrics
- **Cost monitoring**: Track token usage per agent to optimize spend
