import { LLMAgent } from './LLMAgent';
import { WebSearchService } from '@/lib/integrations/WebSearchService';
import { embedChunks } from '@/app/embed';
import { getUserVectorStore, searchVectorStore } from '@/lib/openai-vector';

export interface Competitor {
  name: string;
  summary: string;
  ourEdge: string;
  sourceUrl?: string;
  features?: string[];
  relevantArticles?: Array<{
    title: string;
    url: string;
  }>;
}

export interface CompetitiveLandscapeResult {
  competitors: Competitor[];
  searchedUrls?: string[];
  analysis?: string;
  summary?: string;
}

export class CompetitiveLandscaperAgent extends LLMAgent {
  private webSearchService: WebSearchService;

  constructor() {
    super(
      'CompetitiveLandscaperAgent',
      'Analyze competitive landscape using actual help documentation',
      'gpt-4o',
      1500,
      `Based on the jobs-to-be-done and actual competitor help documentation, analyze how competitors solve these problems and suggest differentiation opportunities.

Jobs-to-be-done: {{jobs}}

Competitor Documentation Analysis:
{{competitorAnalysis}}

For each competitor analyzed, provide:
- name: The competitor's name
- summary: How they solve the jobs-to-be-done based on their actual documentation
- ourEdge: How we can differentiate from their approach
- features: Key features they highlight (array of strings)

Focus on:
1. Specific features and capabilities mentioned in their docs
2. The language they use to describe value
3. Implementation patterns they recommend
4. Gaps or opportunities they don't address

Return JSON: { 
  competitors: [ 
    {
      name: string, 
      summary: string, 
      ourEdge: string,
      sourceUrl: string,
      features: string[]
    } 
  ] 
}`,
      false,
      { type: 'analysis', criticality: 0.9, contextSize: 3000 }
    );
    this.webSearchService = new WebSearchService();
  }

