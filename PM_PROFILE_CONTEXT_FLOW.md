# PM Profile Context Flow

This document explains how the PM Profile information is stored, passed, and used to inform PRD generation in the batch PRD workflow.

---

## PM Profile Collection (Step 1)

### Component: `PMProfileCreation.tsx`

**Collected Information:**

1. **Product Area Personas** (3 types)
   - `customerFacing`: Who uses customer-facing features (e.g., segment builder users)
   - `customerImpacting`: Who uses customer-impacting features (e.g., marketers)
   - `infrastructure`: Who uses infrastructure features (e.g., internal engineers)

2. **Trade-off Preferences**
   - `speedVsQuality`: 'speed' | 'balanced' | 'quality'
   - `riskTolerance`: 'low' | 'medium' | 'high'
   - `userFocus`: 'internal' | 'balanced' | 'external'

3. **Strategic Context** (Optional)
   - `productVision`: Overall product vision statement
   - `teamStrategy`: Team strategy and constraints

**Output:** `Partial<PMPreferenceProfile>` stored in page state

---

## Profile Storage & Passage

### Flow:
```
PMProfileCreation
  → BatchPRDPage (state: pmProfile)
  → /api/batch-prd/generate-content (for Q&A generation)
  → /api/batch-prd/generate-prds (for final PRD)
```

### Data Structure:
```typescript
{
  vocabulary_glossary: {},
  decision_frameworks: { frameworks: [], approaches: [] },
  trade_off_preferences: {
    speedVsQuality: 'balanced',
    riskTolerance: 'medium',
    userFocus: 'balanced'
  },
  recurring_themes: [],
  domain_expertise: [],
  personal_context: {
    productAreaPersonas: { customerFacing, customerImpacting, infrastructure },
    productVision: string,
    teamStrategy: string
  }
}
```

---

## How PM Profile Informs PRD Generation

### File: `/api/batch-prd/generate-prds/route.ts`

The PM profile is transformed into a comprehensive `storedContext` string that includes:

### 1. **Team Vocabulary** (lines 48-53)
```typescript
const teamTerms = {
  ...pmProfile?.vocabulary_glossary,  // Pre-existing glossary
  ...approvedTerms                    // Newly approved terms
}
```
**Impact:** PRD uses consistent terminology across the organization

### 2. **Strategic Context** (lines 67-121)
Built from multiple profile fields:

#### Examples of Thinking
```
pmProfile.personal_context.examplesOfHowYouThink
```
**Impact:** PRD mirrors PM's decision-making patterns

#### Product Vision
```
pmProfile.personal_context.productVision
```
**Impact:** PRD aligns with overall product direction

#### Team Strategy
```
pmProfile.personal_context.teamStrategy
```
**Impact:** PRD respects team constraints and goals

#### Product Philosophy
```
pmProfile.product_philosophy
```
**Impact:** PRD follows PM's overall product approach

#### Decision Frameworks
```
pmProfile.decision_frameworks.frameworks
```
**Impact:** PRD uses PM's mental models

#### Recurring Themes
```
pmProfile.recurring_themes
```
**Impact:** PRD emphasizes consistent themes

### 3. **Trade-off Preferences** (lines 95-101)
```
- Speed vs Quality: balanced
- Risk Tolerance: medium
- User Focus: balanced
```
**Impact:** PRD recommendations match PM's risk/quality profile

### 4. **Product Area Personas** (lines 104-119)
```
- Customer-Facing: [persona description]
- Customer-Impacting: [persona description]
- Infrastructure: [persona description]
```
**Impact:** PRD speaks to the right user personas

---

## Complete Context String Example

The final `storedContext` passed to `generateContent()`:

```
Examples of how I think:
[PM's thinking examples if provided]

Product Vision:
Build the most intuitive email marketing platform for SMBs

Team Strategy:
Focus on quick wins in Q1, maintain 95% uptime, limit scope to 2 sprint cycles

Trade-off Preferences:
- Speed vs Quality: balanced
- Risk Tolerance: medium
- User Focus: external

Product Area Personas:
- Customer-Facing: Support agents resolving customer issues
- Customer-Impacting: Marketers improving campaign performance
- Infrastructure: Engineers maintaining internal systems
```

---

## How It's Used in PRD Generation

### File: `src/lib/services/openaiService.ts` → `generateContent()`

The `storedContext` is injected into the AI prompt:

```typescript
I've included instructions for how to think and write PRDs like a product manager with:
${ctx.examplesOfHowYouThink}

I've also included background on how to think like my product team:
${ctx.pillarGoalsKeyTermsBackground}

I've included a doc that outlines the strategic goals of my product team:
${ctx.teamStrategy}
```

### Combined with:
- **Approved Q&A**: `questionAnswers` array with reasoning
- **Team Terms**: `teamTerms` dictionary
- **JTBD**: The feature's job-to-be-done
- **Feature Name**: The specific feature being documented

---

## Result

The AI generates a PRD that:
1. ✅ Uses the PM's vocabulary and terminology
2. ✅ Aligns with the product vision
3. ✅ Respects team strategy and constraints
4. ✅ Matches the PM's trade-off preferences
5. ✅ Speaks to the appropriate user personas
6. ✅ Incorporates approved Q&A research
7. ✅ Follows the PM's decision-making patterns

---

## Future Enhancements

The PM profile can be enhanced over time with:
- **Learned vocabulary** from past PRDs
- **Extracted decision frameworks** from Q&A patterns
- **Recurring themes** identified across features
- **Domain expertise** tags from session history

This creates increasingly personalized PRD generation as the PM uses the tool more.
