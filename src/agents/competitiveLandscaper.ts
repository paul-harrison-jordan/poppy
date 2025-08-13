import { LLMAgent } from './LLMAgent';
import { WebSearchService } from '@/services/webSearchService';

export interface Competitor {
  name: string;
  summary: string;
  ourEdge: string;
  sourceUrl?: string;
  features?: string[];
}

export interface CompetitiveLandscapeResult {
  competitors: Competitor[];
  searchedUrls?: string[];
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
    competitorUrls: string[]
  ): Promise<CompetitiveLandscapeResult> {
    try {
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
      }> = [];
      
      // Analyze each competitor's help docs
      for (const url of competitorUrls) {
        try {
          // Extract competitor name from URL
          const urlObj = new URL(url);
          const competitorName = urlObj.hostname
            .replace(/^(www\.|help\.|docs\.|support\.)/, '')
            .split('.')[0];

          // Generate search queries based on jobs-to-be-done
          const searchQueries = this.generateSearchQueries(jobs, urlObj.hostname);
          
          // Search the help docs
          const searchResults = await this.webSearchService.searchHelpDocs(url, searchQueries);
          
          // Analyze the results
          const analysis = await this.webSearchService.analyzeSearchResults(
            searchResults,
            competitorName
          );
          
          competitorAnalyses.push({
            name: competitorName,
            url: url,
            insights: analysis.insights
          });
        } catch (error) {
          console.error(`Failed to analyze ${url}:`, error);
        }
      }

      // Format the analysis for the LLM
      const competitorAnalysisText = competitorAnalyses
        .map(comp => {
          const insightsText = comp.insights
            .map(i => `- ${i.feature}: ${i.description} (Benefit: ${i.customerBenefit})`)
            .join('\n');
          return `${comp.name} (${comp.url}):\n${insightsText}`;
        })
        .join('\n\n');

      // Execute the agent with real competitor data
      const result = await this.execute({
        jobs: jobs,
        competitorAnalysis: competitorAnalysisText
      });

      const parsedResult = result.result as CompetitiveLandscapeResult;
      
      // Add source URLs to the result
      parsedResult.searchedUrls = competitorUrls;
      parsedResult.competitors = parsedResult.competitors.map(comp => {
        const matchingAnalysis = competitorAnalyses.find(
          a => a.name.toLowerCase() === comp.name.toLowerCase()
        );
        if (matchingAnalysis) {
          comp.sourceUrl = matchingAnalysis.url;
        }
        return comp;
      });

      return parsedResult;
    } catch (error) {
      console.error(`[${this.name}] Failed to analyze with help docs:`, error);
      return { competitors: [], searchedUrls: competitorUrls };
    }
  }

  private generateSearchQueries(jobs: string, domain: string): string[] {
    // Extract key terms from jobs-to-be-done
    const jobKeywords = this.extractKeywords(jobs);
    
    const baseQueries = [
      `site:${domain} "how to" ${jobKeywords.slice(0, 2).join(' ')}`,
      `site:${domain} features ${jobKeywords.slice(0, 2).join(' OR ')}`,
      `site:${domain} benefits advantages`,
      `site:${domain} "use cases" ${jobKeywords[0]}`,
      `site:${domain} workflow automation`,
      `site:${domain} integration API`,
      `site:${domain} getting started guide`,
      `site:${domain} best practices`
    ];

    // Add job-specific queries
    jobKeywords.forEach(keyword => {
      baseQueries.push(`site:${domain} "${keyword}"`);
    });

    return baseQueries.slice(0, 10); // Limit to 10 queries
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

  protected parseResponse(response: string): CompetitiveLandscapeResult {
    try {
      const parsed = JSON.parse(response.trim());
      
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
      return { competitors: [] };
    }
  }
}