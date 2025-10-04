import { openai } from '@/lib/openai';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface WebResearchResult {
  query: string;
  results: WebSearchResult[];
  synthesizedContent: string;
}

/**
 * Perform web search using the WebSearch tool via API
 */
async function performWebSearch(query: string): Promise<WebSearchResult[]> {
  try {
    console.log(`[WebResearch] Searching web for: "${query}"`);

    const response = await fetch('/api/web-research/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      console.error(`[WebResearch] Search failed: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[WebResearch] Error performing web search:', error);
    return [];
  }
}

/**
 * Fetch and extract content from a URL using WebFetch
 */
async function fetchUrlContent(url: string, prompt: string): Promise<string> {
  try {
    console.log(`[WebResearch] Fetching content from: ${url}`);

    const response = await fetch('/api/web-research/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, prompt })
    });

    if (!response.ok) {
      console.error(`[WebResearch] Fetch failed for ${url}: ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    return data.content || '';
  } catch (error) {
    console.error(`[WebResearch] Error fetching ${url}:`, error);
    return '';
  }
}

/**
 * Research a term by searching and fetching content from top results
 */
export async function researchTerm(term: string): Promise<WebResearchResult> {
  const query = `${term} definition e-commerce technical meaning`;
  console.log(`[WebResearch] Researching term: "${term}"`);

  // Perform web search
  const searchResults = await performWebSearch(query);

  // Fetch content from top 3 results
  const topResults = searchResults.slice(0, 3);
  const contentPromises = topResults.map(async (result) => {
    const content = await fetchUrlContent(
      result.url,
      `Extract the definition and key information about "${term}" from this page. Focus on technical and e-commerce context.`
    );
    return { ...result, content };
  });

  const resultsWithContent = await Promise.all(contentPromises);

  // Synthesize the content
  const synthesizedContent = await synthesizeContent(
    term,
    resultsWithContent,
    'definition'
  );

  return {
    query,
    results: resultsWithContent,
    synthesizedContent
  };
}

/**
 * Research a question by searching and fetching content from case studies
 */
export async function researchQuestion(
  question: string,
  featureName: string,
  jtbd: string
): Promise<WebResearchResult> {
  const query = `${question} ${featureName} case study business strategy best practices`;
  console.log(`[WebResearch] Researching question: "${question}"`);

  // Perform web search
  const searchResults = await performWebSearch(query);

  // Fetch content from top 3 results
  const topResults = searchResults.slice(0, 3);
  const contentPromises = topResults.map(async (result) => {
    const content = await fetchUrlContent(
      result.url,
      `Extract information about: ${question}. Focus on business case studies, strategic context, and real-world examples related to ${featureName}.`
    );
    return { ...result, content };
  });

  const resultsWithContent = await Promise.all(contentPromises);

  // Synthesize the content
  const synthesizedContent = await synthesizeContent(
    question,
    resultsWithContent,
    'question',
    { featureName, jtbd }
  );

  return {
    query,
    results: resultsWithContent,
    synthesizedContent
  };
}

/**
 * Synthesize fetched content into a coherent summary using AI
 */
async function synthesizeContent(
  topic: string,
  results: WebSearchResult[],
  type: 'definition' | 'question',
  context?: { featureName?: string; jtbd?: string }
): Promise<string> {
  try {
    console.log(`[WebResearch] Synthesizing content for: "${topic}"`);

    const contentBlocks = results
      .filter(r => r.content && r.content.length > 0)
      .map(r => `Source: ${r.title} (${r.url})\n${r.content}`)
      .join('\n\n---\n\n');

    if (!contentBlocks) {
      console.warn('[WebResearch] No content to synthesize');
      return '';
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'definition') {
      systemPrompt = `You are a technical terminology expert synthesizing web research into clear definitions.
Focus on technical accuracy and relevance to e-commerce and product development.`;
      userPrompt = `Synthesize the following web research about "${topic}" into a clear, concise definition (2-3 sentences):

${contentBlocks}

Provide a technical definition suitable for a PRD vocabulary section.`;
    } else {
      systemPrompt = `You are a product strategy expert synthesizing web research into actionable insights.
Focus on business context, strategic considerations, and real-world applications.`;
      userPrompt = `Synthesize the following web research to answer: "${topic}"

Context:
Feature: ${context?.featureName || 'Unknown'}
JTBD: ${context?.jtbd || 'Unknown'}

Research content:
${contentBlocks}

Provide:
1. A clear, actionable answer (2-3 sentences)
2. Business reasoning and strategic considerations (2-3 sentences)

Keep your response focused and practical.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[WebResearch] Error synthesizing content:', error);
    return '';
  }
}

/**
 * Calculate confidence score based on research quality
 */
export function calculateResearchConfidence(results: WebSearchResult[]): number {
  if (results.length === 0) return 0;

  const resultsWithContent = results.filter(r => r.content && r.content.length > 50);
  const contentRatio = resultsWithContent.length / results.length;

  // Base confidence on amount of content retrieved
  let confidence = contentRatio * 0.7; // Max 0.7 from content ratio

  // Bonus for authoritative sources
  const hasAuthoritativeSources = results.some(r =>
    r.url.includes('.edu') ||
    r.url.includes('.gov') ||
    r.url.includes('wikipedia.org') ||
    r.url.includes('techcrunch.com') ||
    r.url.includes('hbr.org') ||
    r.url.includes('medium.com')
  );

  if (hasAuthoritativeSources) {
    confidence += 0.2;
  }

  // Bonus for multiple sources
  if (resultsWithContent.length >= 3) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}
