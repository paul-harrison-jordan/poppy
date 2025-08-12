import { LLMAgent } from './LLMAgent';
import { WebSearchService } from '@/services/webSearchService';

export interface HelpDocsInsight {
  feature: string;
  description: string;
  customerBenefit: string;
  implementationHints: string;
  confidence: number;
}

export interface HelpDocsAnalysisResult {
  insights: HelpDocsInsight[];
  rawSearchResults?: unknown[];
}

export class HelpDocsAnalyzer extends LLMAgent {
  constructor() {
    super(
      'HelpDocsAnalyzer',
      'Analyze competitor help documentation to extract feature insights',
      'gpt-4o',
      1200,
      `You are analyzing help documentation from a competitor's website. Based on the search results provided, extract insights about their features and how they communicate value to customers.

Search Results:
{{searchResults}}

Analyze these results and extract insights about:
1. Key features and capabilities they highlight
2. How they describe the customer benefits
3. The language and terminology they use
4. Implementation or usage patterns they recommend
5. Value propositions they emphasize

For each major feature or capability you identify, provide:
- feature: The name of the feature/capability
- description: How they describe what it does
- customerBenefit: The specific value/benefit they claim for customers
- implementationHints: Any hints about how it works or should be used
- confidence: Your confidence in this insight (0-1)

Focus on concrete features rather than generic marketing language. Extract actionable intelligence about what they offer and how they position it.

Return JSON: { 
  insights: [
    {
      feature: string,
      description: string, 
      customerBenefit: string,
      implementationHints: string,
      confidence: number
    }
  ]
}`,
      false,
      { type: 'analysis', criticality: 0.9, contextSize: 3000 }
    );
  }

  async analyzeHelpDocs(params: {
    url: string;
    searchQueries: string[];
    competitor: string;
  }): Promise<HelpDocsAnalysisResult> {
    try {
      // Use the web search service to fetch and analyze help docs
      const searchService = new WebSearchService();
      
      // Perform targeted searches on the help documentation
      const searchResults = await searchService.searchHelpDocs(params.url, params.searchQueries);
      
      // Analyze the search results to extract insights
      const analysisResult = await searchService.analyzeSearchResults(searchResults, params.competitor);
      
      return analysisResult as HelpDocsAnalysisResult;
    } catch (error) {
      console.error(`[${this.name}] Failed to analyze help docs:`, error);
      return { insights: [] };
    }
  }


  protected parseResponse(response: string): HelpDocsAnalysisResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      if (!parsed.insights || !Array.isArray(parsed.insights)) {
        console.warn(`[${this.name}] Invalid response structure, returning empty insights`);
        return { insights: [] };
      }

      const validInsights = parsed.insights
        .filter((insight: unknown): insight is HelpDocsInsight => 
          insight !== null &&
          typeof insight === 'object' &&
          'feature' in insight &&
          'description' in insight &&
          'customerBenefit' in insight &&
          'implementationHints' in insight &&
          'confidence' in insight &&
          typeof (insight as HelpDocsInsight).feature === 'string' &&
          typeof (insight as HelpDocsInsight).description === 'string' &&
          typeof (insight as HelpDocsInsight).customerBenefit === 'string' &&
          typeof (insight as HelpDocsInsight).implementationHints === 'string' &&
          typeof (insight as HelpDocsInsight).confidence === 'number' &&
          (insight as HelpDocsInsight).feature.trim().length > 0
        );

      return { insights: validInsights };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      return { insights: [] };
    }
  }
}