import { openai } from '@/lib/openai';
import { WebSearchService } from '@/lib/integrations/WebSearchService';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

// Initialize the web search service
const webSearchService = new WebSearchService();

/**
 * Perform actual web search using Google Search API
 */
export async function performWebSearch(query: string): Promise<SearchResult[]> {
  console.log(`[RealWebResearch] Performing web search for: "${query}"`);

  try {
    const response = await webSearchService.search({
      query,
      maxResults: 5
    });

    const results: SearchResult[] = response.results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet
    }));

    console.log(`[RealWebResearch] Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.error('[RealWebResearch] Error performing search:', error);
    return [];
  }
}

/**
 * Fetch and extract content from a URL
 */
export async function fetchWebContent(url: string, prompt: string): Promise<string> {
  console.log(`[RealWebResearch] Fetching content from: ${url}`);

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoppyBot/1.0; +https://poppy.com/bot)'
      }
    });

    if (!response.ok) {
      console.error(`[RealWebResearch] Failed to fetch ${url}: ${response.status}`);
      return '';
    }

    const html = await response.text();

    // Use OpenAI to extract relevant content from HTML
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a web content extraction assistant. Extract the main text content from HTML, focusing on the most relevant information.
Remove navigation, ads, footers, and boilerplate. Focus on article text, documentation, and informative content.
Provide a concise summary of 2-4 paragraphs.`
        },
        {
          role: 'user',
          content: `HTML from ${url}:

${html.substring(0, 15000)}

Context: ${prompt}

Extract the relevant content focusing on the context above. Be concise and factual.`
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log(`[RealWebResearch] Extracted ${content.length} characters of content`);
    return content;
  } catch (error) {
    console.error(`[RealWebResearch] Error fetching content from ${url}:`, error);
    return '';
  }
}

/**
 * Research a term by searching and fetching content
 */
export async function researchTerm(term: string): Promise<{
  term: string;
  searchResults: SearchResult[];
}> {
  const query = `${term} definition technical meaning e-commerce product management`;
  console.log(`[RealWebResearch] Researching term: "${term}"`);

  // Perform web search
  const searchResults = await performWebSearch(query);

  // Fetch content from top 2 results in parallel
  const topResults = searchResults.slice(0, 2);
  const contentPromises = topResults.map(async (result) => {
    const content = await fetchWebContent(
      result.url,
      `Extract the definition and key information about "${term}". Focus on technical context, use cases, and relevance to product management and e-commerce.`
    );
    return { ...result, content };
  });

  const resultsWithContent = await Promise.all(contentPromises);

  // Merge back with remaining results
  const finalResults = [
    ...resultsWithContent,
    ...searchResults.slice(2)
  ];

  console.log(`[RealWebResearch] Researched "${term}": ${finalResults.filter(r => r.content).length} pages with content`);

  return {
    term,
    searchResults: finalResults
  };
}

/**
 * Research a question by searching for case studies and best practices
 */
export async function researchQuestion(
  question: string,
  featureName: string,
  jtbd: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<{
  question: string;
  searchResults: SearchResult[];
}> {
  const query = `${question} ${featureName} case study business strategy best practices`;
  console.log(`[RealWebResearch] Researching question: "${question}"`);

  // Perform web search
  const searchResults = await performWebSearch(query);

  // Fetch content from top 2 results in parallel
  const topResults = searchResults.slice(0, 2);
  const contentPromises = topResults.map(async (result) => {
    const content = await fetchWebContent(
      result.url,
      `Extract information about: ${question}. Focus on business case studies, strategic context, real-world examples, and how this relates to ${featureName}.`
    );
    return { ...result, content };
  });

  const resultsWithContent = await Promise.all(contentPromises);

  // Merge back with remaining results
  const finalResults = [
    ...resultsWithContent,
    ...searchResults.slice(2)
  ];

  console.log(`[RealWebResearch] Researched question: ${finalResults.filter(r => r.content).length} pages with content`);

  return {
    question,
    searchResults: finalResults
  };
}

/**
 * Synthesize content from multiple sources into a definition
 */
export async function synthesizeTermDefinition(
  term: string,
  searchResults: SearchResult[]
): Promise<string> {
  const sources = searchResults
    .filter(r => r.content && r.content.length > 50)
    .map(r => `Source: ${r.title} (${r.url})\n${r.content}`)
    .join('\n\n---\n\n');

  if (!sources) {
    return `${term} - Definition not available from web research.`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a technical terminology expert. Synthesize information from multiple web sources to create a clear, concise definition.
Focus on technical accuracy and relevance to e-commerce and product management.
Generate a 2-3 sentence definition suitable for a PRD vocabulary section.`
      },
      {
        role: 'user',
        content: `Define "${term}" by synthesizing these web sources:\n\n${sources}`
      }
    ],
    temperature: 0.3,
    max_tokens: 250
  });

  return completion.choices[0]?.message?.content || `${term} - Definition could not be generated.`;
}

/**
 * Synthesize content from multiple sources into an answer + reasoning
 */
export async function synthesizeQuestionAnswer(
  question: string,
  featureName: string,
  jtbd: string,
  searchResults: SearchResult[]
): Promise<{ answer: string; reasoning: string }> {
  const sources = searchResults
    .filter(r => r.content && r.content.length > 50)
    .map(r => `Source: ${r.title} (${r.url})\n${r.content}`)
    .join('\n\n---\n\n');

  if (!sources) {
    return {
      answer: 'Answer not available from web research.',
      reasoning: 'No relevant sources found.'
    };
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a product strategy expert. Synthesize information from web sources to answer PRD questions.
Focus on business context, strategic considerations, and real-world applications.
Provide both an answer and reasoning.`
      },
      {
        role: 'user',
        content: `Feature: ${featureName}
JTBD: ${jtbd}

Question: ${question}

Web sources:
${sources}

Provide:
1. A clear, actionable answer (2-3 sentences)
2. Reasoning explaining business context and strategy (2-3 sentences)

Format as JSON: {"answer": "...", "reasoning": "..."}`
      }
    ],
    temperature: 0.4,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return {
    answer: parsed.answer || 'Answer could not be generated.',
    reasoning: parsed.reasoning || 'Reasoning not available.'
  };
}
