import { WebSearchService, SearchResult, SearchResponse } from './WebSearchService';
import { openai } from '@/lib/openai';

export interface CompetitorProfile {
  name: string;
  domain: string;
  description: string;
  keyFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  marketPosition: 'leader' | 'challenger' | 'niche' | 'startup';
  relevanceScore: number;
}

export interface MarketIntelligence {
  industry: string;
  keyTrends: string[];
  emergingTechnologies: string[];
  customerNeeds: string[];
  marketGaps: string[];
  competitiveThreats: string[];
  opportunities: string[];
}

export interface FeatureIntelligence {
  feature: string;
  implementations: Array<{
    company: string;
    approach: string;
    userFeedback: string;
    differentiators: string[];
  }>;
  bestPractices: string[];
  commonPitfalls: string[];
  innovationOpportunities: string[];
}

export class SearchAnalysisService {
  private searchService: WebSearchService;

  constructor(searchService?: WebSearchService) {
    this.searchService = searchService || new WebSearchService();
  }

  async analyzeCompetitors(
    companyName: string,
    domain?: string,
    industry?: string
  ): Promise<{
    competitors: CompetitorProfile[];
    analysis: string;
    recommendations: string[];
  }> {
    console.log(`[SearchAnalysisService] Analyzing competitors for ${companyName}`);
    
    // Search for competitors
    const searchResponse = await this.searchService.competitorSearch(companyName, domain);
    
    // Extract competitor information using AI
    const competitors = await this.extractCompetitorProfiles(
      companyName,
      searchResponse,
      industry
    );

    // Generate strategic analysis
    const analysis = await this.generateCompetitiveAnalysis(companyName, competitors);
    const recommendations = await this.generateRecommendations(companyName, competitors);

    return {
      competitors,
      analysis,
      recommendations
    };
  }

  async analyzeMarketTrends(industry: string): Promise<MarketIntelligence> {
    console.log(`[SearchAnalysisService] Analyzing market trends for ${industry}`);
    
    // Search for market trends
    const trendsResponse = await this.searchService.marketTrends(industry);
    
    // Get recent news
    const newsResponse = await this.searchService.newsSearch(`${industry} trends`);
    
    // Combine and analyze
    const combinedResults = [
      ...trendsResponse.results,
      ...newsResponse.results
    ].slice(0, 20);

    return await this.extractMarketIntelligence(industry, combinedResults);
  }

  async analyzeFeature(
    featureName: string,
    context?: string
  ): Promise<FeatureIntelligence> {
    console.log(`[SearchAnalysisService] Analyzing feature: ${featureName}`);
    
    // Search for feature implementations
    const searchResponse = await this.searchService.featureAnalysis(featureName);
    
    return await this.extractFeatureIntelligence(featureName, searchResponse.results, context);
  }

