import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getUserIndex } from '@/lib/pinecone';
import { embedChunks } from '@/app/embed';

export async function POST(request: NextRequest) {
  try {
    const { userQuery, competitorUrls, username } = await request.json();

    if (!userQuery || !competitorUrls || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
      return NextResponse.json(
        { error: 'userQuery and competitorUrls array are required' },
        { status: 400 }
      );
    }

    console.log('Starting comprehensive competitor analysis:', { userQuery, competitorUrls: competitorUrls.length });

    // Step 1: Get additional context from Pinecone
    let additionalContext = '';
    if (username) {
      try {
        const contextualInsights = await getContextualInsights(userQuery, username);
        additionalContext = contextualInsights.join(' ');
        console.log('Retrieved context insights:', contextualInsights.length);
      } catch (error) {
        console.warn('Failed to get contextual insights:', error);
      }
    }

    // Step 2: Synthesize search query with OpenAI
    const synthesizedQuery = await synthesizeSearchQuery(userQuery, additionalContext);
    console.log('Synthesized search query:', synthesizedQuery);

    // Step 3: Search 50+ pages per competitor
    const allSearchResults = [];
    for (const url of competitorUrls) {
      const results = await searchCompetitorPages(url, synthesizedQuery);
      allSearchResults.push(...results);
    }
    console.log('Total pages found:', allSearchResults.length);

    // Step 4: Read and analyze top pages
    const analyzedContent = await analyzePageContent(allSearchResults.slice(0, 50));
    console.log('Analyzed content from', analyzedContent.length, 'pages');

    // Step 5: Generate final summary
    const finalSummary = await generateCompetitiveSummary(userQuery, analyzedContent);

    return NextResponse.json({
      query: userQuery,
      synthesizedQuery,
      pagesAnalyzed: allSearchResults.length,
      summary: finalSummary.summary,
      insights: finalSummary.insights,
      references: allSearchResults.slice(0, 20).map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet
      }))
    });

  } catch (error) {
    console.error('Competitor analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform competitive analysis' },
      { status: 500 }
    );
  }
}

async function getContextualInsights(query: string, username: string): Promise<string[]> {
  try {
    // Generate embedding for the query
    const embeddings = await embedChunks([query]);
    const queryVector = embeddings[0].embedding;

    // Format username for Pinecone index
    const formattedUsername = username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Query user's Pinecone index for relevant context
    const index = getUserIndex(formattedUsername);
    const queryResponse = await index.namespace('ns1').query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true
    });

    if (!queryResponse?.matches) {
      return [];
    }

    // Extract text from matched context
    const contextualInsights = queryResponse.matches
      .filter(match => match.score && match.score > 0.7)
      .map(match => match.metadata?.text)
      .filter(Boolean) as string[];

    return contextualInsights;
  } catch (error) {
    console.error('Failed to get contextual insights:', error);
    return [];
  }
}

async function synthesizeSearchQuery(userQuery: string, additionalContext: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating precise Google search queries for competitive analysis. 
          
          Your task is to synthesize a user's product query with their additional context to create the most effective search query for finding how competitors solve similar problems in their help documentation.
          
          Return only the search query, nothing else. Make it specific and targeted for help desk/support documentation.`
        },
        {
          role: 'user',
          content: `User Query: "${userQuery}"
          
          Additional Context: ${additionalContext || 'None'}
          
          Create the best Google search query to find how competitors solve this problem in their help documentation:`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content?.trim() || userQuery;
  } catch (error) {
    console.error('Failed to synthesize search query:', error);
    return userQuery;
  }
}

async function searchCompetitorPages(competitorUrl: string, searchQuery: string): Promise<Array<{title: string, url: string, snippet: string}>> {
  try {
    // Extract domain from competitor URL
    const domain = new URL(competitorUrl).hostname;
    
    // Use Google Custom Search to find pages
    if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      console.warn('Google Search API not configured, using mock data');
      return getMockSearchResults(domain, searchQuery);
    }

    const searchResults = [];
    
    // Search multiple pages (up to 100 results across 10 API calls)
    for (let start = 1; start <= 91; start += 10) {
      try {
        const params = new URLSearchParams({
          key: process.env.GOOGLE_SEARCH_API_KEY,
          cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
          q: `site:${domain} ${searchQuery}`,
          num: '10',
          start: start.toString()
        });

        const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
        
        if (!response.ok) {
          console.warn(`Google Search API error for start=${start}:`, response.status);
          break;
        }

        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const results = data.items.map((item: { title: string; link: string; snippet: string }) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
          }));
          searchResults.push(...results);
        } else {
          break; // No more results
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Search error for start=${start}:`, error);
        break;
      }
    }

    return searchResults;
  } catch (error) {
    console.error('Failed to search competitor pages:', error);
    return [];
  }
}

function getMockSearchResults(domain: string, searchQuery: string): Array<{title: string, url: string, snippet: string}> {
  // Mock data for testing
  const mockResults = [];
  for (let i = 1; i <= 50; i++) {
    mockResults.push({
      title: `${searchQuery} - Help Article ${i} | ${domain}`,
      url: `https://${domain}/help/article-${i}`,
      snippet: `Learn how to implement ${searchQuery} effectively. This article covers best practices, setup instructions, and troubleshooting tips for getting the most out of this feature.`
    });
  }
  return mockResults;
}

async function analyzePageContent(searchResults: Array<{title: string, url: string, snippet: string}>): Promise<Array<{url: string, title: string, insights: string}>> {
  // For now, use snippets as content. In production, you'd fetch and parse full pages
  const analyzedContent = searchResults.map(result => ({
    url: result.url,
    title: result.title,
    insights: result.snippet
  }));

  return analyzedContent;
}

async function generateCompetitiveSummary(userQuery: string, analyzedContent: Array<{url: string, title: string, insights: string}>): Promise<{summary: string, insights: string[]}> {
  try {
    const contentText = analyzedContent.map(content => 
      `${content.title}: ${content.insights}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a competitive intelligence analyst. Analyze competitor help documentation to understand how they solve customer problems.

          Provide:
          1. A comprehensive summary of how competitors approach this problem
          2. Key insights about their solutions
          3. Specific recommendations for differentiation

          Be specific and actionable.`
        },
        {
          role: 'user',
          content: `User Query: "${userQuery}"

          Competitor Documentation Analysis:
          ${contentText}

          Please provide a comprehensive competitive analysis summary and key insights.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const fullResponse = response.choices[0]?.message?.content || 'No analysis available';
    
    // Split into summary and insights
    const lines = fullResponse.split('\n').filter(line => line.trim());
    const summary = lines.slice(0, 3).join(' ');
    const insights = lines.slice(3);

    return {
      summary,
      insights
    };
  } catch (error) {
    console.error('Failed to generate competitive summary:', error);
    return {
      summary: 'Analysis completed but summary generation failed.',
      insights: ['Unable to generate insights at this time.']
    };
  }
}