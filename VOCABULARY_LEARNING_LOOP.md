# Vocabulary Learning Loop

## Overview

The batch PRD system now implements a **continuous learning loop** where approved vocabulary terms are saved to localStorage and used to generate smarter, more contextualized vocabulary in future sessions.

---

## The Learning Loop Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Session N (Current)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User defines features                                        │
│     ↓                                                             │
│  2. Load teamTerms from localStorage (N-1 sessions)              │
│     ↓                                                             │
│  3. Generate vocab USING existing teamTerms                      │
│     → AI avoids duplicates                                       │
│     → AI stays consistent with existing definitions              │
│     → AI generates complementary terms                           │
│     ↓                                                             │
│  4. User reviews & approves terms                                │
│     ↓                                                             │
│  5. SAVE approved terms to localStorage                          │
│     → Merge with existing teamTerms                              │
│     → localStorage grows incrementally                           │
│     ↓                                                             │
│  6. Generate PRDs using updated vocabulary                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Session N+1 (Future)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Load teamTerms from localStorage                             │
│     → Includes terms from Session N                              │
│     → AI gets smarter with more context                          │
│     ↓                                                             │
│  2. Generate even better vocab...                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### **1. Initial Vocab Generation** (Step 3)

**File:** `src/app/batch-prd/page.tsx` → `handleFeaturesSubmit()`

```typescript
// Pull existing teamTerms from localStorage
const existingTeamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}');

// Pass to API
await fetch('/api/batch-prd/generate-content', {
  body: JSON.stringify({
    batchSession,
    pmProfile,
    teamTerms: existingTeamTerms  // ← AI uses these
  })
});
```

**File:** `src/orchestrators/BatchPRDOrchestrator.ts`

```typescript
// Merge localStorage terms with PM profile
const mergedTeamTerms = {
  ...teamTerms,              // From localStorage
  ...pmProfile?.vocabulary   // From PM profile
};

// Pass to question/vocab generation
await generateQuestions({
  teamTerms: mergedTeamTerms  // ← AI avoids duplicates
});
```

### **2. Save Approved Terms** (Step 5)

**File:** `src/app/batch-prd/page.tsx` → `handleApprove()`

```typescript
// Extract approved terms
const newTerms = {};
approvedContent.forEach(content => {
  content.terms
    .filter(t => t.approved)
    .forEach(term => {
      newTerms[term.term] = term.definition;
    });
});

// Merge with existing
const existingTeamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}');
const mergedTeamTerms = { ...existingTeamTerms, ...newTerms };

// Save for future sessions
localStorage.setItem('teamTerms', JSON.stringify(mergedTeamTerms));
console.log(`Saved ${Object.keys(newTerms).length} new terms`);
```

### **3. Use in PRD Generation** (Step 6)

**File:** `src/app/api/batch-prd/generate-prds/route.ts`

```typescript
// Team terms include approved terms (just saved)
const teamTerms = {
  ...localStorageTeamTerms,   // Includes newly approved
  ...pmProfile?.vocabulary,
  ...approvedTerms            // Add again for this PRD
};

await generateContent({
  teamTerms,  // ← PRD uses all vocabulary
  ...
});
```

---

## Benefits of the Learning Loop

### **1. Consistency** ✅
Once a term is defined, it's used consistently across all future PRDs:
- "Conversion funnel" always means the same thing
- No conflicting definitions
- Team alignment on vocabulary

### **2. Smarter Vocab Generation** 🧠
AI uses existing terms to generate complementary vocab:
- **Before:** AI might suggest "conversion rate"
- **After:** AI knows "conversion rate" exists, suggests "drop-off rate" instead
- Avoids redundant terms
- Fills vocabulary gaps

### **3. Reduced Manual Work** ⚡
Each session requires less review:
- **Session 1:** Review 20 terms
- **Session 2:** Review 15 terms (5 already in system)
- **Session 3:** Review 10 terms (10 already in system)

