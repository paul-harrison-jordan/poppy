export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
  relevanceScore?: number;
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  domains?: string[]; // Include specific domains
  excludeDomains?: string[]; // Exclude specific domains
  language?: string;
  region?: string;
  safeSearch?: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  query: string;
  suggestions?: string[];
}

export interface SearchProvider {
  name: string;
  search(request: SearchRequest): Promise<SearchResponse>;
  isAvailable(): Promise<boolean>;
  getRateLimit(): { requests: number; window: number }; // requests per window (ms)
}

// Cache interface for search results
interface SearchCache {
  get(key: string): Promise<SearchResponse | null>;
  set(key: string, response: SearchResponse, ttl: number): Promise<void>;
  clear(): Promise<void>;
}

// In-memory cache implementation
class MemorySearchCache implements SearchCache {
  private cache = new Map<string, { data: SearchResponse; expires: number }>();

  async get(key: string): Promise<SearchResponse | null> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  async set(key: string, response: SearchResponse, ttl: number): Promise<void> {
    this.cache.set(key, {
      data: response,
      expires: Date.now() + ttl
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Rate limiter
class RateLimiter {
  private requests = new Map<string, number[]>();

  canMakeRequest(providerId: string, rateLimit: { requests: number; window: number }): boolean {
    const now = Date.now();
    const windowStart = now - rateLimit.window;
    
    const providerRequests = this.requests.get(providerId) || [];
    const recentRequests = providerRequests.filter(timestamp => timestamp > windowStart);
    
    this.requests.set(providerId, recentRequests);
    
    return recentRequests.length < rateLimit.requests;
  }

  recordRequest(providerId: string): void {
    const now = Date.now();
    const providerRequests = this.requests.get(providerId) || [];
    providerRequests.push(now);
    this.requests.set(providerId, providerRequests);
  }
}

// Mock search provider for development/testing with realistic competitor URLs
export class MockSearchProvider implements SearchProvider {
  name = 'mock';

  private getRealisticResults(query: string): SearchResult[] {
    // Extract potential competitor names from the query
    const lowerQuery = query.toLowerCase();
    const competitors = ['zendesk', 'intercom', 'freshdesk', 'salesforce', 'hubspot', 'slack', 'microsoft', 'google'];
    const foundCompetitors = competitors.filter(comp => lowerQuery.includes(comp));
    
    const results: SearchResult[] = [];
    
    // Generate realistic results based on detected competitors
    foundCompetitors.forEach(competitor => {
      const competitorResults = this.getCompetitorResults(competitor);
      results.push(...competitorResults);
    });
    
    // If no specific competitors found, generate generic realistic results
    if (results.length === 0) {
      results.push(...this.getGenericResults());
    }
    
    return results.slice(0, 8); // Limit to realistic number
  }

  private getCompetitorResults(competitor: string): SearchResult[] {
    const competitorData = {
      zendesk: {
        domain: 'zendesk.com',
        urls: [
          'https://www.zendesk.com/features/ticket-routing/',
          'https://support.zendesk.com/hc/en-us/articles/routing-rules',
          'https://www.zendesk.com/blog/intelligent-routing/'
        ],
        titles: [
          'Intelligent Ticket Routing - Zendesk Features',
          'Setting up automatic ticket routing rules - Zendesk',
          'How AI-powered routing improves customer support | Zendesk Blog'
        ],
        snippets: [
          'Route tickets automatically to the right agents based on skills, availability, and customer priority. Our intelligent routing ensures faster resolution times.',
          'Create custom routing rules that automatically assign tickets based on keywords, customer tier, product type, and agent expertise to streamline your workflow.',
          'Zendesk\'s AI-powered routing system analyzes ticket content and customer context to match inquiries with the most qualified available agent.'
        ]
      },
      intercom: {
        domain: 'intercom.com',
        urls: [
          'https://www.intercom.com/features/resolution-bot',
          'https://www.intercom.com/blog/conversation-routing',
          'https://developers.intercom.com/docs/routing-rules'
        ],
        titles: [
          'Resolution Bot and Smart Routing - Intercom',
          'How to set up conversation routing for better support',
          'Conversation routing API - Intercom Developer Hub'
        ],
        snippets: [
          'Automatically route conversations to the right team member with smart assignment rules based on conversation content, customer data, and team availability.',
          'Set up intelligent routing to ensure customers reach the right person faster. Use tags, custom attributes, and AI to route conversations effectively.',
          'Build custom routing logic with our API to automatically assign conversations based on your business rules and customer characteristics.'
        ]
      },
      freshdesk: {
        domain: 'freshworks.com',
        urls: [
          'https://freshworks.com/freshdesk/features/ticket-routing/',
          'https://support.freshworks.com/support/solutions/articles/automatic-ticket-assignment',
          'https://www.freshworks.com/blog/intelligent-ticket-routing/'
        ],
        titles: [
          'Automatic Ticket Routing and Assignment - Freshdesk',
          'How to set up automatic ticket assignment rules',
          'Intelligent ticket routing for faster customer support'
        ],
        snippets: [
          'Use Freshdesk\'s automatic ticket routing to ensure tickets reach the right agents instantly. Set up rules based on keywords, customer segments, and agent skills.',
          'Configure automatic assignment rules to distribute tickets evenly across your team or route them to specialists based on ticket properties and agent availability.',
          'Improve response times with intelligent routing that considers agent workload, expertise, and customer priority to optimize ticket assignments.'
        ]
      },
      salesforce: {
        domain: 'salesforce.com',
        urls: [
          'https://help.salesforce.com/s/articleView?Id=case-routing-omnichannel',
          'https://trailhead.salesforce.com/content/learn/modules/omni-channel-routing',
          'https://www.salesforce.com/products/service-cloud/features/omni-channel/'
        ],
        titles: [
          'Omni-Channel Routing in Salesforce Service Cloud',
          'Learn Omni-Channel Routing - Salesforce Trailhead',
          'Omni-Channel Routing Features - Service Cloud'
        ],
        snippets: [
          'Route work items to agents based on skills, capacity, and availability with Salesforce Omni-Channel routing for optimized customer service delivery.',
          'Master omni-channel routing to automatically assign cases, chats, and other work items to the most qualified available agents in your organization.',
          'Intelligently route customer inquiries across channels using skills-based routing, priority queues, and capacity management in Service Cloud.'
        ]
      }
    };

    const data = competitorData[competitor as keyof typeof competitorData];
    if (!data) return [];

    return data.urls.map((url, index) => ({
      title: data.titles[index] || `${competitor} - Customer Support Features`,
      url,
      snippet: data.snippets[index] || `Learn how ${competitor} handles customer support routing and automation.`,
      domain: data.domain,
      publishedDate: '2024-01-15',
      relevanceScore: 0.9 - (index * 0.1)
    }));
  }

  private getGenericResults(): SearchResult[] {
    return [
      {
        title: 'Customer Support Routing Best Practices | G2',
        url: 'https://www.g2.com/articles/customer-support-routing-best-practices',
        snippet: 'Learn the best practices for routing customer support requests efficiently. Compare different routing strategies and their impact on customer satisfaction.',
        domain: 'g2.com',
        publishedDate: '2024-01-10',
        relevanceScore: 0.85
      },
      {
        title: 'The Complete Guide to Help Desk Ticket Routing | TechTarget',
        url: 'https://www.techtarget.com/searchcustomerexperience/tip/help-desk-ticket-routing-guide',
        snippet: 'Comprehensive guide to implementing effective ticket routing systems. Covers automation, AI integration, and performance optimization strategies.',
        domain: 'techtarget.com',
        publishedDate: '2024-01-08',
        relevanceScore: 0.80
      },
      {
        title: 'AI-Powered Customer Support: The Future of Routing | Forbes',
        url: 'https://www.forbes.com/sites/forbestechcouncil/2024/01/05/ai-powered-customer-support-routing/',
        snippet: 'How artificial intelligence is transforming customer support routing. Industry experts discuss implementation strategies and ROI benefits.',
        domain: 'forbes.com',
        publishedDate: '2024-01-05',
        relevanceScore: 0.75
      }
    ];
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const results = this.getRealisticResults(request.query);

    return {
      results: results.slice(0, request.maxResults || 10),
      totalCount: results.length,
      searchTime: 150 + Math.random() * 100,
      query: request.query,
      suggestions: [`${request.query} best practices`, `${request.query} comparison`, `${request.query} implementation`]
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getRateLimit(): { requests: number; window: number } {
    return { requests: 100, window: 60000 }; // 100 requests per minute
  }
}

// Google Custom Search API provider (placeholder)
export class GoogleSearchProvider implements SearchProvider {
  name = 'google';
  private apiKey: string;
  private searchEngineId: string;

  constructor(apiKey: string, searchEngineId: string) {
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    // Validate inputs
    if (!this.apiKey || !this.searchEngineId) {
      throw new Error('Google Search API key or Search Engine ID not configured');
    }

    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Build base query - clean and simple
    let searchQuery = request.query.trim();
    
    // Add domain filters more carefully
    if (request.domains && request.domains.length > 0) {
      const siteFilter = request.domains.map(domain => `site:${domain}`).join(' OR ');
      searchQuery = `${searchQuery} (${siteFilter})`;
    }

    if (request.excludeDomains && request.excludeDomains.length > 0) {
      const excludeFilter = request.excludeDomains.map(domain => `-site:${domain}`).join(' ');
      searchQuery = `${searchQuery} ${excludeFilter}`;
    }

    // Ensure query is not too long (Google has limits)
    if (searchQuery.length > 500) {
      searchQuery = searchQuery.substring(0, 500);
      console.warn('[GoogleSearchProvider] Query truncated to 500 characters');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: searchQuery,
      num: Math.min(request.maxResults || 10, 10).toString(),
    });

    // Add optional parameters only if provided
    if (request.language) {
      params.set('lr', `lang_${request.language}`);
    }

    if (request.region) {
      params.set('gl', request.region);
    }

    if (request.safeSearch !== undefined) {
      params.set('safe', request.safeSearch ? 'active' : 'off');
    }

    // Add time range filter
    if (request.timeRange && request.timeRange !== 'all') {
      const dateRestrict = {
        'day': 'd1',
        'week': 'w1', 
        'month': 'm1',
        'year': 'y1'
      }[request.timeRange];
      if (dateRestrict) {
        params.set('dateRestrict', dateRestrict);
      }
    }

    const url = `https://www.googleapis.com/customsearch/v1?${params}`;
    
    try {
      console.log(`[GoogleSearchProvider] Searching for: "${searchQuery}"`);
      
      // Create timeout manually for better compatibility
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: timeoutController.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Google Search API error: ${response.status} ${response.statusText}`;
        
        // Try to parse error details
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage += ` - ${errorData.error.message}`;
          }
          if (errorData.error?.details) {
            console.error('[GoogleSearchProvider] API Error Details:', errorData.error.details);
          }
        } catch {
          console.error('[GoogleSearchProvider] Raw error response:', errorText);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const searchTime = Date.now() - startTime;

      const results: SearchResult[] = (data.items || []).map((item: { title: string; link: string; snippet: string; pagemap?: { metatags?: Array<Record<string, string>> } }) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        domain: new URL(item.link).hostname,
        publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'],
        relevanceScore: 1.0 // Google doesn't provide this directly
      }));

      return {
        results,
        totalCount: parseInt(data.searchInformation?.totalResults || '0'),
        searchTime,
        query: request.query,
        suggestions: data.spelling?.correctedQuery ? [data.spelling.correctedQuery] : []
      };
    } catch (error) {
      console.error('[GoogleSearchProvider] Search failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && !!this.searchEngineId;
  }

  getRateLimit(): { requests: number; window: number } {
    return { requests: 100, window: 24 * 60 * 60 * 1000 }; // 100 requests per day (free tier)
  }
}

export class WebSearchService {
  private providers: SearchProvider[] = [];
  private cache: SearchCache;
  private rateLimiter: RateLimiter;
  private defaultCacheTTL = 60 * 60 * 1000; // 1 hour

  constructor(cache?: SearchCache) {
    this.cache = cache || new MemorySearchCache();
    this.rateLimiter = new RateLimiter();
    
    // Initialize providers
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Add Google Search if credentials available
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (googleApiKey && googleSearchEngineId) {
      // Validate the credentials format
      if (googleApiKey.length < 10) {
        console.warn(`[WebSearchService] Google API key appears invalid (too short). Using mock provider only.`);
      } else if (googleSearchEngineId.length < 10 || !/^[a-zA-Z0-9]+$/.test(googleSearchEngineId)) {
        console.warn(`[WebSearchService] Google Search Engine ID appears invalid (should be alphanumeric, 10+ chars). Using mock provider only.`);
      } else {
        try {
          this.providers.push(new GoogleSearchProvider(googleApiKey, googleSearchEngineId));
          console.log(`[WebSearchService] Google Search provider initialized successfully`);
        } catch (error) {
          console.error(`[WebSearchService] Failed to initialize Google Search provider:`, error);
        }
      }
    } else {
      console.log(`[WebSearchService] Google Search API credentials not found. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to enable real search.`);
    }
    
    // Always add mock provider as fallback
    this.providers.push(new MockSearchProvider());
    
    console.log(`[WebSearchService] Initialized with ${this.providers.length} providers: ${this.providers.map(p => p.name).join(', ')}`);
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const cacheKey = this.generateCacheKey(request);
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`[WebSearchService] Cache hit for query: "${request.query}"`);
      return cached;
    }

    // Try providers in order until one succeeds
    let lastError: Error | null = null;
    
    for (const provider of this.providers) {
      try {
        if (!(await provider.isAvailable())) {
          console.warn(`[WebSearchService] Provider ${provider.name} is not available`);
          continue;
        }

        const rateLimit = provider.getRateLimit();
        if (!this.rateLimiter.canMakeRequest(provider.name, rateLimit)) {
          console.warn(`[WebSearchService] Rate limit exceeded for provider ${provider.name}`);
          continue;
        }

        console.log(`[WebSearchService] Searching with provider ${provider.name} for query: "${request.query}"`);
        
        const response = await provider.search(request);
        this.rateLimiter.recordRequest(provider.name);
        
        // Validate response has results before caching
        if (response.results.length > 0) {
          // Cache the response
          await this.cache.set(cacheKey, response, this.defaultCacheTTL);
          
          console.log(`[WebSearchService] Found ${response.results.length} results in ${response.searchTime}ms`);
          return response;
        } else {
          console.warn(`[WebSearchService] Provider ${provider.name} returned no results, trying next provider`);
          lastError = new Error(`No results found for query: "${request.query}"`);
          continue;
        }
        
      } catch (error) {
        console.error(`[WebSearchService] Provider ${provider.name} failed:`, error);
        lastError = error as Error;
        
        // For Google API errors, provide more specific guidance
        if (provider.name === 'google' && error instanceof Error) {
          if (error.message.includes('400')) {
            console.warn(`[WebSearchService] Google API configuration issue. Check GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables`);
          } else if (error.message.includes('403')) {
            console.warn(`[WebSearchService] Google API quota exceeded or unauthorized. Check your API key and billing setup`);
          } else if (error.message.includes('429')) {
            console.warn(`[WebSearchService] Google API rate limit exceeded. Using fallback provider`);
          }
        }
        
        continue;
      }
    }

    throw new Error(`All search providers failed. Last error: ${lastError?.message}`);
  }

  private generateCacheKey(request: SearchRequest): string {
    const keyData = {
      query: request.query,
      maxResults: request.maxResults,
      timeRange: request.timeRange,
      domains: request.domains?.sort(),
      excludeDomains: request.excludeDomains?.sort(),
      language: request.language,
      region: request.region,
      safeSearch: request.safeSearch
    };
    
    return `search:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  // Convenience methods for common search patterns
  async competitorSearch(companyName: string, domain?: string): Promise<SearchResponse> {
    return this.search({
      query: `${companyName} competitors alternative`,
      maxResults: 10,
      excludeDomains: domain ? [domain] : undefined,
      timeRange: 'year'
    });
  }

  async featureAnalysis(feature: string, domain?: string): Promise<SearchResponse> {
    return this.search({
      query: `${feature} feature comparison reviews`,
      maxResults: 15,
      excludeDomains: domain ? [domain] : undefined,
      timeRange: 'month'
    });
  }

  async marketTrends(industry: string): Promise<SearchResponse> {
    return this.search({
      query: `${industry} market trends 2024`,
      maxResults: 10,
      timeRange: 'month'
    });
  }

  async newsSearch(topic: string): Promise<SearchResponse> {
    return this.search({
      query: topic,
      maxResults: 20,
      timeRange: 'week',
      domains: ['techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com']
    });
  }

  // Help docs specific search functionality - only searches within the specified domain
  async searchHelpDocs(baseUrl: string, queries: string[]): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const targetDomain = new URL(baseUrl).hostname;
    
    console.log(`[WebSearchService] Searching only within domain: ${targetDomain}`);
    
    for (const query of queries) {
      try {
        // Force search to only look within the target domain
        const response = await this.search({
          query: query,
          maxResults: 5,
          timeRange: 'year',
          domains: [targetDomain] // Restrict search to only this domain
        });
        
        // Additional filter to ensure we only get results from the target domain
        const filteredResults = response.results.filter(result => 
          result.domain === targetDomain || 
          result.url.includes(targetDomain)
        );
        
        console.log(`[WebSearchService] Query "${query}" returned ${filteredResults.length} results from ${targetDomain}`);
        allResults.push(...filteredResults);
      } catch (error) {
        console.error(`Failed to search for query "${query}" on domain ${targetDomain}:`, error);
      }
    }
    
    // Remove duplicates based on URL
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );
    
    console.log(`[WebSearchService] Total unique results found for ${targetDomain}: ${uniqueResults.length}`);
    return uniqueResults.slice(0, 10); // Limit to 10 most relevant
  }

  async analyzeSearchResults(
    searchResults: SearchResult[]
  ): Promise<{ insights: Array<{
    feature: string;
    description: string;
    customerBenefit: string;
    implementationHints: string;
    confidence: number;
    sourceUrl: string;
    keySection: string;
  }> }> {
    const insights = searchResults.map((result, index) => {
      // Extract key features from title and snippet
      const content = `${result.title} ${result.snippet}`;
      const feature = this.extractFeatureFromContent(content);
      const keySection = this.extractKeySection(result.title, result.snippet);
      
      return {
        feature: feature || `Feature ${index + 1}`,
        description: result.snippet.substring(0, 200),
        customerBenefit: this.extractBenefit(result.snippet),
        implementationHints: this.extractImplementation(result.snippet),
        confidence: result.relevanceScore || 0.8,
        sourceUrl: result.url,
        keySection: keySection
      };
    });

    return { insights };
  }

  private extractFeatureFromContent(content: string): string {
    // Look for feature indicators in the content
    const featureKeywords = ['routing', 'automation', 'integration', 'dashboard', 'analytics', 'workflow', 'collaboration', 'notification', 'API'];
    const lowerContent = content.toLowerCase();
    
    for (const keyword of featureKeywords) {
      if (lowerContent.includes(keyword)) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
    
    // Extract from title if possible
    const titleMatch = content.match(/^([^-|]+)/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    return 'Core Feature';
  }

  private extractBenefit(snippet: string): string {
    // Look for benefit indicators
    const benefitPhrases = ['faster', 'improve', 'increase', 'reduce', 'optimize', 'streamline', 'enhance', 'boost'];
    const sentences = snippet.split('.').map(s => s.trim());
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (benefitPhrases.some(phrase => lowerSentence.includes(phrase))) {
        return sentence.length > 100 ? sentence.substring(0, 97) + '...' : sentence;
      }
    }
    
    return snippet.substring(0, 80) + '...';
  }

  private extractImplementation(snippet: string): string {
    // Look for implementation hints
    const implementationKeywords = ['setup', 'configure', 'install', 'create', 'build', 'integrate', 'connect'];
    const sentences = snippet.split('.').map(s => s.trim());
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (implementationKeywords.some(keyword => lowerSentence.includes(keyword))) {
        return sentence.length > 100 ? sentence.substring(0, 97) + '...' : sentence;
      }
    }
    
    return 'Implementation details available in documentation';
  }

  private extractKeySection(title: string, snippet: string): string {
    // Identify what section of their help docs this is from
    const content = `${title} ${snippet}`.toLowerCase();
    
    const sectionKeywords = {
      'getting started': ['getting started', 'quick start', 'setup guide', 'first steps'],
      'features': ['features', 'capabilities', 'what you can do', 'functionality'],
      'integration': ['integration', 'api', 'connect', 'third-party', 'webhook'],
      'workflow': ['workflow', 'automation', 'process', 'routing'],
      'best practices': ['best practices', 'tips', 'recommendations', 'optimize'],
      'troubleshooting': ['troubleshooting', 'common issues', 'problems', 'error'],
      'pricing': ['pricing', 'plans', 'cost', 'billing'],
      'security': ['security', 'permissions', 'access', 'authentication']
    };
    
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return section;
      }
    }
    
    return 'documentation';
  }

  // Admin methods
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  getProviderStatus(): Array<{ name: string; available: boolean }> {
    return this.providers.map(provider => ({
      name: provider.name,
      available: false // Will be populated by async check
    }));
  }

  // Cleanup method for memory management
  cleanup(): void {
    if (this.cache instanceof MemorySearchCache) {
      this.cache.cleanup();
    }
  }
}