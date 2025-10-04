import { ProposedTerm, ProposedQuestionAnswer } from '@/types/knowledge';
import {
  researchTerm,
  researchQuestion,
  synthesizeTermDefinition,
  synthesizeQuestionAnswer
} from './realWebResearch';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface TermSearchResult {
  term: string;
  results: SearchResult[];
}

export interface QuestionSearchResult {
  question: string;
  results: SearchResult[];
}

/**
 * Search for technical term definitions using real web research
 */
export async function searchTermDefinition(term: string): Promise<TermSearchResult> {
  try {
    console.log(`[GoogleSearch] Researching term: "${term}"`);

    // Use real web research
    const { term: researchedTerm, searchResults } = await researchTerm(term);

    console.log(`[GoogleSearch] Found ${searchResults.length} results, ${searchResults.filter(r => r.content).length} with content for "${term}"`);

    return {
      term: researchedTerm,
      results: searchResults
    };
  } catch (error) {
    console.error(`[GoogleSearch] Error searching for term "${term}":`, error);
    return { term, results: [] };
  }
}

/**
 * Search for business case studies to answer PRD questions using real web research
 */
export async function searchQuestionAnswer(
  question: string,
  featureName: string,
  jtbd: string
): Promise<QuestionSearchResult> {
  try {
    console.log(`[GoogleSearch] Researching question: "${question}"`);

    // Use real web research
    const { question: researchedQuestion, searchResults } = await researchQuestion(
      question,
      featureName,
      jtbd
    );

    console.log(`[GoogleSearch] Found ${searchResults.length} results, ${searchResults.filter(r => r.content).length} with content for question`);

    return {
      question: researchedQuestion,
      results: searchResults
    };
  } catch (error) {
    console.error(`[GoogleSearch] Error searching for question "${question}":`, error);
    return { question, results: [] };
  }
}

/**
 * Calculate confidence score based on search results quality
 */
export function calculateConfidence(results: SearchResult[]): number {
  if (results.length === 0) return 0;

  const resultsWithContent = results.filter(r => r.content && r.content.length > 50);
  const contentRatio = resultsWithContent.length / Math.max(results.length, 1);

  // Base confidence on amount of content retrieved (max 0.7)
  let confidence = contentRatio * 0.7;

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

  // Bonus for multiple sources with content
  if (resultsWithContent.length >= 2) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Generate proposed term definition from web research results
 */
export async function generateTermDefinition(
  term: string,
  searchResults: SearchResult[]
): Promise<ProposedTerm> {
  try {
    console.log(`[GoogleSearch] Synthesizing definition for term: "${term}"`);

    // Use real web research to synthesize definition
    const definition = await synthesizeTermDefinition(term, searchResults);
    const confidence = calculateConfidence(searchResults);

    const sourcesWithContent = searchResults.filter(r => r.content).length;
    const sourceDescription = sourcesWithContent > 0
      ? `Web Research (${sourcesWithContent} pages analyzed)`
      : `Web Search (${searchResults.length} results)`;

    return {
      term,
      definition,
      source: sourceDescription,
      confidence,
      approved: false,
      edited: false
    };
  } catch (error) {
    console.error(`[GoogleSearch] Error generating definition for "${term}":`, error);
    return {
      term,
      definition: `Error: Unable to generate definition for "${term}"`,
      source: 'Error',
      confidence: 0,
      approved: false,
      edited: false
    };
  }
}

/**
 * Generate proposed question answer from web research results
 */
export async function generateQuestionAnswer(
  question: string,
  searchResults: SearchResult[],
  featureName: string,
  jtbd: string
): Promise<ProposedQuestionAnswer> {
  try {
    console.log(`[GoogleSearch] Synthesizing answer for question: "${question}"`);

    // Use real web research to synthesize answer
    const { answer, reasoning } = await synthesizeQuestionAnswer(
      question,
      featureName,
      jtbd,
      searchResults
    );

    const confidence = calculateConfidence(searchResults);
    const sourcesWithContent = searchResults.filter(r => r.content);

    return {
      question,
      answer,
      reasoning,
      sources: sourcesWithContent.length > 0
        ? sourcesWithContent.slice(0, 3).map(r => r.url)
        : searchResults.slice(0, 3).map(r => r.url),
      confidence,
      approved: false,
      edited: false
    };
  } catch (error) {
    console.error(`[GoogleSearch] Error generating answer for "${question}":`, error);
    return {
      question,
      answer: `Error: Unable to generate answer for "${question}"`,
      reasoning: 'Search or generation failed',
      sources: [],
      confidence: 0,
      approved: false,
      edited: false
    };
  }
}