  async analyzeWithHelpDocs(
    jobs: string,
    competitorUrls: string[],
    productContext?: {
      userPersona?: string;
      productArea?: string;
      businessGoals?: string;
      technicalConstraints?: string;
      existingFeatures?: string[];
    },
    username?: string
  ): Promise<CompetitiveLandscapeResult> {
    try {
      // Retrieve relevant context from Pinecone for enhanced search queries
      let contextualInsights: string[] = [];
      if (username) {
        try {
          const contextualContext = await this.retrieveContextualInsights(jobs, username, productContext);
          contextualInsights = contextualContext;
        } catch (error) {
          console.warn(`[${this.name}] Failed to retrieve contextual insights, proceeding without:`, error);
        }
      }

      const competitorAnalyses: Array<{
        name: string;
        url: string;
        insights: Array<{
          feature: string;
          description: string;
          customerBenefit: string;
          implementationHints: string;
          confidence: number;
        }>;
        relevantArticles?: Array<{
          title: string;
          url: string;
          snippet: string;
        }>;
      }> = [];
      
      // Analyze each competitor's help docs
      for (const url of competitorUrls) {
        try {
          // Extract competitor name from URL
          const urlObj = new URL(url);
          const competitorName = urlObj.hostname
            .replace(/^(www\.|help\.|docs\.|support\.)/, '')
            .split('.')[0];

          console.log(`[${this.name}] Analyzing competitor: ${competitorName} at ${url}`);

          // Generate search queries based on jobs-to-be-done, product context, and contextual insights
          const searchQueries = await this.generateSearchQueries(jobs, urlObj.hostname, productContext, contextualInsights);
          
          // Search the help docs - only within the specified domain
          const searchResults = await this.webSearchService.searchHelpDocs(url, searchQueries);
          
          if (searchResults.length === 0) {
            console.warn(`[${this.name}] No search results found for ${competitorName} (${url}). This could mean:`);
            console.warn(`- The URL doesn't contain publicly accessible help documentation`);
            console.warn(`- The search terms don't match their documentation structure`);
            console.warn(`- The site may require authentication or have restricted access`);
            
            // Add a placeholder analysis indicating no results found
            competitorAnalyses.push({
              name: competitorName,
              url: url,
              insights: [],
              relevantArticles: [],
              noResultsFound: true
            });
            continue;
          }
          
          // Analyze the results
          const analysis = await this.webSearchService.analyzeSearchResults(searchResults);
          
          console.log(`[${this.name}] Found ${searchResults.length} results for ${competitorName}, generated ${analysis.insights.length} insights`);
          
          competitorAnalyses.push({
            name: competitorName,
            url: url,
            insights: analysis.insights,
            relevantArticles: searchResults.slice(0, 5).map(result => ({
              title: result.title,
              url: result.url,
              snippet: result.snippet
            }))
          });
        } catch (error) {
          console.error(`Failed to analyze ${url}:`, error);
          
          // Add error placeholder
          const urlObj = new URL(url);
          const competitorName = urlObj.hostname
            .replace(/^(www\.|help\.|docs\.|support\.)/, '')
            .split('.')[0];
            
          competitorAnalyses.push({
            name: competitorName,
            url: url,
            insights: [],
            relevantArticles: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }
      }

      // Format the analysis for the LLM, handling cases with no results
      const competitorAnalysisText = competitorAnalyses
        .map(comp => {
          if ('noResultsFound' in comp && comp.noResultsFound) {
            return `${comp.name} (${comp.url}):\nNo public documentation found for the specified queries. Unable to analyze their approach.`;
          }
          if ('error' in comp && comp.error) {
            return `${comp.name} (${comp.url}):\nError occurred during analysis: ${comp.error}`;
          }
          
          const insightsText = comp.insights
            .map(i => `- ${i.feature}: ${i.description} (Benefit: ${i.customerBenefit})`)
            .join('\n');
          return `${comp.name} (${comp.url}):\n${insightsText || 'No specific insights found in available documentation.'}`;
        })
        .join('\n\n');

      // Execute the agent with real competitor data
      const result = await this.execute({
        jobs: jobs,
        competitorAnalysis: competitorAnalysisText
      });

      const parsedResult = result.result as CompetitiveLandscapeResult;
      
      // Add source URLs and relevant articles to the result
      parsedResult.searchedUrls = competitorUrls;
      parsedResult.competitors = parsedResult.competitors.map(comp => {
        const matchingAnalysis = competitorAnalyses.find(
          a => a.name.toLowerCase() === comp.name.toLowerCase()
        );
        if (matchingAnalysis) {
          comp.sourceUrl = matchingAnalysis.url;
          comp.relevantArticles = matchingAnalysis.relevantArticles?.map(article => ({
            title: article.title,
            url: article.url
          }));
        }
        return comp;
      });

      // Generate summary and analysis
      parsedResult.summary = this.generateSummary(parsedResult.competitors, jobs, competitorAnalyses);
      parsedResult.analysis = this.generateAnalysis(competitorAnalyses);

      return parsedResult;
    } catch (error) {
      console.error(`[${this.name}] Failed to analyze with help docs:`, error);
      return { 
        competitors: [], 
        searchedUrls: competitorUrls,
        summary: 'Analysis failed due to technical error',
        analysis: 'Unable to complete competitive analysis at this time'
      };
    }
  }

  private generateSummary(competitors: Competitor[], jobs: string, competitorAnalyses?: Array<{ name: string; noResultsFound?: boolean; error?: string }>): string {
    if (competitors.length === 0) {
      const failedDomains = competitorAnalyses?.filter(comp => 'noResultsFound' in comp || 'error' in comp) || [];
      if (failedDomains.length > 0) {
        const domainNames = failedDomains.map(comp => comp.name).join(', ');
        return `No competitor insights found for "${jobs}". The provided domains (${domainNames}) either don't have publicly accessible help documentation or don't contain information matching your search criteria. Consider trying different competitor help desk URLs (e.g., help.zendesk.com, support.intercom.com) or adjusting your research query.`;
      }
      return `No competitor insights found for "${jobs}". Try providing different help desk URLs or adjusting your research query.`;
    }

    const competitorNames = competitors.map(c => c.name).join(', ');
    const failedCount = competitorAnalyses?.filter(comp => 'noResultsFound' in comp || 'error' in comp).length || 0;
    
    let summary = `Analyzed ${competitors.length} competitors (${competitorNames}) for "${jobs}". Found ${competitors.reduce((sum, c) => sum + (c.features?.length || 0), 0)} key features and differentiators across their help documentation.`;
    
    if (failedCount > 0) {
      summary += ` Note: ${failedCount} competitor site(s) yielded no results - they may not have publicly accessible help documentation or may require different search approaches.`;
    }
    
    return summary;
  }

  private generateAnalysis(
    competitorAnalyses: Array<{
      name: string;
      url: string;
      insights: Array<{
        feature: string;
        description: string;
        customerBenefit: string;
        implementationHints: string;
        confidence: number;
      }>;
    }>
  ): string {
    if (competitorAnalyses.length === 0) {
      return 'No detailed analysis available.';
    }

    const totalInsights = competitorAnalyses.reduce((sum, comp) => sum + comp.insights.length, 0);
    const topFeatures = competitorAnalyses
      .flatMap(comp => comp.insights.map(insight => insight.feature))
      .slice(0, 5);

    return `Found ${totalInsights} specific insights across competitor help documentation. Key areas of focus include: ${topFeatures.join(', ')}. This analysis is based on actual help documentation and feature descriptions from competitor sites.`;
  }

  private async generateSearchQueries(
    jobs: string, 
    domain: string, 
    productContext?: {
      userPersona?: string;
      productArea?: string;
      businessGoals?: string;
      technicalConstraints?: string;
      existingFeatures?: string[];
    },
    contextualInsights?: string[]
  ): Promise<string[]> {
    try {
      // Create a comprehensive context for embedding analysis
      const contextForEmbedding = [
        jobs,
        productContext?.productArea,
        productContext?.userPersona,
        productContext?.businessGoals,
        contextualInsights?.join(' ')
      ].filter(Boolean).join(' ');

      // Generate embedding and use it to create a refined search summary
      const refinedSearchQuery = await this.generateRefinedSearchQuery(contextForEmbedding);
      
      console.log(`[${this.name}] Generated refined search query:`, refinedSearchQuery);
      
      // Create focused search queries based on the refined query
      const baseQueries = [
        // Primary refined query
        `site:${domain} ${refinedSearchQuery}`,
        
        // Variations with common help desk patterns
        `site:${domain} "how to" ${refinedSearchQuery}`,
        `site:${domain} "${refinedSearchQuery}" setup guide`,
        `site:${domain} "${refinedSearchQuery}" best practices`,
        `site:${domain} "${refinedSearchQuery}" tutorial`,
        
        // Feature-specific searches
        `site:${domain} "${refinedSearchQuery}" features`,
        `site:${domain} "${refinedSearchQuery}" integration`,
        `site:${domain} "${refinedSearchQuery}" workflow`,
        
        // Use case and benefits
        `site:${domain} "${refinedSearchQuery}" use cases`,
        `site:${domain} "${refinedSearchQuery}" benefits`,
        
        // Implementation and configuration
        `site:${domain} configure ${refinedSearchQuery}`,
        `site:${domain} implement ${refinedSearchQuery}`,
        
        // Troubleshooting and support
        `site:${domain} troubleshoot ${refinedSearchQuery}`,
        `site:${domain} "${refinedSearchQuery}" FAQ`,
        
        // API and automation
        `site:${domain} "${refinedSearchQuery}" API`,
        `site:${domain} automate ${refinedSearchQuery}`
      ];

      console.log(`[${this.name}] Generated ${baseQueries.length} focused search queries. Sample queries:`, baseQueries.slice(0, 3));
      return baseQueries.slice(0, 16); // Focused set of high-quality queries
    } catch (error) {
      console.error(`[${this.name}] Failed to generate embedding-based queries, falling back to keyword extraction:`, error);
      return this.fallbackToKeywordQueries(jobs, domain, productContext);
    }
  }

  private async generateRefinedSearchQuery(contextText: string): Promise<string> {
    try {
      // Generate embedding for the context
      const embeddings = await embedChunks([contextText]);
      if (!embeddings || embeddings.length === 0) {
        throw new Error('Failed to generate embeddings');
      }

      // Use LLM to create a refined 5-20 word search query based on the context
      const refinementPrompt = `Based on this context about a user's product needs, create a focused 5-20 word search query that would find relevant competitor help documentation. Focus on the core functionality and user goals.

Context: ${contextText}

Create a search query that captures the essential functionality without being too broad or too narrow. Focus on actionable features and user workflows.

Search query:`;

      const result = await this.execute({
        jobs: refinementPrompt,
        competitorAnalysis: '' // Not needed for this specific query generation
      });

      // Extract the search query from the response
      const response = result.result as unknown;
      let refinedQuery = '';
      
      if (typeof response === 'string') {
        refinedQuery = response.trim();
      } else if (response && typeof response === 'object' && 'searchQuery' in response && typeof (response as { searchQuery: string }).searchQuery === 'string') {
        refinedQuery = (response as { searchQuery: string }).searchQuery.trim();
      } else {
        // Fallback: extract key terms from context
        refinedQuery = this.extractKeyTermsForSearch(contextText);
      }

      // Ensure the query is within 5-20 words
      const words = refinedQuery.split(/\s+/).filter(word => word.length > 0);
      if (words.length < 5) {
        // Too short, add common search terms
        refinedQuery = `${refinedQuery} features setup guide workflow`;
      } else if (words.length > 20) {
        // Too long, truncate to first 20 words
        refinedQuery = words.slice(0, 20).join(' ');
      }

      return refinedQuery;
    } catch (error) {
      console.error(`[${this.name}] Failed to generate refined search query:`, error);
      return this.extractKeyTermsForSearch(contextText);
    }
  }

  private extractKeyTermsForSearch(text: string): string {
    // Fallback method to extract key terms when LLM approach fails
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !['their', 'there', 'these', 'those', 'through', 'would', 'could', 'should', 'with', 'have', 'will', 'been', 'from', 'they', 'them', 'this', 'that', 'were', 'are'].includes(word)
      );
    
    // Return the first 8-12 most relevant words
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, Math.min(12, uniqueWords.length)).join(' ');
  }

