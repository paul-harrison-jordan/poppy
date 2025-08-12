import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface WebSearchResult {
  title: string;
  content: string;
  url: string;
  relevance: number;
}

export interface HelpDocsInsight {
  feature: string;
  description: string;
  customerBenefit: string;
  implementationHints: string;
  confidence: number;
}

export class WebSearchService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000,
    });
  }

  /**
   * Performs targeted searches on a help documentation site
   * In production, this would use a real web search API or web scraping
   */
  async searchHelpDocs(
    baseUrl: string,
    searchQueries: string[]
  ): Promise<WebSearchResult[]> {
    const results: WebSearchResult[] = [];
    
    try {
      // Parse the base URL to get the domain
      const url = new URL(baseUrl);
      const domain = url.hostname;
      
      // Simulate fetching and analyzing pages from the help docs
      // In production, you would:
      // 1. Use a web scraping library like Puppeteer or Playwright
      // 2. Or use a search API like Google Custom Search, Bing API, or SerpAPI
      // 3. Or fetch the sitemap and crawl relevant pages
      
      const commonHelpPaths = [
        '/features',
        '/getting-started',
        '/guide',
        '/documentation',
        '/tutorials',
        '/use-cases',
        '/integrations',
        '/api',
        '/faq',
        '/best-practices'
      ];
      
      // For demonstration, we'll simulate analyzing key pages
      for (const path of commonHelpPaths.slice(0, 5)) {
        const fullUrl = `${url.protocol}//${domain}${path}`;
        
        // In production, you would fetch and parse the actual page
        // const pageContent = await this.fetchPage(fullUrl);
        
        // Simulate extracted content
        const simulatedContent = this.getSimulatedContent(path);
        
        if (simulatedContent) {
          results.push({
            title: this.getTitleFromPath(path),
            content: simulatedContent,
            url: fullUrl,
            relevance: this.calculateRelevance(simulatedContent, searchQueries)
          });
        }
      }
      
      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);
      
    } catch (error) {
      console.error('Error searching help docs:', error);
    }
    
    return results;
  }

  /**
   * Analyzes search results to extract feature insights
   */
  async analyzeSearchResults(
    results: WebSearchResult[],
    competitor: string
  ): Promise<{ insights: HelpDocsInsight[] }> {
    if (results.length === 0) {
      return {
        insights: [{
          feature: 'Limited Documentation Available',
          description: 'Unable to access detailed help documentation for analysis',
          customerBenefit: 'Documentation may be behind authentication or limited',
          implementationHints: 'Consider alternative research methods',
          confidence: 0.3
        }]
      };
    }

    // Combine top results for analysis
    const combinedContent = results
      .slice(0, 5)
      .map(r => `Page: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n---`)
      .join('\n');

    const systemPrompt = `You are analyzing help documentation from ${competitor}'s website to extract competitive intelligence about their features and value propositions.`;

    const userPrompt = `Analyze this help documentation content and extract insights about their key features and how they communicate value to customers:

${combinedContent}

For each major feature or capability you identify, provide:
1. The feature name
2. How they describe what it does
3. The specific customer benefit they emphasize
4. Any implementation details or usage patterns mentioned
5. Your confidence in this insight (0-1)

Focus on concrete features and capabilities, not generic marketing language.

Return your analysis as a JSON object with this structure:
{
  "insights": [
    {
      "feature": "Feature name",
      "description": "What the feature does",
      "customerBenefit": "The value proposition for customers",
      "implementationHints": "How it works or should be used",
      "confidence": 0.8
    }
  ]
}`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]);

      const content = response.content.toString();
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { insights: [] };
    } catch (error) {
      console.error('Error analyzing search results:', error);
      return { insights: [] };
    }
  }

  private getSimulatedContent(path: string): string {
    // Simulated content for demonstration
    // In production, this would be replaced with actual fetched content
    const contentMap: Record<string, string> = {
      '/features': `
        Our platform provides comprehensive workflow automation capabilities including:
        - Smart Task Routing: Automatically assigns tasks based on team member skills and availability
        - Real-time Collaboration: Built-in chat, comments, and @mentions keep everyone aligned
        - Custom Workflows: Drag-and-drop workflow builder with 50+ pre-built templates
        - Advanced Analytics: Track productivity metrics, bottlenecks, and team performance
        - Integration Hub: Connect with Slack, Jira, GitHub, and 100+ other tools
        
        Each feature is designed to reduce manual work by up to 60% while improving visibility across teams.
      `,
      '/getting-started': `
        Getting started is simple and takes less than 10 minutes:
        1. Connect your existing tools through our one-click integrations
        2. Import your team members from Slack or manually add them
        3. Choose a workflow template or build your own
        4. Set up automation rules and triggers
        5. Monitor everything through customizable dashboards
        
        Our AI-powered setup assistant guides you through each step and suggests optimal configurations based on your team size and industry.
      `,
      '/guide': `
        Best practices for maximizing value:
        - Start with simple automations and gradually add complexity
        - Use our pre-built templates as a starting point
        - Set up notifications to keep stakeholders informed
        - Review analytics weekly to identify optimization opportunities
        - Leverage our API for custom integrations with proprietary systems
      `,
      '/integrations': `
        Native integrations with all major tools:
        - Project Management: Jira, Asana, Trello, Monday.com
        - Communication: Slack, Microsoft Teams, Discord
        - Development: GitHub, GitLab, Bitbucket, Jenkins
        - Cloud Storage: Google Drive, Dropbox, OneDrive
        - CRM: Salesforce, HubSpot, Pipedrive
        
        Our REST API and webhooks enable custom integrations with any system. Pre-built SDKs available for Python, JavaScript, and Java.
      `,
      '/use-cases': `
        Common use cases across industries:
        - Software Development: Automate code reviews, deployment pipelines, and bug tracking
        - Marketing: Streamline campaign management, content approval, and performance tracking
        - Sales: Accelerate lead routing, proposal generation, and pipeline management
        - Customer Support: Optimize ticket routing, SLA tracking, and knowledge base updates
        - HR: Simplify onboarding, time-off requests, and performance reviews
        
        Customers typically see 40% faster project completion and 30% reduction in operational costs.
      `
    };
    
    return contentMap[path] || '';
  }

  private getTitleFromPath(path: string): string {
    const titleMap: Record<string, string> = {
      '/features': 'Platform Features',
      '/getting-started': 'Getting Started Guide',
      '/guide': 'User Guide',
      '/documentation': 'Documentation',
      '/tutorials': 'Tutorials',
      '/use-cases': 'Use Cases',
      '/integrations': 'Integrations',
      '/api': 'API Reference',
      '/faq': 'Frequently Asked Questions',
      '/best-practices': 'Best Practices'
    };
    
    return titleMap[path] || 'Help Documentation';
  }

  private calculateRelevance(content: string, queries: string[]): number {
    let relevance = 0;
    const contentLower = content.toLowerCase();
    
    for (const query of queries) {
      const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          relevance += 1;
        }
      }
    }
    
    return Math.min(relevance / queries.length, 1);
  }
}