### **4. Compound Learning** 📈
Vocabulary grows over time:
```
Session 1: 15 terms → localStorage
Session 2: 15 + 12 new = 27 terms
Session 3: 27 + 8 new = 35 terms
Session 4: 35 + 5 new = 40 terms
...
```

### **5. Team-Specific Vocabulary** 🎯
The system learns YOUR team's language:
- Industry-specific terms
- Internal product names
- Company-specific concepts

---

## What Gets Saved

### **Storage Structure:**

```json
// localStorage.getItem('teamTerms')
{
  "conversion funnel": "The path users take from awareness to purchase...",
  "retention rate": "Percentage of users who return after first visit...",
  "churn": "When a user stops using the product...",
  "DAU": "Daily Active Users - unique users per day...",
  // ... grows over time
}
```

### **Merge Priority:**

When generating vocab, terms are merged in this order:

1. **localStorage teamTerms** (base layer - all sessions)
2. **PM profile vocabulary** (middle layer - profile)
3. **Session approved terms** (top layer - current session)

New terms never overwrite existing ones unless explicitly re-defined.

---

## AI Prompt Integration

### **Question Generation** (`generateQuestions`)

The AI receives teamTerms and:
- Avoids asking about terms already defined
- References existing terms in questions
- Builds on existing vocabulary

### **Vocab Extraction** (`extractTerms`)

The AI receives teamTerms and:
- Skips terms already in teamTerms
- Finds gaps in current vocabulary
- Suggests complementary terms

### **PRD Generation** (`generateContent`)

The AI receives teamTerms and:
- Uses consistent definitions throughout
- Links to defined terms
- Maintains vocabulary standards

---

## Example Session Flow

### **Session 1: E-commerce Feature**

**User defines:** "Shopping cart abandonment recovery"

**AI generates vocab:**
- Shopping cart
- Abandonment
- Recovery email
- Conversion rate

**User approves all 4**

**localStorage after Session 1:**
```json
{
  "shopping cart": "...",
  "abandonment": "...",
  "recovery email": "...",
  "conversion rate": "..."
}
```

---

### **Session 2: Checkout Flow**

**User defines:** "One-click checkout optimization"

**AI receives 4 existing terms:**
- Knows "shopping cart" exists
- Knows "conversion rate" exists

**AI generates complementary vocab:**
- One-click checkout (new)
- Payment gateway (new)
- Checkout friction (new)
- Drop-off rate (new, complements "conversion rate")

**User approves all 4 new terms**

**localStorage after Session 2:**
```json
{
  "shopping cart": "...",
  "abandonment": "...",
  "recovery email": "...",
  "conversion rate": "...",
  "one-click checkout": "...",
  "payment gateway": "...",
  "checkout friction": "...",
  "drop-off rate": "..."
}
```

---

## Monitoring & Debugging

### **Console Logs:**

```typescript
// During vocab generation
[BatchPRD] Using 8 existing team terms for smart vocab generation

// After approval
[BatchPRD] Saved 4 new terms to localStorage

// Total vocabulary size
const teamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}');
console.log(`Total vocabulary: ${Object.keys(teamTerms).length} terms`);
```

---

## Future Enhancements

### **Potential Improvements:**

1. **Vocabulary Analytics**
   - Track which terms are used most
   - Identify vocabulary gaps
   - Suggest related terms

2. **Term Versioning**
   - Track when terms were added
   - Allow updating definitions
   - Maintain history

3. **Team Sync**
   - Share vocabulary across team members
   - Collaborative glossary building
   - Team-wide consistency

4. **Export/Import**
   - Export vocabulary to CSV
   - Import existing glossaries
   - Share across tools

---

## Summary

✅ **Approved terms saved to localStorage**
✅ **Existing terms inform vocab generation**
✅ **Vocabulary grows incrementally**
✅ **AI gets smarter each session**
✅ **Team-specific language learned**
✅ **Consistency across all PRDs**

The learning loop creates a **compound effect** where each session makes future sessions faster and smarter.