  private async extractCompetitorProfiles(
    companyName: string,
    searchResponse: SearchResponse,
    industry?: string
  ): Promise<CompetitorProfile[]> {
    const prompt = `Analyze these search results about ${companyName} competitors${industry ? ` in the ${industry} industry` : ''}. Extract competitor profiles from the content.

Search Results:
${searchResponse.results.map((result, i) => `
${i + 1}. Title: ${result.title}
   URL: ${result.url}
   Snippet: ${result.snippet}
   Domain: ${result.domain}
`).join('\n')}

Return a JSON array of competitor profiles. Each profile should include:
- name: Company name
- domain: Website domain
- description: Brief description (1-2 sentences)
- keyFeatures: Array of key features/products
- strengths: Array of competitive strengths
- weaknesses: Array of potential weaknesses
- marketPosition: One of "leader", "challenger", "niche", or "startup"
- relevanceScore: Float between 0-1 indicating competitive relevance

Only include actual competitors mentioned in the search results. Focus on direct competitors, not partners or customers.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive intelligence analyst. Extract structured competitor profiles from search results. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"competitors": []}');
      return result.competitors || [];
    } catch (error) {
      console.error('[SearchAnalysisService] Failed to extract competitor profiles:', error);
      return [];
    }
  }

  private async generateCompetitiveAnalysis(
    companyName: string,
    competitors: CompetitorProfile[]
  ): Promise<string> {
    const prompt = `Generate a competitive analysis for ${companyName} based on these competitor profiles:

${JSON.stringify(competitors, null, 2)}

Provide a strategic analysis covering:
1. Competitive landscape overview
2. Key competitive threats
3. Market positioning insights
4. Competitive advantages and gaps
5. Strategic implications

Write in a professional, analytical tone. Focus on actionable insights.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a strategic business analyst specializing in competitive intelligence. Provide clear, actionable competitive analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });

      return response.choices[0]?.message?.content || 'Analysis could not be generated.';
    } catch (error) {
      console.error('[SearchAnalysisService] Failed to generate competitive analysis:', error);
      return 'Error generating competitive analysis.';
    }
  }

  private async generateRecommendations(
    companyName: string,
    competitors: CompetitorProfile[]
  ): Promise<string[]> {
    const prompt = `Based on this competitive analysis for ${companyName}, generate 5-7 strategic recommendations:

Competitors: ${JSON.stringify(competitors.map(c => ({ 
  name: c.name, 
  strengths: c.strengths, 
  weaknesses: c.weaknesses, 
  marketPosition: c.marketPosition 
})), null, 2)}

Each recommendation should be:
- Specific and actionable
- Based on competitive insights
- Strategic (not tactical)
- Focused on competitive advantage

Return as a JSON array of strings.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate strategic recommendations based on competitive analysis. Return JSON array of strings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"recommendations": []}');
      return result.recommendations || [];
    } catch (error) {
      console.error('[SearchAnalysisService] Failed to generate recommendations:', error);
      return ['Unable to generate recommendations at this time.'];
    }
  }

  private async extractMarketIntelligence(
    industry: string,
    searchResults: SearchResult[]
  ): Promise<MarketIntelligence> {
    const prompt = `Analyze these search results about ${industry} market trends and extract market intelligence:

Search Results:
${searchResults.map((result, i) => `
${i + 1}. ${result.title}
   ${result.snippet}
   (${result.domain})
`).join('\n')}

Extract and return JSON with:
- industry: "${industry}"
- keyTrends: Array of major industry trends
- emergingTechnologies: Array of emerging tech/innovations
- customerNeeds: Array of evolving customer needs
- marketGaps: Array of identified market gaps/opportunities
- competitiveThreats: Array of competitive threats
- opportunities: Array of strategic opportunities

Focus on recent developments and actionable insights.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst. Extract structured market intelligence from search results. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1200
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        industry,
        keyTrends: result.keyTrends || [],
        emergingTechnologies: result.emergingTechnologies || [],
        customerNeeds: result.customerNeeds || [],
        marketGaps: result.marketGaps || [],
        competitiveThreats: result.competitiveThreats || [],
        opportunities: result.opportunities || []
      };
    } catch (error) {
      console.error('[SearchAnalysisService] Failed to extract market intelligence:', error);
      return {
        industry,
        keyTrends: [],
        emergingTechnologies: [],
        customerNeeds: [],
        marketGaps: [],
        competitiveThreats: [],
        opportunities: []
      };
    }
  }

  private async extractFeatureIntelligence(
    featureName: string,
    searchResults: SearchResult[],
    context?: string
  ): Promise<FeatureIntelligence> {
    const prompt = `Analyze these search results about "${featureName}" feature implementations${context ? ` in the context of ${context}` : ''}:

Search Results:
${searchResults.map((result, i) => `
${i + 1}. ${result.title}
   ${result.snippet}
   (${result.domain})
`).join('\n')}

Extract feature intelligence and return JSON with:
- feature: "${featureName}"
- implementations: Array of objects with { company, approach, userFeedback, differentiators }
- bestPractices: Array of identified best practices
- commonPitfalls: Array of common implementation pitfalls
- innovationOpportunities: Array of innovation opportunities

Focus on how different companies implement this feature and what works well.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a product research analyst. Extract structured feature intelligence from search results. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1200
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        feature: featureName,
        implementations: result.implementations || [],
        bestPractices: result.bestPractices || [],
        commonPitfalls: result.commonPitfalls || [],
        innovationOpportunities: result.innovationOpportunities || []
      };
    } catch (error) {
      console.error('[SearchAnalysisService] Failed to extract feature intelligence:', error);
      return {
        feature: featureName,
        implementations: [],
        bestPractices: [],
        commonPitfalls: [],
        innovationOpportunities: []
      };
    }
  }

  // Convenience method for comprehensive competitive intelligence
  async generateCompetitiveIntelligence(
    companyName: string,
    industry: string,
    keyFeatures: string[],
    domain?: string
  ): Promise<{
    competitors: CompetitorProfile[];
    marketIntelligence: MarketIntelligence;
    featureAnalysis: Record<string, FeatureIntelligence>;
    strategicInsights: string;
  }> {
    console.log(`[SearchAnalysisService] Generating comprehensive competitive intelligence for ${companyName}`);

    // Run analyses in parallel for efficiency
    const [
      competitorAnalysis,
      marketIntelligence,
      ...featureAnalyses
    ] = await Promise.all([
      this.analyzeCompetitors(companyName, domain, industry),
      this.analyzeMarketTrends(industry),
      ...keyFeatures.map(feature => this.analyzeFeature(feature, industry))
    ]);

    // Combine feature analyses
    const featureAnalysis: Record<string, FeatureIntelligence> = {};
    keyFeatures.forEach((feature, index) => {
      featureAnalysis[feature] = featureAnalyses[index];
    });

    // Generate strategic insights
    const strategicInsights = await this.generateStrategicInsights(
      companyName,
      competitorAnalysis.competitors,
      marketIntelligence,
      featureAnalysis
    );

    return {
      competitors: competitorAnalysis.competitors,
      marketIntelligence,
      featureAnalysis,
      strategicInsights
    };
  }

  private async generateStrategicInsights(
    companyName: string,
    competitors: CompetitorProfile[],
    marketIntelligence: MarketIntelligence,
    featureAnalysis: Record<string, FeatureIntelligence>
  ): Promise<string> {
    const prompt = `Generate strategic insights for ${companyName} based on this comprehensive competitive intelligence:

COMPETITORS:
${JSON.stringify(competitors.map(c => ({ 
  name: c.name, 
  marketPosition: c.marketPosition,
  strengths: c.strengths,
  keyFeatures: c.keyFeatures 
})), null, 2)}

MARKET INTELLIGENCE:
${JSON.stringify({
  keyTrends: marketIntelligence.keyTrends,
  opportunities: marketIntelligence.opportunities,
  threats: marketIntelligence.competitiveThreats
}, null, 2)}

FEATURE ANALYSIS:
${Object.entries(featureAnalysis).map(([feature, analysis]) => `
${feature}:
- Best Practices: ${analysis.bestPractices.join(', ')}
- Innovation Opportunities: ${analysis.innovationOpportunities.join(', ')}
`).join('\n')}

Provide strategic insights covering:
1. Key strategic themes
2. Competitive positioning opportunities  
3. Product development priorities
4. Market entry/expansion strategies
5. Risk mitigation strategies

Focus on actionable, high-level strategic insights.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a senior strategy consultant. Synthesize competitive intelligence into strategic insights for executive decision-making.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      });

      return response.choices[0]?.message?.content || 'Strategic insights could not be generated.';
    } catch (error) {
      console.error('[SearchAnalysisService] Failed to generate strategic insights:', error);
      return 'Error generating strategic insights.';
    }
  }
}