  private fallbackToKeywordQueries(
    jobs: string, 
    domain: string, 
    productContext?: {
      userPersona?: string;
      productArea?: string;
      businessGoals?: string;
      technicalConstraints?: string;
      existingFeatures?: string[];
    }
  ): string[] {
    // Original keyword-based approach as fallback
    const jobKeywords = this.extractKeywords(jobs);
    const allKeywords = [...jobKeywords];
    
    if (productContext?.productArea) {
      allKeywords.push(...this.extractKeywords(productContext.productArea));
    }
    
    const baseQueries = [
      `site:${domain} ${allKeywords.slice(0, 3).join(' ')}`,
      `site:${domain} "how to" ${allKeywords.slice(0, 2).join(' ')}`,
      `site:${domain} features ${allKeywords.slice(0, 2).join(' ')}`,
      `site:${domain} setup ${allKeywords.slice(0, 2).join(' ')}`,
      `site:${domain} integration ${allKeywords.slice(0, 2).join(' ')}`
    ];

    return baseQueries.slice(0, 10);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !['their', 'there', 'these', 'those', 'through', 'would', 'could', 'should'].includes(word));
    
    // Return unique keywords
    return [...new Set(words)].slice(0, 5);
  }

  private async retrieveContextualInsights(
    jobs: string,
    username: string,
    productContext?: {
      userPersona?: string;
      productArea?: string;
      businessGoals?: string;
      technicalConstraints?: string;
      existingFeatures?: string[];
    }
  ): Promise<string[]> {
    try {
      // Combine jobs and product context for embedding
      const contextQuery = [
        jobs,
        productContext?.productArea,
        productContext?.userPersona,
        productContext?.businessGoals
      ].filter(Boolean).join(' ');

      // Format username for vector store
      const formattedUsername = username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Query user's vector store for relevant context
      const { assistantId, vectorStoreId } = await getUserVectorStore(formattedUsername);
      const results = await searchVectorStore(
        assistantId,
        vectorStoreId,
        contextQuery,
        5
      );

      if (!results || results.length === 0) {
        console.warn(`[${this.name}] No contextual matches found for user ${username}`);
        return [];
      }

      // Extract text from matched context
      const contextualInsights = results
        .map(result => result.content)
        .filter(Boolean) as string[];

      console.log(`[${this.name}] Retrieved ${contextualInsights.length} contextual insights from Pinecone for enhanced search queries`);
      if (contextualInsights.length > 0) {
        console.log(`[${this.name}] Sample contextual insights:`, contextualInsights.slice(0, 2));
      }
      return contextualInsights;

    } catch (error) {
      console.error(`[${this.name}] Failed to retrieve contextual insights:`, error);
      return [];
    }
  }

  protected parseResponse(response: string): CompetitiveLandscapeResult {
    try {
      // Log the raw response for debugging
      console.log(`[${this.name}] Raw response:`, response.substring(0, 500) + (response.length > 500 ? '...' : ''));
      
      // Clean the response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      console.log(`[${this.name}] Cleaned response:`, cleanResponse.substring(0, 300) + (cleanResponse.length > 300 ? '...' : ''));
      
      const parsed = JSON.parse(cleanResponse);
      
      // Validate structure
      if (!parsed.competitors || !Array.isArray(parsed.competitors)) {
        console.warn(`[${this.name}] Invalid response structure, returning empty competitors array`);
        return { competitors: [] };
      }

      // Filter and validate competitors
      const validCompetitors = parsed.competitors
        .filter((competitor: unknown): competitor is Competitor => 
          competitor !== null &&
          typeof competitor === 'object' &&
          'name' in competitor &&
          'summary' in competitor &&
          'ourEdge' in competitor &&
          typeof (competitor as Competitor).name === 'string' && 
          typeof (competitor as Competitor).summary === 'string' && 
          typeof (competitor as Competitor).ourEdge === 'string' &&
          (competitor as Competitor).name.trim().length > 0 &&
          (competitor as Competitor).summary.trim().length > 0 &&
          (competitor as Competitor).ourEdge.trim().length > 0
        );

      return { competitors: validCompetitors };
    } catch (error) {
      console.error(`[${this.name}] Failed to parse JSON response:`, error);
      console.error(`[${this.name}] Response that failed to parse:`, response);
      return { competitors: [] };
    }
  }
}