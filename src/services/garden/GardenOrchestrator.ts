import { openai } from '@/lib/openai';
import { getUserVectorStore, uploadDocumentToVectorStore } from '@/lib/openai-vector';
import { performAssistantSearch } from '@/lib/openai-assistants-search';
import { AgentRegistry } from './AgentRegistry';
import type { 
  GardenRequest, 
  AgentUpdate, 
  AgentType,
  ResearchInsight,
  HumanQuestion
} from './types';

interface DeepResearchPhase {
  initialAnalysis: {
    problemSpace: string[];
    keyQuestions: string[];
    requiredContext: string[];
    researchPlan: ResearchTopic[];
  };
  contextRetrieval: {
    relevantDocs: Array<{ content: string; filename: string; score: number; type: string }>;
    previousPRDs: Array<{ content: string; filename: string; score: number; type: string }>;
    teamKnowledge: Array<{ content: string; filename: string; score: number; type: string }>;
  };
  researchFindings: ResearchInsight[];
  synthesizedContext: string;
}

interface ResearchTopic {
  type: 'vectordb' | 'klaviyo' | 'web' | 'competitive' | 'internal';
  query: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  purpose: string;
}

export class GardenOrchestrator {
  /**
   * Enhanced workflow with deep research and vectorDB integration
   */
  static async* streamWorkflow(request: GardenRequest, userEmail?: string): AsyncGenerator<AgentUpdate> {
    const { query, storedContext = '', teamTerms = {}, existingDocument } = request;
    
    // Get user's vector store for personalized search
    let userVectorStore = null;
    if (userEmail) {
      try {
        const username = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
        userVectorStore = await getUserVectorStore(username);
        console.log(`🔍 Using vector store: ${userVectorStore.vectorStoreId} for user: ${username}`);
      } catch (error) {
        console.warn('⚠️ Failed to get user vector store:', error);
      }
    }
    let enhancedContext = storedContext;
    
    const formattedTeamTerms = Object.entries(teamTerms)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    try {
      // Phase 1: Deep Research & Context Gathering (like OpenAI's approach)
      yield { 
        type: 'phase_start', 
        agent: 'orchestrator', 
        content: 'Starting deep research phase...',
        phase: 'research',
        metadata: {
          steps: [
            'Analyzing problem space',
            'Retrieving relevant context',
            'Conducting research',
            'Synthesizing insights'
          ]
        }
      };

      const researchPhase = await this.conductDeepResearch(
        query, 
        enhancedContext, 
        formattedTeamTerms,
        userVectorStore
      );


      // Stream research progress
      for (const finding of researchPhase.researchFindings) {
        yield {
          type: 'research_finding',
          agent: 'research',
          content: finding.summary,
          metadata: {
            source: finding.source,
            confidence: finding.confidence,
            relevance: finding.relevance
          }
        };
      }

      // Update context with research findings
      enhancedContext = researchPhase.synthesizedContext;

      // Phase 2: Intelligent Question Generation
      yield {
        type: 'phase_start',
        agent: 'orchestrator',
        content: 'Analyzing gaps and generating clarifying questions...',
        phase: 'questions'
      };

      const questions = await this.generateIntelligentQuestions(
        query,
        enhancedContext,
        researchPhase
      );

      if (questions.length > 0) {
        yield {
          type: 'needs_human_input',
          agent: 'orchestrator',
          content: 'I\'ve identified some areas where your input would improve the PRD quality',
          questions,
          metadata: {
            optional: true,
            continuesWithout: true
          }
        };
      }

      // Phase 3: Agent Orchestration with Enhanced Context
      yield {
        type: 'phase_start',
        agent: 'orchestrator',
        content: 'Coordinating specialist agents for comprehensive analysis...',
        phase: 'analysis'
      };

      const orchestrationPlan = await this.planIntelligentOrchestration(
        query,
        enhancedContext,
        researchPhase
      );

      // Execute Mixture-of-Agents workflow for enhanced collaboration
      const agentResults = await this.executeMixtureOfAgents(
        orchestrationPlan,
        enhancedContext,
        researchPhase
      );

      for (const result of agentResults) {
        yield {
          type: 'agent_response',
          agent: result.agent,
          content: result.response,
          metadata: {
            tokensUsed: result.tokensUsed,
            confidence: result.confidence
          }
        };
      }

      // Phase 4: Quality Validation & Iteration
      yield {
        type: 'phase_start',
        agent: 'orchestrator',
        content: 'Validating PRD quality and completeness...',
        phase: 'validation'
      };

      const validation = await this.validatePRDQuality(
        agentResults,
        enhancedContext,
        query
      );

      if (validation.gaps.length > 0) {
        // Conduct targeted follow-up research
        const followupResults = await this.conductFollowupResearch(
          validation.gaps,
          enhancedContext
        );
        
        agentResults.push(...followupResults);
      }

      // Phase 5: Document Creation with Quality Assurance
      yield {
        type: 'phase_start',
        agent: 'writing',
        content: 'Creating comprehensive PRD with quality assurance...',
        phase: 'writing'
      };

      const document = await this.createEnhancedDocument(
        query,
        agentResults,
        enhancedContext,
        teamTerms,
        validation,
        existingDocument
      );

      yield {
        type: 'document_complete',
        agent: 'writing',
        content: document.title,
        document,
        metadata: {
          quality_score: validation.qualityScore,
          completeness: validation.completeness,
          sections: Object.keys(document.sections)
        }
      };

      // Store in user's vectorDB for future retrieval
      await this.storeInVectorDB(document, query, enhancedContext, userVectorStore);

    } catch (error) {
      console.error('Garden Orchestrator V2 error:', error);
      yield {
        type: 'error',
        agent: 'orchestrator',
        content: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Conduct deep research phase with vectorDB and multiple sources
   */
  private static async conductDeepResearch(
    query: string,
    storedContext: string,
    formattedTeamTerms: string,
    userVectorStore?: { vectorStoreId: string; assistantId: string } | null
  ): Promise<DeepResearchPhase> {
    console.log('🔬 Starting deep research phase');
    
    // Step 1: Initial analysis to understand what we need
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a research analyst preparing to create a PRD. Analyze the request and determine what information is needed.

Output JSON:
{
  "problem_space": ["key problem areas to explore"],
  "key_questions": ["critical questions that need answers"],
  "required_context": ["types of context needed"],
  "research_plan": [
    {
      "type": "vectordb|klaviyo|web|competitive|internal",
      "query": "specific search query",
      "priority": "critical|high|medium|low",
      "purpose": "why this research is needed"
    }
  ]
}`
        },
        { 
          role: 'user', 
          content: `Request: ${query}\n\nContext: ${storedContext}\n\nTeam Terms: ${formattedTeamTerms}` 
        }
      ],
      response_format: { type: 'json_object' }
    });

    const analysisRaw = JSON.parse(analysisResponse.choices[0].message.content || '{}');
    const analysis = {
      problemSpace: analysisRaw.problem_space || [],
      keyQuestions: analysisRaw.key_questions || [],
      requiredContext: analysisRaw.required_context || [],
      researchPlan: analysisRaw.research_plan || []
    };

    // Step 2: Retrieve from user's OpenAI VectorDB
    const contextRetrieval = await this.retrieveFromUserVectorStore(
      query,
      analysis.requiredContext,
      userVectorStore
    );

    // Step 3: Execute research plan
    const researchFindings = await this.executeResearchPlan(
      analysis.researchPlan,
      contextRetrieval
    );

    // Step 4: Synthesize all findings
    const synthesizedContext = await this.synthesizeResearch(
      storedContext,
      contextRetrieval,
      researchFindings,
      analysis
    );

    return {
      initialAnalysis: analysis,
      contextRetrieval,
      researchFindings,
      synthesizedContext
    };
  }

  // Cache for vector store results - 15 minute TTL
  private static vectorStoreCache = new Map<string, { data: Record<string, Array<{ content: string; filename: string; score: number; type: string }>>; expires: number }>();

  /**
   * Retrieve relevant context from user's OpenAI Vector Store with performance optimizations
   */
  private static async retrieveFromUserVectorStore(
    query: string,
    requiredContext: string[],
    userVectorStore?: { vectorStoreId: string; assistantId: string } | null
  ) {
    const results: Record<string, Array<{ content: string; filename: string; score: number; type: string }>> = {
      relevantDocs: [],
      previousPRDs: [],
      teamKnowledge: []
    };

    try {
      if (!userVectorStore) {
        console.warn('⚠️ No user vector store available - search will be limited');
        return results;
      }

      console.log(`🔍 Searching user's vector store: ${userVectorStore.vectorStoreId}`);

      // Check cache first
      const cacheKey = `${userVectorStore.vectorStoreId}-${query}-${requiredContext.join(',')}`;
      const cached = this.vectorStoreCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        console.log('📦 Using cached vector store results');
        return cached.data;
      }

      // Execute searches in parallel for better performance
      const searchPromises = [
        this.performCachedSearch(
          userVectorStore,
          `PRD related to: ${query}. Previous product requirements, specifications, or planning documents.`,
          8,
          'previousPRDs'
        ),
        this.performCachedSearch(
          userVectorStore,
          `Documents related to: ${query}. Context: ${requiredContext.join(', ')}`,
          12,
          'relevantDocs'
        ),
        this.performCachedSearch(
          userVectorStore,
          `Team knowledge, processes, or context related to: ${query}`,
          6,
          'teamKnowledge'
        )
      ];

      const searchResults = await Promise.allSettled(searchPromises);
      
      // Process results with error handling
      searchResults.forEach((result, index) => {
        const keys = ['previousPRDs', 'relevantDocs', 'teamKnowledge'];
        const key = keys[index];

        if (result.status === 'fulfilled' && result.value) {
          results[key] = this.deduplicateAndRank(result.value);
        } else {
          console.error(`${key} search failed:`, result.status === 'rejected' ? result.reason : 'Unknown error');
          results[key] = [];
        }
      });

      // Cache results for 15 minutes
      this.vectorStoreCache.set(cacheKey, {
        data: results,
        expires: Date.now() + (15 * 60 * 1000)
      });

      console.log(`✅ VectorStore search completed:`, {
        previousPRDs: results.previousPRDs.length,
        relevantDocs: results.relevantDocs.length,
        teamKnowledge: results.teamKnowledge.length
      });

    } catch (error) {
      console.error('VectorStore retrieval error:', error);
    }

    return results;
  }

  /**
   * Perform cached search with retry logic
   */
  private static async performCachedSearch(
    userVectorStore: { vectorStoreId: string; assistantId: string },
    query: string,
    limit: number,
    type: string,
    retries = 2
  ) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const results = await performAssistantSearch(
          userVectorStore.assistantId,
          userVectorStore.vectorStoreId,
          query,
          limit
        );
        
        return results.map(result => ({
          content: result.content,
          filename: result.filename,
          score: result.score,
          type
        }));
      } catch (error) {
        if (attempt === retries) {
          console.error(`${type} search failed after ${retries + 1} attempts:`, error);
          return [];
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return [];
  }

  /**
   * Deduplicate and rank search results by semantic similarity
   */
  private static deduplicateAndRank(results: Array<{ content: string; filename: string; score: number; type: string }>) {
    if (!results.length) return [];

    // Remove near-duplicates based on content similarity
    const deduplicated = [];
    const seenContent = new Set();
    
    for (const result of results) {
      // Create a hash of first 200 chars for deduplication
      const contentHash = result.content?.substring(0, 200).toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        deduplicated.push(result);
      }
    }

    // Sort by score (descending) and limit to top results
    return deduplicated
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, Math.min(deduplicated.length, 6));
  }

  /**
   * Execute comprehensive research plan
   */
  private static async executeResearchPlan(
    researchPlan: ResearchTopic[],
    contextRetrieval: DeepResearchPhase['contextRetrieval']
  ): Promise<ResearchInsight[]> {
    const findings: ResearchInsight[] = [];
    
    // Validate research plan
    if (!researchPlan || !Array.isArray(researchPlan)) {
      console.warn('⚠️ Research plan is invalid or undefined - skipping research execution');
      return findings;
    }
    
    // Prioritize and execute research
    const sortedPlan = researchPlan.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });

    for (const topic of sortedPlan.slice(0, 10)) { // Limit to top 10
      try {
        let result: ResearchInsight;
        
        switch (topic.type) {
          case 'klaviyo':
            result = await this.researchKlaviyo(topic.query, topic.purpose);
            break;
          case 'web':
            result = await this.researchWeb(topic.query, topic.purpose);
            break;
          case 'competitive':
            result = await this.researchCompetitive(topic.query, topic.purpose);
            break;
          case 'internal':
            result = await this.researchInternal(topic.query, contextRetrieval);
            break;
          default:
            continue;
        }
        
        findings.push(result);
      } catch (error) {
        console.error(`Research failed for ${topic.type}:`, error);
      }
    }

    return findings;
  }

  /**
   * Research Klaviyo-specific information using real web search
   */
  private static async researchKlaviyo(query: string, purpose: string): Promise<ResearchInsight> {
    try {
      const { WebSearchService } = await import('@/lib/integrations/WebSearchService');
      const searchService = new WebSearchService();
      
      // Search specifically within Klaviyo help documentation
      const klaviyoResults = await searchService.searchHelpDocs(
        'https://help.klaviyo.com',
        [
          `${query} klaviyo feature`,
          `klaviyo ${query} integration`,
          `${query} best practices klaviyo`
        ]
      );

      if (klaviyoResults && klaviyoResults.length > 0) {
        // Crawl the top 3 most relevant pages for deep analysis
        const topResults = klaviyoResults.slice(0, 3);
        const pageAnalyses = await this.crawlAndAnalyzePages(
          topResults,
          query,
          purpose,
          'klaviyo'
        );

        // Synthesize all page content into key takeaways
        const synthesizedInsights = await this.synthesizePageInsights(
          pageAnalyses,
          query,
          'Klaviyo platform capabilities and best practices'
        );

        return {
          source: 'klaviyo',
          query,
          summary: synthesizedInsights.summary,
          details: {
            sources: topResults.map(r => ({ title: r.title, url: r.url })),
            pageAnalyses,
            keyTakeaways: synthesizedInsights.keyTakeaways,
            prdRecommendations: synthesizedInsights.prdRecommendations
          },
          confidence: 0.9,
          relevance: 0.95,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback if no Klaviyo docs found
      throw new Error('No Klaviyo documentation found');
      
    } catch (error) {
      console.error('Klaviyo research failed:', error);
      
      // Fallback to knowledge-based research
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Klaviyo platform expert. Provide accurate information about Klaviyo features, limitations, and best practices based on your knowledge.' 
          },
          { 
            role: 'user', 
            content: `Research: ${query}\nPurpose: ${purpose}\n\nProvide specific, actionable insights about Klaviyo capabilities related to this query. Include:\n- Feature availability and limitations\n- Integration requirements\n- Best practices\n- Common use cases` 
          }
        ]
      });

      return {
        source: 'klaviyo',
        query,
        summary: response.choices[0].message.content || 'No Klaviyo insights available',
        details: { fallback: true, reason: 'Search service unavailable' },
        confidence: 0.6,
        relevance: 0.8,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Web research for market insights using real web search
   */
  private static async researchWeb(query: string, purpose: string): Promise<ResearchInsight> {
    try {
      const { WebSearchService } = await import('@/lib/integrations/WebSearchService');
      const searchService = new WebSearchService();
      
      // Create focused search query for market trends
      const searchQuery = `${query} market trends analysis competitive landscape best practices 2024`;
      
      const searchResults = await searchService.search({
        query: searchQuery,
        maxResults: 10,
        timeRange: 'month',
        excludeDomains: ['pinterest.com', 'facebook.com', 'twitter.com', 'instagram.com'],
        language: 'en'
      });

      if (searchResults.results && searchResults.results.length > 0) {
        // Crawl the top 4 most relevant pages for deep market insights
        const topResults = searchResults.results.slice(0, 4);
        const pageAnalyses = await this.crawlAndAnalyzePages(
          topResults,
          query,
          purpose,
          'market_research'
        );

        // Synthesize all page content into market insights
        const synthesizedInsights = await this.synthesizePageInsights(
          pageAnalyses,
          query,
          'Market trends, user behavior, and competitive landscape'
        );

        return {
          source: 'web',
          query,
          summary: synthesizedInsights.summary,
          details: { 
            sources: topResults.map(r => ({ title: r.title, url: r.url, domain: r.domain })),
            pageAnalyses,
            keyTakeaways: synthesizedInsights.keyTakeaways,
            prdRecommendations: synthesizedInsights.prdRecommendations,
            searchTime: searchResults.searchTime,
            totalResults: searchResults.totalCount
          },
          confidence: 0.85,
          relevance: 0.95,
          timestamp: new Date().toISOString()
        };
      }
      
      // Fallback if search fails
      throw new Error('No search results found');
      
    } catch (error) {
      console.error('Web research failed:', error);
      
      // Fallback to knowledge-based insights
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a market research analyst. Provide insights based on your training data about current market trends and best practices. Be specific and actionable.' 
          },
          { 
            role: 'user', 
            content: `Research: ${query}\nPurpose: ${purpose}\n\nProvide market insights based on known trends and competitive landscape. Include:
- Current market state and growth trends
- User behavior patterns
- Competitive dynamics
- Technology adoption trends
- Best practices and recommendations` 
          }
        ]
      });

      return {
        source: 'web',
        query,
        summary: response.choices[0].message.content || 'No market insights available',
        details: { fallback: true, reason: 'Search service unavailable' },
        confidence: 0.6,
        relevance: 0.7,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Competitive analysis research using real web data
   */
  private static async researchCompetitive(query: string, purpose: string): Promise<ResearchInsight> {
    try {
      const { WebSearchService } = await import('@/lib/integrations/WebSearchService');
      const searchService = new WebSearchService();
      
      // Search for competitive information with high-quality sources
      const competitorQuery = `${query} competitor analysis alternative solutions market leaders comparison features`;
      
      const searchResults = await searchService.search({
        query: competitorQuery,
        maxResults: 15,
        timeRange: 'year',
        domains: ['g2.com', 'capterra.com', 'trustradius.com', 'producthunt.com', 'crunchbase.com', 'techcrunch.com', 'forbes.com']
      });

      if (searchResults.results && searchResults.results.length > 0) {
        // Crawl the top 5 most relevant competitive pages
        const topResults = searchResults.results.slice(0, 5);
        const pageAnalyses = await this.crawlAndAnalyzePages(
          topResults,
          query,
          purpose,
          'competitive_analysis'
        );

        // Synthesize all page content into competitive insights
        const synthesizedInsights = await this.synthesizePageInsights(
          pageAnalyses,
          query,
          'Competitive positioning, feature differentiation, and market opportunities'
        );

        // Extract competitor names from the detailed analysis
        const competitors = this.extractCompetitorNames(synthesizedInsights.summary);

        return {
          source: 'competitive',
          query,
          summary: synthesizedInsights.summary,
          details: {
            competitors,
            sources: topResults.map(r => ({ title: r.title, url: r.url, domain: r.domain })),
            pageAnalyses,
            keyTakeaways: synthesizedInsights.keyTakeaways,
            prdRecommendations: synthesizedInsights.prdRecommendations,
            searchTime: searchResults.searchTime,
            totalResults: searchResults.totalCount
          },
          confidence: 0.9,
          relevance: 0.95,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback if no search results
      throw new Error('No competitive search results found');
      
    } catch (error) {
      console.error('Competitive research failed:', error);
      
      // Fallback to knowledge-based competitive analysis
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a competitive intelligence analyst. Based on your knowledge, provide competitive insights for product strategy.' 
          },
          { 
            role: 'user', 
            content: `Research: ${query}\nPurpose: ${purpose}\n\nProvide competitive analysis including:
- Key players and market leaders
- Feature comparisons and differentiators
- Market positioning strategies
- Pricing insights
- Market opportunities and gaps
- Recommendations for competitive positioning` 
          }
        ]
      });

      return {
        source: 'competitive',
        query,
        summary: fallbackResponse.choices[0].message.content || 'No competitive insights available',
        details: { fallback: true, reason: 'Search service unavailable' },
        confidence: 0.6,
        relevance: 0.8,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Crawl and analyze individual pages for deep insights
   */
  private static async crawlAndAnalyzePages(
    searchResults: Array<{ title: string; url: string; snippet?: string; domain?: string }>,
    query: string,
    purpose: string,
    analysisType: string
  ) {
    const pageAnalyses = [];
    
    for (const result of searchResults) {
      try {
        console.log(`🕷️  Crawling page: ${result.title}`);
        
        // Fetch full page content using WebFetch tool
        const pageContent = await this.fetchPageContent(result.url, query, purpose, analysisType);
        
        if (pageContent && pageContent.length > 200) {
          // Analyze the full page content for PRD-relevant insights
          const pageInsights = await this.analyzePageForPRD(
            pageContent,
            result.title,
            result.url,
            query,
            purpose,
            analysisType
          );
          
          pageAnalyses.push({
            url: result.url,
            title: result.title,
            domain: result.domain,
            contentLength: pageContent.length,
            insights: pageInsights,
            crawledAt: new Date().toISOString()
          });
        } else {
          console.warn(`⚠️  Insufficient content from ${result.url}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to crawl ${result.url}:`, error);
        
        // Fallback to snippet analysis if page crawling fails
        if (result.snippet) {
          const snippetInsights = await this.analyzeSnippetForPRD(
            result.snippet,
            result.title,
            result.url,
            query,
            analysisType
          );
          
          pageAnalyses.push({
            url: result.url,
            title: result.title,
            domain: result.domain,
            contentLength: result.snippet.length,
            insights: snippetInsights,
            crawledAt: new Date().toISOString(),
            fallbackMode: true
          });
        }
      }
      
      // Add small delay to be respectful to servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`📊 Successfully analyzed ${pageAnalyses.length}/${searchResults.length} pages`);
    return pageAnalyses;
  }

  /**
   * Fetch full page content using WebFetch
   */
  private static async fetchPageContent(
    url: string,
    query: string,
    purpose: string,
    analysisType: string
  ): Promise<string> {
    try {
      // Create focused prompts based on analysis type
      const prompts = {
        klaviyo: `Extract key information from this Klaviyo documentation page about: ${query}
        
        Focus on:
        - Feature capabilities and limitations
        - Integration requirements and setup steps
        - Best practices and recommendations
        - Common use cases and examples
        - API endpoints and configuration options
        
        Provide detailed technical insights that would help create a comprehensive PRD.`,
        
        market_research: `Extract key market insights from this article/page about: ${query}
        
        Focus on:
        - Current market trends and growth patterns
        - User behavior insights and pain points
        - Industry statistics and benchmarks
        - Technology adoption rates
        - Future predictions and opportunities
        
        Highlight specific data points, percentages, and examples that inform product strategy.`,
        
        competitive_analysis: `Extract competitive intelligence from this page about: ${query}
        
        Focus on:
        - Competitor features and capabilities
        - Pricing strategies and models
        - Market positioning and messaging
        - Customer reviews and feedback
        - Strengths and weaknesses identified
        - Feature gaps and opportunities
        
        Provide specific details that help with competitive positioning.`
      };
      
      const prompt = prompts[analysisType as keyof typeof prompts] || prompts.market_research;
      
      // Use the WebFetch tool to get page content
      const response = await fetch('/api/web-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          prompt
        })
      });

      if (!response.ok) {
        throw new Error(`WebFetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data.content || '';
      
    } catch (error) {
      console.error(`Failed to fetch content from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Analyze full page content for PRD-relevant insights
   */
  private static async analyzePageForPRD(
    content: string,
    title: string,
    url: string,
    query: string,
    purpose: string,
    analysisType: string
  ) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a senior product manager analyzing content for PRD creation. Extract actionable insights that directly inform product requirements, feature specifications, and strategic decisions.`
        },
        {
          role: 'user',
          content: `Source: ${title} (${url})
Query: ${query}
Purpose: ${purpose}
Analysis Type: ${analysisType}

Content:
${content.substring(0, 8000)} ${content.length > 8000 ? '...[truncated]' : ''}

Extract specific insights for PRD development:

1. FEATURE INSIGHTS:
   - Specific capabilities and features mentioned
   - Technical requirements or constraints
   - Integration points and dependencies

2. USER INSIGHTS:
   - User behaviors and pain points
   - Use cases and workflows
   - Success metrics and KPIs

3. BUSINESS INSIGHTS:
   - Market opportunities
   - Competitive advantages
   - Revenue/business model implications

4. IMPLEMENTATION INSIGHTS:
   - Technical considerations
   - Resource requirements
   - Timeline implications
   - Risk factors

Format as structured insights with specific details and data points.`
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || 'No insights extracted';
  }

  /**
   * Analyze snippet for PRD insights (fallback)
   */
  private static async analyzeSnippetForPRD(
    snippet: string,
    title: string,
    url: string,
    query: string,
    analysisType: string
  ) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Extract key insights from this snippet for PRD development. Focus on actionable information for product requirements.`
        },
        {
          role: 'user',
          content: `Source: ${title} (${url})
Query: ${query}
Analysis Type: ${analysisType}

Snippet: ${snippet}

Extract key insights that inform:
- Feature requirements
- User needs and behaviors  
- Market positioning
- Technical considerations
- Competitive differentiation`
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || 'No insights extracted';
  }

  /**
   * Synthesize all page insights into key takeaways for PRD
   */
  private static async synthesizePageInsights(
    pageAnalyses: Array<{
      url: string;
      title: string;
      domain?: string;
      contentLength: number;
      insights: string;
      crawledAt: string;
      fallbackMode?: boolean;
    }>,
    query: string,
    focusArea: string
  ) {
    if (!pageAnalyses.length) {
      return {
        summary: 'No page content available for synthesis',
        keyTakeaways: [],
        prdRecommendations: []
      };
    }

    const combinedInsights = pageAnalyses
      .map(analysis => `Source: ${analysis.title}\nInsights: ${analysis.insights}`)
      .join('\n\n---\n\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a senior product manager synthesizing research into actionable PRD insights. Create a comprehensive analysis that directly informs product decisions and requirements.`
        },
        {
          role: 'user', 
          content: `Query: ${query}
Focus Area: ${focusArea}

Research from ${pageAnalyses.length} sources:
${combinedInsights.substring(0, 10000)}${combinedInsights.length > 10000 ? '...[truncated]' : ''}

Synthesize into:

1. EXECUTIVE SUMMARY (2-3 sentences):
Clear, actionable summary of key findings

2. KEY TAKEAWAYS (5-7 bullet points):
- Most important insights for product strategy
- Specific data points and evidence
- Market trends and user behaviors
- Competitive advantages and differentiators

3. PRD RECOMMENDATIONS (5-6 specific items):
- Feature requirements and specifications
- User experience considerations
- Technical implementation guidance
- Success metrics and KPIs
- Risk mitigation strategies
- Go-to-market implications

Focus on specificity and actionability. Include numbers, percentages, and concrete examples where available.`
        }
      ],
      temperature: 0.2
    });

    const fullResponse = response.choices[0].message.content || '';
    
    // Parse the structured response
    const sections = this.parseStructuredResponse(fullResponse);
    
    return {
      summary: sections.executiveSummary || fullResponse.substring(0, 500),
      keyTakeaways: sections.keyTakeaways || [],
      prdRecommendations: sections.prdRecommendations || []
    };
  }

  /**
   * Parse structured response from synthesis
   */
  private static parseStructuredResponse(response: string) {
    const sections = {
      executiveSummary: '',
      keyTakeaways: [] as string[],
      prdRecommendations: [] as string[]
    };

    try {
      // Extract executive summary
      const summaryMatch = response.match(/(?:EXECUTIVE SUMMARY|1\. EXECUTIVE SUMMARY)[:\s]*(.*?)(?=(?:\n\s*(?:2\.|KEY TAKEAWAYS))|$)/is);
      if (summaryMatch) {
        sections.executiveSummary = summaryMatch[1].trim();
      }

      // Extract key takeaways
      const takeawaysMatch = response.match(/(?:KEY TAKEAWAYS|2\. KEY TAKEAWAYS)[:\s]*(.*?)(?=(?:\n\s*(?:3\.|PRD RECOMMENDATIONS))|$)/is);
      if (takeawaysMatch) {
        const takeaways = takeawaysMatch[1]
          .split(/[\n\r]+/)
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 10);
        sections.keyTakeaways = takeaways;
      }

      // Extract PRD recommendations
      const recMatch = response.match(/(?:PRD RECOMMENDATIONS|3\. PRD RECOMMENDATIONS)[:\s]*(.*?)$/is);
      if (recMatch) {
        const recommendations = recMatch[1]
          .split(/[\n\r]+/)
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 10);
        sections.prdRecommendations = recommendations;
      }
      
    } catch (error) {
      console.error('Failed to parse structured response:', error);
    }

    return sections;
  }

  /**
   * Extract competitor names from analysis text
   */
  private static extractCompetitorNames(analysisText: string): string[] {
    const competitors = [];
    
    // Common patterns for competitor mentions
    const patterns = [
      /competitors?:?\s*([^.]+)/gi,
      /alternatives?:?\s*([^.]+)/gi,
      /players?:?\s*([^.]+)/gi,
      /solutions?:?\s*([^.]+)/gi
    ];

    for (const pattern of patterns) {
      const matches = analysisText.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Extract potential company names (capitalize words)
          const names = match.split(/[,\s]+/)
            .filter(word => word.length > 2 && /^[A-Z]/.test(word))
            .slice(0, 5); // Limit to 5 competitors
          competitors.push(...names);
        }
      }
    }

    // Remove duplicates and return
    return [...new Set(competitors)].slice(0, 6);
  }

  /**
   * Internal knowledge research
   */
  private static async researchInternal(query: string, contextRetrieval: DeepResearchPhase['contextRetrieval']): Promise<ResearchInsight> {
    const relevantContext = [
      ...contextRetrieval.previousPRDs,
      ...contextRetrieval.teamKnowledge
    ].slice(0, 5);

    return {
      source: 'internal',
      query,
      summary: `Found ${relevantContext.length} relevant internal documents`,
      details: { documents: relevantContext },
      confidence: 0.9,
      relevance: 0.95,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Synthesize research with streaming and memory optimization
   */
  private static async* synthesizeResearchStreaming(
    originalContext: string,
    contextRetrieval: DeepResearchPhase['contextRetrieval'],
    researchFindings: ResearchInsight[],
    analysis: DeepResearchPhase['initialAnalysis']
  ): AsyncGenerator<{ chunk: string; isComplete: boolean }> {
    // Chunk the research findings to prevent memory overload
    const maxContextLength = 8000; // Characters
    let currentLength = originalContext.length;
    const includedFindings = [];
    
    // Select most relevant findings within memory limits
    const sortedFindings = researchFindings
      .sort((a, b) => b.relevance - a.relevance);
    
    for (const finding of sortedFindings) {
      const findingLength = finding.summary.length + 50; // Extra buffer
      if (currentLength + findingLength > maxContextLength) break;
      
      includedFindings.push(finding);
      currentLength += findingLength;
    }

    const synthesisPrompt = `Synthesize the following research into a comprehensive context for PRD creation:

Original Context: ${originalContext.substring(0, 2000)}${originalContext.length > 2000 ? '...' : ''}

Problem Space: ${analysis.problemSpace.slice(0, 5).join(', ')}

Key Questions: ${analysis.keyQuestions.slice(0, 5).join(', ')}

Previous PRDs: ${contextRetrieval.previousPRDs.length} found
Team Knowledge: ${contextRetrieval.teamKnowledge.length} items

Research Findings (Top ${includedFindings.length}):
${includedFindings.map(f => `- ${f.source}: ${f.summary.substring(0, 200)}${f.summary.length > 200 ? '...' : ''}`).join('\n')}

Create a synthesized context that includes:
1. Key insights from research
2. Relevant patterns from previous PRDs  
3. Team-specific knowledge
4. Market and competitive insights
5. Technical considerations

Be concise but comprehensive.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a research synthesizer creating context for PRD development. Be concise and focus on actionable insights.' },
          { role: 'user', content: synthesisPrompt }
        ],
        stream: true
      });

      let synthesizedContent = '';
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          synthesizedContent += content;
          yield { chunk: content, isComplete: false };
        }
      }

      yield { chunk: '', isComplete: true };
      
      return synthesizedContent || originalContext;
      
    } catch (error) {
      console.error('Synthesis streaming failed:', error);
      yield { chunk: originalContext, isComplete: true };
      return originalContext;
    }
  }

  /**
   * Synthesize all research into enhanced context (backwards compatibility)
   */
  private static async synthesizeResearch(
    originalContext: string,
    contextRetrieval: DeepResearchPhase['contextRetrieval'],
    researchFindings: ResearchInsight[],
    analysis: DeepResearchPhase['initialAnalysis']
  ): Promise<string> {
    let result = '';
    
    for await (const { chunk, isComplete } of this.synthesizeResearchStreaming(
      originalContext,
      contextRetrieval, 
      researchFindings,
      analysis
    )) {
      result += chunk;
      if (isComplete) break;
    }
    
    return result || originalContext;
  }

  /**
   * Generate intelligent questions based on research gaps
   */
  private static async generateIntelligentQuestions(
    query: string,
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ): Promise<HumanQuestion[]> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `Generate clarifying questions that would significantly improve PRD quality.
          
Only ask questions that:
1. Address critical unknowns not found in research
2. Require human judgment or business context
3. Would materially impact the PRD recommendations

Output JSON:
{
  "questions": [
    {
      "category": "user_problem|business_context|technical|market",
      "question": "Specific question",
      "why_important": "How this impacts the PRD",
      "default_assumption": "What we'll assume if not answered"
    }
  ]
}`
        },
        { 
          role: 'user', 
          content: `Query: ${query}\n\nResearch Gaps: ${JSON.stringify(researchPhase.initialAnalysis.keyQuestions)}` 
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions":[]}');

    return result.questions.map((q: { category: string; question: string; why_important: string }, idx: number) => ({
      id: `q_${idx}`,
      category: q.category,
      question: q.question,
      why_important: q.why_important,
      required: false // All questions are optional
    }));
  }

  /**
   * Analyze request type and business context for smart agent selection
   */
  private static analyzeRequestContext(
    query: string,
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ) {
    const queryLower = query.toLowerCase();
    
    // Determine request type
    let requestType = 'exploration';
    if (queryLower.includes('improve') || queryLower.includes('optimize') || queryLower.includes('fix')) {
      requestType = 'optimization';
    } else if (queryLower.includes('new') || queryLower.includes('add') || queryLower.includes('create')) {
      requestType = 'new_feature';
    } else if (queryLower.includes('should we') || queryLower.includes('evaluate') || queryLower.includes('research')) {
      requestType = 'exploration';
    }

    // Determine complexity
    const complexityIndicators = [
      queryLower.includes('integration'),
      queryLower.includes('multiple'),
      queryLower.includes('system'),
      queryLower.includes('platform'),
      researchPhase.researchFindings.length > 10
    ];
    const complexity = complexityIndicators.filter(Boolean).length >= 2 ? 'high' : 'medium';

    // Determine business stage based on context
    let businessStage = 'growth';
    if (enhancedContext.toLowerCase().includes('startup') || enhancedContext.toLowerCase().includes('early stage')) {
      businessStage = 'startup';
    } else if (enhancedContext.toLowerCase().includes('enterprise') || enhancedContext.toLowerCase().includes('scale')) {
      businessStage = 'enterprise';
    }

    // Identify key themes from research
    const themes = [];
    if (researchPhase.researchFindings.some(f => f.source === 'competitive')) themes.push('competitive');
    if (researchPhase.researchFindings.some(f => f.summary.toLowerCase().includes('user'))) themes.push('user_focused');
    if (researchPhase.researchFindings.some(f => f.summary.toLowerCase().includes('technical'))) themes.push('technical');

    return {
      requestType,
      complexity,
      businessStage,
      themes,
      hasCompetitiveData: themes.includes('competitive'),
      hasUserData: themes.includes('user_focused'),
      hasTechnicalData: themes.includes('technical')
    };
  }

  /**
   * Smart agent selection based on request analysis
   */
  private static selectOptimalAgents(
    requestContext: {
      requestType: string;
      complexity: string;
      businessStage: string;
      themes: string[];
      hasCompetitiveData: boolean;
      hasUserData: boolean;
      hasTechnicalData: boolean;
    }
  ): AgentType[] {
    const { requestType, complexity, businessStage, themes } = requestContext;
    
    let agents: AgentType[] = [];

    // Core agents based on request type
    switch (requestType) {
      case 'new_feature':
        agents = ['planning', 'strategy', 'design', 'scoping'];
        break;
      case 'optimization':
        agents = ['research', 'strategy', 'planning'];
        break;
      case 'exploration':
        agents = ['research', 'strategy'];
        break;
      default:
        agents = ['planning', 'strategy'];
    }

    // Add conditional agents based on context
    if (complexity === 'high') {
      if (!agents.includes('planning')) agents.push('planning');
      if (!agents.includes('scoping')) agents.push('scoping');
    }

    if (themes.includes('user_focused') && !agents.includes('design')) {
      agents.push('design');
    }

    if (businessStage === 'startup' && !agents.includes('strategy')) {
      agents.push('strategy');
    }

    // Limit to 4 agents max for efficiency
    return agents.slice(0, 4);
  }

  /**
   * Plan intelligent orchestration with adaptive agent selection
   */
  private static async planIntelligentOrchestration(
    query: string,
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ) {
    const requestContext = this.analyzeRequestContext(query, enhancedContext, researchPhase);
    const optimalAgents = this.selectOptimalAgents(requestContext, researchPhase);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a Senior PM Orchestrator with deep business judgment. Your job is to create an intelligent, sequential conversation flow between specialist agents.

CONTEXT ANALYSIS:
- Request Type: ${requestContext.requestType}
- Complexity: ${requestContext.complexity}  
- Business Stage: ${requestContext.businessStage}
- Key Themes: ${requestContext.themes.join(', ')}
- Available Research: ${researchPhase.researchFindings.length} insights

SELECTED AGENTS: ${optimalAgents.join(', ')}

Create a sequential conversation flow where agents build on each other's insights. Focus on:
1. Specific, targeted queries (not generic templates)
2. Logical sequencing that builds knowledge
3. Cross-agent validation and challenge points
4. Business-context awareness

Output JSON:
{
  "thinking": "Your orchestration strategy and reasoning",
  "conversation_flow": [
    {
      "phase": 1,
      "agents": ["agent1", "agent2"],
      "execution": "parallel|sequential",
      "purpose": "What this phase accomplishes"
    }
  ],
  "agent_queries": {
    "agent_name": {
      "query": "Specific, context-aware query",
      "context_focus": "What specific research/context to emphasize",
      "expected_output": "What you expect this agent to deliver",
      "builds_on": "Previous agent outputs this should reference"
    }
  },
  "validation_points": [
    {
      "checkpoint": "After which phase",
      "questions": ["Specific validation questions to ask"],
      "conflicts_to_watch": ["Potential conflicts between agent outputs"]
    }
  ],
  "success_criteria": "How to measure if this orchestration is working"
}`
        },
        { 
          role: 'user', 
          content: `Query: ${query}

Enhanced Context: ${enhancedContext.substring(0, 2000)}

Research Insights Summary:
${researchPhase.researchFindings.map(f => `- ${f.source}: ${f.summary.substring(0, 100)}...`).join('\n').substring(0, 1500)}

Create a smart orchestration plan that maximizes PM impact.`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const orchestrationPlan = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      ...orchestrationPlan,
      requestContext,
      optimalAgents,
      researchSummary: researchPhase.researchFindings.slice(0, 5) // Top insights
    };
  }

  /**
   * Execute Mixture-of-Agents approach with parallel proposers and synthesis layers
   */
  private static async executeMixtureOfAgents(
    orchestrationPlan: {
      optimalAgents: string[];
      agent_queries?: Record<string, { query: string; context_focus?: string; expected_output?: string; builds_on?: string }>;
      requestContext: Record<string, unknown>;
      researchSummary: ResearchInsight[];
      [key: string]: unknown;
    },
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ) {
    console.log('🎯 Starting Mixture-of-Agents orchestration');
    
    // Layer 1: Parallel Proposers - Generate diverse initial perspectives
    const proposerResults = await this.executeProposerLayer(
      orchestrationPlan.optimalAgents,
      orchestrationPlan,
      enhancedContext,
      researchPhase
    );

    // Layer 2: Senior PM Aggregation - Synthesize all proposer outputs
    const aggregatedResult = await this.executeAggregationLayer(
      proposerResults,
      orchestrationPlan,
      enhancedContext,
      'senior_pm_synthesis'
    );

    // Layer 3: Specialist Refinement - Refine based on synthesized output
    const refinedResults = await this.executeRefinementLayer(
      aggregatedResult,
      orchestrationPlan.optimalAgents.slice(0, 2), // Top 2 agents for refinement
      orchestrationPlan,
      enhancedContext
    );

    // Layer 4: Final Synthesis - Create final PRD-ready output
    const finalResult = await this.executeFinalSynthesis(
      [...proposerResults, aggregatedResult, ...refinedResults],
      orchestrationPlan,
      enhancedContext
    );

    return [finalResult];
  }

  /**
   * Layer 1: Execute parallel proposer agents for diverse perspectives
   */
  private static async executeProposerLayer(
    agents: string[],
    orchestrationPlan: {
      agent_queries?: Record<string, { query: string; context_focus?: string; expected_output?: string }>;
      [key: string]: unknown;
    },
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ) {
    console.log(`🔄 Layer 1: Executing ${agents.length} proposer agents in parallel`);

    const proposerPromises = agents.map(async (agentType) => {
      const agentQuery = orchestrationPlan.agent_queries?.[agentType];
      if (!agentQuery) {
        return this.createFallbackProposerQuery(agentType, enhancedContext, researchPhase);
      }

      // Build proposer-specific context
      const proposerContext = this.buildProposerContext(
        agentType,
        agentQuery,
        enhancedContext,
        researchPhase
      );

      return this.executeAgentWithTimeout(
        agentType,
        proposerContext,
        enhancedContext,
        2, // Max 2 retries for proposers
        45000 // 45 second timeout
      );
    });

    const results = await Promise.allSettled(proposerPromises);

    return results
      .filter((result): result is PromiseFulfilledResult<{ agent: string; query: string; response: string; tokensUsed: number; confidence: number; timestamp: string; fallback?: boolean }> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(Boolean);
  }

  /**
   * Layer 2: Aggregate multiple proposer outputs using MoA synthesis
   */
  private static async executeAggregationLayer(
    proposerResults: Array<{ agent: string; query: string; response: string; tokensUsed: number; confidence: number; timestamp: string; fallback?: boolean }>,
    orchestrationPlan: { optimalAgents: string[]; [key: string]: unknown },
    enhancedContext: string,
    aggregationType: string
  ) {
    console.log(`🔄 Layer 2: Aggregating ${proposerResults.length} proposer outputs`);

    if (proposerResults.length === 0) {
      throw new Error('No proposer results to aggregate');
    }

    // Create MoA aggregation prompt
    const aggregationPrompt = this.buildMoAAggregationPrompt(
      proposerResults,
      enhancedContext,
      aggregationType
    );

    // Use the best aggregator (typically the strongest model)
    const aggregatorAgent = this.selectBestAggregator(orchestrationPlan.optimalAgents);

    const aggregatedResult = await this.executeAgentWithTimeout(
      aggregatorAgent,
      aggregationPrompt,
      enhancedContext,
      3, // Max retries for critical aggregation
      90000 // 90 second timeout for synthesis
    );

    if (aggregatedResult) {
      aggregatedResult.agent = `${aggregatorAgent}_aggregator`;
      aggregatedResult.aggregated_from = proposerResults.map(r => r.agent);
      aggregatedResult.synthesis_type = aggregationType;
    }

    return aggregatedResult;
  }

  /**
   * Layer 3: Refine based on aggregated output
   */
  private static async executeRefinementLayer(
    aggregatedResult: { agent: string; response: string; aggregated_from: string[]; synthesis_type: string; [key: string]: unknown } | null,
    refinementAgents: string[],
    orchestrationPlan: { [key: string]: unknown },
    enhancedContext: string
  ) {
    console.log(`🔄 Layer 3: Refining with ${refinementAgents.length} specialist agents`);

    if (!aggregatedResult) {
      return [];
    }

    const refinementPromises = refinementAgents.map(async (agentType) => {
      const refinementPrompt = this.buildRefinementPrompt(
        agentType,
        aggregatedResult,
        enhancedContext
      );

      const result = await this.executeAgentWithTimeout(
        agentType,
        refinementPrompt,
        enhancedContext,
        2,
        60000
      );

      if (result) {
        result.agent = `${agentType}_refiner`;
        result.refined_from = aggregatedResult.agent;
      }

      return result;
    });

    const results = await Promise.allSettled(refinementPromises);

    return results
      .filter((result): result is PromiseFulfilledResult<{ agent: string; response: string; refined_from: string; [key: string]: unknown } | null> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter((value): value is { agent: string; response: string; refined_from: string; [key: string]: unknown } => value !== null);
  }

  /**
   * Layer 4: Final synthesis for PRD-ready output
   */
  private static async executeFinalSynthesis(
    allResults: Array<{ agent: string; response: string; [key: string]: unknown }>,
    orchestrationPlan: { optimalAgents: string[]; [key: string]: unknown },
    enhancedContext: string
  ) {
    console.log(`🔄 Layer 4: Final synthesis from ${allResults.length} agent outputs`);

    const finalSynthesisPrompt = this.buildFinalSynthesisPrompt(
      allResults,
      enhancedContext
    );

    const bestAggregator = this.selectBestAggregator(orchestrationPlan.optimalAgents);
    
    const finalResult = await this.executeAgentWithTimeout(
      bestAggregator,
      finalSynthesisPrompt,
      enhancedContext,
      3,
      120000 // 2 minutes for final synthesis
    );

    if (finalResult) {
      finalResult.agent = `${bestAggregator}_final_synthesizer`;
      finalResult.synthesized_from = allResults.map(r => r.agent);
      finalResult.is_final_output = true;
    }

    return finalResult;
  }

  /**
   * Build MoA aggregation prompt for synthesizing multiple proposer outputs
   */
  private static buildMoAAggregationPrompt(
    proposerResults: Array<{ agent: string; response: string; [key: string]: unknown }>,
    enhancedContext: string,
    aggregationType: string
  ): string {
    const proposerSummaries = proposerResults.map((result, index) => 
      `PROPOSER ${index + 1} (${result.agent}):
${result.response.substring(0, 1200)}${result.response.length > 1200 ? '...[truncated]' : ''}`
    ).join('\n\n---\n\n');

    return `You are the Senior PM Intelligence Layer in a Mixture-of-Agents system. Your role is to synthesize insights from multiple specialist proposer agents into a coherent, comprehensive analysis.

AGGREGATION TASK: ${aggregationType}

PROPOSER OUTPUTS TO SYNTHESIZE:
${proposerSummaries}

BUSINESS CONTEXT:
${enhancedContext.substring(0, 1500)}

YOUR SYNTHESIS APPROACH:
1. IDENTIFY CONVERGENT INSIGHTS: Where do proposers agree? These are likely high-confidence insights
2. RESOLVE DIVERGENT VIEWS: Where they disagree, use business judgment to determine the best path
3. EXTRACT UNIQUE VALUE: What unique insights does each proposer contribute?
4. FILL GAPS: What critical elements might the proposers have missed?
5. CREATE UNIFIED VISION: Synthesize into a coherent, actionable strategy

SYNTHESIS REQUIREMENTS:
- Focus on actionable insights for PRD development
- Maintain nuance while creating clarity
- Highlight high-confidence recommendations vs. areas needing further exploration
- Consider user impact, business value, and technical feasibility
- Provide specific, measurable recommendations where possible

Your synthesis should be comprehensive yet concise, building on the collective intelligence of all proposers while adding senior PM strategic judgment.`;
  }

  /**
   * Select best aggregator based on agent capabilities and orchestration plan
   */
  private static selectBestAggregator(optimalAgents: string[]): string {
    // Preference hierarchy for aggregation capabilities
    const aggregatorPreference = [
      'strategy',   // Best for high-level synthesis and business judgment
      'planning',   // Good for comprehensive analysis and synthesis
      'research',   // Strong analytical capabilities
      'scoping',    // Good at balancing complexity
      'design'      // User-focused synthesis
    ];

    // Find the best available aggregator from the optimal agents
    for (const preferredAgent of aggregatorPreference) {
      if (optimalAgents.includes(preferredAgent)) {
        return preferredAgent;
      }
    }

    // Fallback to the first available agent
    return optimalAgents[0] || 'planning';
  }

  /**
   * Create fallback query when orchestration plan lacks specific agent query
   */
  private static createFallbackProposerQuery(
    agentType: string,
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ) {
    const fallbackQueries = {
      planning: {
        query: "Analyze this request from a PRD planning perspective. Focus on problem definition, scope, success metrics, and implementation planning.",
        context_focus: "Problem space analysis, user needs, and strategic planning",
        expected_output: "Structured PRD planning with clear problem statement, scope definition, and success metrics"
      },
      strategy: {
        query: "Provide strategic analysis of this request. Consider market positioning, business impact, competitive advantages, and strategic trade-offs.",
        context_focus: "Business strategy, market dynamics, and competitive positioning",
        expected_output: "Strategic recommendations with business justification and competitive analysis"
      },
      research: {
        query: "Conduct comprehensive research analysis. Synthesize market insights, user research, and competitive intelligence to inform PRD recommendations.",
        context_focus: "Research findings, market trends, and user insights",
        expected_output: "Research-backed insights with specific data points and market intelligence"
      },
      design: {
        query: "Analyze from a user experience and design perspective. Consider user workflows, design principles, and experience optimization.",
        context_focus: "User experience, design patterns, and usability considerations",
        expected_output: "UX-focused recommendations with user journey and design considerations"
      },
      scoping: {
        query: "Provide scoping analysis including technical complexity, resource requirements, and implementation phases.",
        context_focus: "Technical feasibility, resource planning, and implementation roadmap",
        expected_output: "Detailed scope analysis with technical considerations and resource estimates"
      }
    };

    const fallback = fallbackQueries[agentType as keyof typeof fallbackQueries] || fallbackQueries.planning;
    
    // Add research context
    const relevantResearch = researchPhase.researchFindings
      .filter(f => f.relevance > 0.6)
      .slice(0, 3);
    
    let contextualQuery = fallback.query;
    if (relevantResearch.length > 0) {
      contextualQuery += `\n\nRELEVANT RESEARCH FINDINGS:\n${relevantResearch.map(r => 
        `- ${r.source}: ${r.summary.substring(0, 150)}...`
      ).join('\n')}`;
    }

    return {
      agent: agentType,
      query: contextualQuery,
      response: `Fallback proposer analysis from ${agentType} perspective`,
      tokensUsed: 0,
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * Build proposer-specific context for MoA execution
   */
  private static buildProposerContext(
    agentType: string,
    agentQuery: { query: string; context_focus?: string; expected_output?: string },
    enhancedContext: string,
    researchPhase: DeepResearchPhase
  ): string {
    let context = `PROPOSER ROLE: You are a specialist ${agentType} agent in a Mixture-of-Agents system. Provide your unique perspective and expertise.

PRIMARY QUERY: ${agentQuery.query}

FOCUS AREAS: ${agentQuery.context_focus || `${agentType} domain expertise`}

EXPECTED CONTRIBUTION: ${agentQuery.expected_output || `${agentType} analysis and recommendations`}`;

    // Add relevant research for this agent type
    const relevantResearch = this.selectRelevantResearchForAgent(agentType, researchPhase);
    if (relevantResearch.length > 0) {
      context += `\n\nRELEVANT RESEARCH FOR YOUR ANALYSIS:\n${relevantResearch.map(r => 
        `- ${r.source}: ${r.summary}`
      ).join('\n')}`;
    }

    // Add business context
    context += `\n\nBUSINESS CONTEXT:\n${enhancedContext.substring(0, 1000)}`;

    // Add agent-specific guidance
    const agentGuidance = this.getAgentSpecificGuidance(agentType);
    context += `\n\n${agentType.toUpperCase()} SPECIFIC GUIDANCE:\n${agentGuidance}`;

    return context;
  }

  /**
   * Select research most relevant to specific agent type
   */
  private static selectRelevantResearchForAgent(
    agentType: string,
    researchPhase: DeepResearchPhase
  ): ResearchInsight[] {
    const agentRelevanceMap = {
      planning: ['internal', 'klaviyo', 'competitive'],
      strategy: ['competitive', 'web', 'klaviyo'],
      research: ['web', 'competitive', 'klaviyo'],
      design: ['web', 'competitive', 'internal'],
      scoping: ['klaviyo', 'internal', 'competitive']
    };

    const preferredSources = agentRelevanceMap[agentType as keyof typeof agentRelevanceMap] || ['web', 'competitive'];
    
    return researchPhase.researchFindings
      .filter(finding => preferredSources.includes(finding.source))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 4);
  }

  /**
   * Get agent-specific guidance for MoA proposer execution
   */
  private static getAgentSpecificGuidance(agentType: string): string {
    const guidance = {
      planning: `Focus on:
- Clear problem statement with specific user pain points
- Measurable success metrics and KPIs
- Scope definition (in/out/future scope)
- Dependencies and assumptions
- Risk assessment and mitigation strategies`,
      
      strategy: `Focus on:
- Market positioning and competitive differentiation  
- Business value and revenue impact
- Strategic priorities and trade-offs
- Go-to-market considerations
- Long-term strategic implications`,
      
      research: `Focus on:
- Market trends and user behavior insights
- Competitive landscape analysis
- Industry benchmarks and best practices
- User research findings and pain points
- Technology trends and adoption patterns`,
      
      design: `Focus on:
- User experience workflows and journeys
- Design principles and usability guidelines
- Accessibility and inclusive design
- Information architecture and interaction patterns
- User interface and visual design considerations`,
      
      scoping: `Focus on:
- Technical complexity and feasibility assessment
- Resource requirements (engineering, design, PM)
- Implementation timeline and phases
- Integration points and technical dependencies
- Quality assurance and testing considerations`
    };

    return guidance[agentType as keyof typeof guidance] || 'Provide thorough analysis from your domain expertise';
  }

  /**
   * Build refinement prompt for Layer 3 specialist refinement
   */
  private static buildRefinementPrompt(
    agentType: string,
    aggregatedResult: { agent: string; response: string; [key: string]: unknown },
    enhancedContext: string
  ): string {
    return `You are a specialist ${agentType} refiner in the MoA system. Your job is to refine and enhance the aggregated analysis with your domain expertise.

AGGREGATED ANALYSIS TO REFINE:
${aggregatedResult.response.substring(0, 2000)}${aggregatedResult.response.length > 2000 ? '...[truncated]' : ''}

REFINEMENT TASK:
As the ${agentType} specialist, review the aggregated analysis and provide targeted refinements:

1. VALIDATE DOMAIN ACCURACY: Ensure ${agentType}-specific aspects are accurate and complete
2. ADD MISSING ELEMENTS: What critical ${agentType} insights are missing?
3. ENHANCE SPECIFICITY: Make recommendations more specific and actionable
4. FLAG RISKS: Identify potential ${agentType}-related risks or challenges
5. OPTIMIZE APPROACH: Suggest improvements from your domain perspective

BUSINESS CONTEXT:
${enhancedContext.substring(0, 800)}

REFINEMENT FOCUS AREAS:
${this.getAgentSpecificGuidance(agentType)}

Your refinement should enhance the aggregated analysis with deep ${agentType} expertise while maintaining alignment with the overall strategic direction.`;
  }

  /**
   * Build final synthesis prompt for Layer 4 comprehensive output
   */
  private static buildFinalSynthesisPrompt(
    allResults: Array<{ agent: string; response: string; synthesized_from?: string[]; refined_from?: string; aggregated_from?: string[]; [key: string]: unknown }>,
    enhancedContext: string
  ): string {
    const resultSummaries = allResults.map((result, index) => {
      const resultType = result.synthesized_from ? 'FINAL_SYNTHESIS' :
                        result.refined_from ? 'REFINEMENT' :
                        result.aggregated_from ? 'AGGREGATION' :
                        'PROPOSER';
      
      return `${resultType} ${index + 1} (${result.agent}):
${result.response.substring(0, 1000)}${result.response.length > 1000 ? '...[truncated]' : ''}`;
    }).join('\n\n---\n\n');

    return `You are the Final Synthesis Layer in the Mixture-of-Agents system. Create the definitive, PRD-ready analysis that incorporates all agent insights.

ALL AGENT OUTPUTS TO SYNTHESIZE:
${resultSummaries}

BUSINESS CONTEXT:
${enhancedContext.substring(0, 1000)}

FINAL SYNTHESIS REQUIREMENTS:
Create a comprehensive, PRD-ready output that:

1. INTEGRATES ALL INSIGHTS: Weave together the best insights from all agents
2. RESOLVES CONFLICTS: Make clear decisions where agents disagreed
3. ENSURES COMPLETENESS: Cover all essential PRD elements
4. MAINTAINS COHERENCE: Create a unified, logical narrative
5. FOCUSES ON ACTION: Provide clear, specific recommendations

STRUCTURE YOUR SYNTHESIS:
- Executive Summary (key decisions and recommendations)
- Problem Analysis (synthesized problem understanding)
- Strategic Approach (integrated strategic direction)
- Implementation Guidance (actionable next steps)
- Success Metrics (measurable outcomes)
- Risk Assessment (key risks and mitigations)

This is the final output that will inform PRD creation - make it comprehensive, actionable, and strategically sound.`;
  }

  /**
   * Execute agents in a phase with shared context
   */
  private static async executePhaseAgents(
    agents: string[],
    orchestrationPlan: { agent_queries?: Record<string, unknown>; [key: string]: unknown },
    enhancedContext: string,
    researchPhase: DeepResearchPhase,
    conversationContext: Record<string, { response: string; keyInsights?: string[]; confidence?: number; [key: string]: unknown }>
  ) {
    const results = [];
    
    for (const agentType of agents) {
      const result = await this.executeSingleAgentWithContext(
        agentType,
        orchestrationPlan,
        enhancedContext,
        researchPhase,
        conversationContext
      );
      
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Execute single agent with full conversation context
   */
  private static async executeSingleAgentWithContext(
    agentType: string,
    orchestrationPlan: { agent_queries?: Record<string, unknown>; [key: string]: unknown },
    enhancedContext: string,
    researchPhase: DeepResearchPhase,
    conversationContext: Record<string, { response: string; keyInsights?: string[]; confidence?: number; [key: string]: unknown }>
  ) {
    const agentQuery = orchestrationPlan.agent_queries?.[agentType];
    if (!agentQuery) {
      console.warn(`No query found for agent: ${agentType}`);
      return null;
    }

    // Build context-aware prompt
    const contextualPrompt = this.buildContextualPrompt(
      agentType,
      agentQuery,
      enhancedContext,
      researchPhase,
      conversationContext
    );

    return this.executeAgentWithTimeout(
      agentType,
      contextualPrompt,
      enhancedContext,
      3, // retries
      60000 // timeout
    );
  }

  /**
   * Build context-aware prompt for agent
   */
  private static buildContextualPrompt(
    agentType: string,
    agentQuery: { query?: string; context_focus?: string; expected_output?: string; builds_on?: string; [key: string]: unknown },
    enhancedContext: string,
    researchPhase: DeepResearchPhase,
    conversationContext: Record<string, { response: string; keyInsights?: string[]; confidence?: number; [key: string]: unknown }>
  ): string {
    let prompt = agentQuery.query || `Analyze the following request from a ${agentType} perspective.`;
    
    // Add specific context focus
    if (agentQuery.context_focus) {
      prompt += `\n\nFOCUS AREAS: ${agentQuery.context_focus}`;
    }

    // Add relevant research findings
    const relevantResearch = researchPhase.researchFindings
      .filter(f => f.relevance > 0.6)
      .slice(0, 4);
    
    if (relevantResearch.length > 0) {
      prompt += `\n\nRELEVANT RESEARCH:\n${relevantResearch.map(r => 
        `- ${r.source}: ${r.summary}`
      ).join('\n')}`;
    }

    // Add insights from previous agents
    const previousInsights = Object.entries(conversationContext)
      .filter(([agent]) => agent !== agentType)
      .map(([agent, data]) => ({
        agent,
        insights: data.keyInsights || []
      }))
      .filter(({ insights }) => insights.length > 0);

    if (previousInsights.length > 0) {
      prompt += `\n\nPREVIOUS AGENT INSIGHTS:`;
      previousInsights.forEach(({ agent, insights }) => {
        prompt += `\n\n${agent.toUpperCase()} AGENT FINDINGS:`;
        insights.forEach((insight: string) => {
          prompt += `\n- ${insight}`;
        });
      });
      
      if (agentQuery.builds_on) {
        prompt += `\n\nBUILD ON: ${agentQuery.builds_on}`;
      }
    }

    // Add expected output guidance
    if (agentQuery.expected_output) {
      prompt += `\n\nEXPECTED OUTPUT: ${agentQuery.expected_output}`;
    }

    return prompt;
  }

  /**
   * Extract key insights from agent response
   */
  private static extractKeyInsights(response: string): string[] {
    // Simple extraction - look for bullet points, numbered lists, or key phrases
    const insights = [];
    
    // Extract bullet points
    const bulletMatches = response.match(/^[•\-\*]\s+(.+)$/gm);
    if (bulletMatches) {
      insights.push(...bulletMatches.map(match => match.replace(/^[•\-\*]\s+/, '').trim()));
    }
    
    // Extract numbered points
    const numberedMatches = response.match(/^\d+\.\s+(.+)$/gm);
    if (numberedMatches) {
      insights.push(...numberedMatches.map(match => match.replace(/^\d+\.\s+/, '').trim()));
    }
    
    // Extract sentences with key phrases
    const keyPhrases = ['recommend', 'should', 'critical', 'important', 'risk', 'opportunity'];
    const sentences = response.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (keyPhrases.some(phrase => lowerSentence.includes(phrase)) && sentence.trim().length > 20) {
        insights.push(sentence.trim());
      }
    }
    
    return insights.slice(0, 5); // Limit to top 5 insights
  }

  /**
   * Execute single agent with timeout and retry logic
   */
  private static async executeAgentWithTimeout(
    agentType: string,
    query: string,
    context: string,
    maxRetries: number,
    timeoutMs: number
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: AgentRegistry.getPrompt(agentType as AgentType) },
            { role: 'user', content: `${query}\n\nContext: ${context}` }
          ]
        }, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        return {
          agent: agentType as AgentType,
          query,
          response: response.choices[0].message.content || '',
          tokensUsed: response.usage?.total_tokens || 0,
          confidence: 0.85,
          timestamp: new Date().toISOString(),
          attempt
        };

      } catch (error) {
        console.error(`Agent ${agentType} failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          // Return partial result for graceful degradation
          return {
            agent: agentType as AgentType,
            query,
            response: `Unable to complete ${agentType} analysis due to technical issues. Please review manually.`,
            tokensUsed: 0,
            confidence: 0.1,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt
          };
        }

        // Exponential backoff between retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return null;
  }

  /**
   * Validate phase results and detect conflicts
   */
  private static async validatePhaseResults(
    phase: { phase: number; [key: string]: unknown },
    conversationContext: Record<string, { response: string; keyInsights?: string[]; confidence?: number; [key: string]: unknown }>,
    validationPoints: Array<{ checkpoint: string; questions?: string[]; conflicts_to_watch?: string[]; [key: string]: unknown }>
  ) {
    const relevantValidation = validationPoints.find(
      vp => vp.checkpoint === `After Phase ${phase.phase}` || vp.checkpoint === 'after_each_phase'
    );

    if (!relevantValidation) {
      return { hasConflicts: false, conflicts: [] };
    }

    const conflicts = [];
    
    // Check for predefined conflict patterns
    for (const conflictPattern of relevantValidation.conflicts_to_watch || []) {
      if (this.detectConflictPattern(conflictPattern, conversationContext)) {
        conflicts.push(conflictPattern);
      }
    }

    // Validate specific questions
    for (const question of relevantValidation.questions || []) {
      const validationResult = await this.validateSpecificQuestion(
        question,
        conversationContext
      );
      
      if (!validationResult.passes) {
        conflicts.push(validationResult.issue);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      validationDetails: relevantValidation
    };
  }

  /**
   * Detect specific conflict patterns in agent responses
   */
  private static detectConflictPattern(pattern: string, context: Record<string, { response?: string; [key: string]: unknown }>): boolean {
    const responses = Object.values(context).map(ctx => ctx.response || '');
    const allText = responses.join(' ').toLowerCase();
    
    // Common conflict patterns
    if (pattern.includes('scope vs timeline')) {
      return allText.includes('expand') && allText.includes('timeline') && allText.includes('constraint');
    }
    
    if (pattern.includes('user need vs complexity')) {
      return (allText.includes('user') || allText.includes('customer')) && 
             allText.includes('complex') && 
             allText.includes('difficult');
    }

    if (pattern.includes('resource constraint')) {
      return allText.includes('resource') && (allText.includes('limit') || allText.includes('constraint'));
    }

    // Generic conflict detection - look for contradictory terms
    const contradictions = [
      ['high priority', 'low priority'],
      ['simple', 'complex'],
      ['fast', 'slow'],
      ['expand', 'reduce'],
      ['more', 'less']
    ];

    return contradictions.some(([term1, term2]) => 
      allText.includes(term1) && allText.includes(term2)
    );
  }

  /**
   * Validate specific question against agent responses
   */
  private static async validateSpecificQuestion(
    question: string,
    conversationContext: Record<string, { keyInsights?: string[]; [key: string]: unknown }>
  ) {
    const contextSummary = Object.entries(conversationContext)
      .map(([agent, data]) => `${agent}: ${data.keyInsights?.join('; ') || 'No insights'}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a PM validation agent. Check if agent responses adequately address specific questions.'
        },
        { 
          role: 'user', 
          content: `Question: ${question}

Agent Context:
${contextSummary}

Does the collective agent context adequately address this question? 
Respond with JSON: {"passes": true/false, "issue": "description if fails", "confidence": 0-1}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    try {
      return JSON.parse(response.choices[0].message.content || '{"passes": true, "issue": "", "confidence": 0.5}');
    } catch {
      return { passes: true, issue: '', confidence: 0.5 };
    }
  }

  /**
   * Resolve conflicts between agent outputs using senior PM judgment
   */
  private static async resolveAgentConflicts(
    conflicts: string[],
    conversationContext: Record<string, { keyInsights?: string[]; confidence?: number; [key: string]: unknown }>,
    enhancedContext: string
  ) {
    console.log('🧠 Senior PM reviewing conflicts and making decisions...');

    const conflictSummary = conflicts.join(', ');
    const agentSummaries = Object.entries(conversationContext)
      .map(([agent, data]) => ({
        agent,
        position: data.keyInsights?.slice(0, 3).join('; ') || 'No clear position',
        confidence: data.confidence || 0.5
      }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a Senior Product Manager with deep business judgment. Your job is to resolve conflicts between specialist agents by making informed trade-off decisions.

APPROACH:
1. Understand each agent's perspective and reasoning
2. Consider business context, user impact, and resource constraints  
3. Make clear decisions with rationale
4. Provide guidance for moving forward

You should act as the "PM brain" that weighs competing priorities and makes strategic choices.`
        },
        { 
          role: 'user', 
          content: `CONFLICTS DETECTED: ${conflictSummary}

AGENT POSITIONS:
${agentSummaries.map(s => `${s.agent} (confidence: ${s.confidence}): ${s.position}`).join('\n')}

BUSINESS CONTEXT:
${enhancedContext.substring(0, 1000)}

As the Senior PM, resolve these conflicts and provide:
1. Clear decision on how to proceed
2. Rationale for your choice  
3. Risk mitigation for the chosen path
4. Specific guidance for next steps

Respond in JSON:
{
  "decision": "Your clear resolution of the conflicts",
  "rationale": "Why this is the right choice given business context",
  "risks": ["Risks of chosen approach"],
  "mitigation": ["How to mitigate those risks"],
  "guidance": {
    "agent_name": "Specific guidance for each agent based on decision"
  },
  "success_metrics": ["How to measure if this decision was right"]
}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    try {
      const resolution = JSON.parse(response.choices[0].message.content || '{}');
      
      // Update conversation context with resolution
      const resolvedContext = { ...conversationContext };
      resolvedContext['senior_pm'] = {
        response: resolution.decision,
        confidence: 0.9,
        keyInsights: [resolution.decision, resolution.rationale],
        resolution: resolution
      };

      console.log(`✅ Conflicts resolved: ${resolution.decision}`);
      return resolvedContext;
      
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      return conversationContext;
    }
  }

  /**
   * Validate PRD quality and identify gaps
   */
  private static async validatePRDQuality(
    agentResults: Array<{ agent: string; response: string; [key: string]: unknown }>,
    enhancedContext: string,
    query: string
  ) {
    const validationResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `Validate PRD quality against best practices.

Output JSON:
{
  "qualityScore": 0-100,
  "completeness": 0-100,
  "gaps": ["missing elements"],
  "strengths": ["strong points"],
  "recommendations": ["improvements"]
}`
        },
        { 
          role: 'user', 
          content: `Validate this PRD content:
          
Query: ${query}
Agent Results: ${JSON.stringify(agentResults.map(r => ({ agent: r.agent, summary: r.response.substring(0, 200) })))}` 
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(validationResponse.choices[0].message.content || '{}');
  }

  /**
   * Conduct follow-up research for identified gaps
   */
  private static async conductFollowupResearch(
    gaps: string[],
    enhancedContext: string
  ) {
    const followupPromises = gaps.slice(0, 3).map(async (gap) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a research specialist filling gaps in PRD analysis.' 
          },
          { 
            role: 'user', 
            content: `Fill this gap: ${gap}\n\nContext: ${enhancedContext}` 
          }
        ]
      });

      return {
        agent: 'research_followup',
        query: gap,
        response: response.choices[0].message.content || '',
        tokensUsed: response.usage?.total_tokens || 0,
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };
    });

    return Promise.all(followupPromises);
  }

  /**
   * Create enhanced document with quality assurance
   */
  private static async createEnhancedDocument(
    query: string,
    agentResults: Array<{ agent: string; response: string; [key: string]: unknown }>,
    enhancedContext: string,
    teamTerms: Record<string, string>,
    validation: { qualityScore?: number; completeness?: number; gaps?: string[]; [key: string]: unknown },
    existingDocument?: Record<string, unknown>
  ) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: AgentRegistry.getPrompt('writing') },
        { 
          role: 'user', 
          content: `Create a high-quality PRD with these inputs:

Query: ${query}
Enhanced Context: ${enhancedContext}
Team Terms: ${JSON.stringify(teamTerms)}
Agent Analysis: ${JSON.stringify(agentResults)}
Quality Validation: ${JSON.stringify(validation)}
${existingDocument ? `Existing Document: ${JSON.stringify(existingDocument)}` : ''}

Create a comprehensive PRD that addresses all quality requirements and gaps.` 
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Store document in user's OpenAI Vector Store for future retrieval
   */
  private static async storeInVectorDB(
    document: { title?: string; quality_score?: number; [key: string]: unknown },
    query: string,
    context: string,
    userVectorStore?: { vectorStoreId: string; assistantId: string } | null
  ) {
    try {
      if (!userVectorStore) {
        console.warn('⚠️ Document not stored - no user vector store available');
        return;
      }

      const timestamp = new Date().toISOString();
      const documentContent = `# ${document.title}

**Generated:** ${timestamp}
**Query:** ${query}
**Quality Score:** ${document.quality_score || 'N/A'}

## Document Content
${JSON.stringify(document, null, 2)}

## Context Used
${context}

---
This PRD was generated by Garden Mode and stored for future reference.
`;

      const fileName = `prd-${document.title?.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.md`;
      
      console.log(`📄 Storing PRD in user's vector store: ${fileName}`);
      
      await uploadDocumentToVectorStore(
        userVectorStore.vectorStoreId,
        documentContent,
        fileName,
        true // Use chunking for large documents
      );

      console.log(`✅ Successfully stored PRD in vector store: ${userVectorStore.vectorStoreId}`);
      
    } catch (error) {
      console.error('Failed to store in user vector store:', error);
    }
  }
}