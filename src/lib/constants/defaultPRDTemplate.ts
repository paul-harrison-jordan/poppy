export const DEFAULT_ANNOTATED_PRD = `# Example PRD: Enhanced Search Functionality

## Context & Annotations

*[This is an annotated PRD template that shows best practices. Annotations are in italics.]*

### Problem Statement

*[Start with a clear problem statement that explains the user pain point]*

Users are struggling to find relevant products in our marketplace. Current search returns too many irrelevant results, leading to:
- 65% of searches ending without a purchase
- Average of 3.2 search attempts before finding desired items
- 23% increase in support tickets about "can't find what I'm looking for"

*[Include specific metrics to demonstrate the problem's impact]*

### User Stories & Jobs to be Done

*[JTBD format is critical - always include the situation, motivation, and expected outcome]*

**Primary JTBD:**
When I'm shopping for a specific product category, I want to quickly filter results by attributes that matter to me, so that I can find products that meet my exact needs without scrolling through hundreds of irrelevant items.

Today, I cannot effectively narrow down search results because:
- Filters are limited to price and brand only
- No way to search by product specifications
- Search doesn't understand synonyms or related terms

This is suboptimal because it wastes user time and creates frustration that leads to cart abandonment.

*[Always include the "today I cannot" and "this is suboptimal because" parts - they clarify the gap]*

### Success Metrics

*[Be specific about how you'll measure success]*

**Primary Metrics:**
- Search-to-purchase conversion rate: Increase from 35% to 50%
- Average searches per session: Reduce from 3.2 to 1.8
- Search result relevance score: Improve from 62% to 85%

**Secondary Metrics:**
- Time to first meaningful result: < 2 seconds
- Filter usage rate: Increase from 23% to 60%
- Search-related support tickets: Reduce by 40%

### Solution Overview

*[Describe the solution at a high level before diving into details]*

Implement an intelligent search system with:
1. **Advanced Filtering**: Dynamic filters based on product category
2. **Smart Query Understanding**: NLP to handle synonyms and typos
3. **Personalized Ranking**: ML-based result ordering using user behavior
4. **Visual Search**: Image-based search for applicable categories

### Detailed Requirements

*[Break down features into specific, implementable requirements]*

#### 1. Advanced Filtering System

**Functional Requirements:**
- Dynamic filter generation based on product category metadata
- Multi-select filters with AND/OR logic
- Real-time result count updates as filters are applied
- Save filter combinations for future use

**Technical Constraints:**
- Must not increase page load time by more than 200ms
- Filters must work with existing product catalog structure
- Support for 10M+ products across 500+ categories

*[Include both functional needs and technical constraints]*

#### 2. Query Understanding

**Core Capabilities:**
- Synonym mapping (e.g., "sneakers" → "running shoes", "trainers")
- Typo tolerance (up to 2 character errors)
- Intent detection (navigational vs. transactional queries)
- Support for natural language queries ("red Nike shoes under $100")

*[Be specific about capabilities while leaving implementation details to engineering]*

### User Experience

*[Include mockups or detailed descriptions of the UX flow]*

1. User enters search query
2. Results appear with intelligent ranking
3. Dynamic filters appear on left side, relevant to search context
4. User can refine using filters with live result updates
5. Applied filters show as chips for easy removal
6. Search query and filters can be saved for future use

*[Describe the happy path user flow]*

### Rollout Strategy

*[Always include a rollout plan to minimize risk]*

**Phase 1 (Weeks 1-2):** 
- Deploy to 5% of users
- Monitor performance metrics and system load
- A/B test against current search

**Phase 2 (Weeks 3-4):**
- Expand to 25% of users
- Implement feedback from Phase 1
- Begin training ML models on larger dataset

**Phase 3 (Weeks 5-6):**
- Full rollout to 100% of users
- Enable advanced features (visual search, saved searches)
- Deprecate old search system

### Risks & Mitigations

*[Proactively identify risks and how to address them]*

**Risk**: Increased server load from complex queries
**Mitigation**: Implement caching layer and query optimization

**Risk**: Users confused by new interface
**Mitigation**: Gradual rollout with in-app tutorials and tooltips

**Risk**: ML model bias in results
**Mitigation**: Regular bias testing and diverse training data

### Open Questions

*[List questions that need answers before or during implementation]*

1. Should we integrate with third-party search providers or build in-house?
2. How do we handle multi-language search queries?
3. What's the budget for ML infrastructure?

### Dependencies

*[Clearly state what this project depends on]*

- Product catalog team: Standardized attribute data
- Infrastructure team: Elasticsearch cluster upgrade
- Data team: User behavior data pipeline
- Design team: Updated search UI components

---

*[Key principles demonstrated in this PRD:]*
*- Start with clear problem and metrics*
*- Use JTBD format with situation/motivation/outcome*
*- Include specific success criteria*
*- Balance detail with flexibility for engineering*
*- Think about rollout and risk mitigation*
*- Identify dependencies and open questions*`;

export const DEFAULT_PRD_CONTEXT = {
  examplesOfHowYouThink: DEFAULT_ANNOTATED_PRD,
  isSystemDefault: true,
};