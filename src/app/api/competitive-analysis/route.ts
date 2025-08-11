import { NextResponse } from 'next/server';
import { withAuthAndValidation } from '@/lib/validation/middleware';
import { z } from '@/lib/validation';
import { getAuthServerSession } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { WebSearchService } from '@/lib/integrations';

// Request schema
const competitiveAnalysisRequestSchema = z.object({
  PRD: z.string().min(50, 'PRD must be at least 50 characters').max(10000, 'PRD too long'),
  COMPETITORS: z.array(z.string()).min(1, 'At least one competitor required').max(5, 'Maximum 5 competitors'),
  WHY_WE_WIN: z.string().min(20, 'Must be at least 20 characters').max(2000, 'Too long'),
  WHY_WE_LOSE: z.string().min(20, 'Must be at least 20 characters').max(2000, 'Too long')
});

export const POST = withAuthAndValidation(
  getAuthServerSession,
  competitiveAnalysisRequestSchema
)(async ({ body }) => {
  const { PRD, COMPETITORS, WHY_WE_WIN, WHY_WE_LOSE } = body!;
  const requestId = crypto.randomUUID();
  
  try {
    console.log(`[competitive-analysis] Starting analysis ${requestId} for ${COMPETITORS.length} competitors`);
    const startTime = Date.now();
    
    // Step 1: Extract problem statement from PRD
    const problemStatement = await extractProblem(PRD);
    console.log(`[competitive-analysis] Extracted problem: ${problemStatement.slice(0, 100)}...`);
    
    // Step 2: Search for competitor solutions
    const searchService = new WebSearchService();
    const competitorSolutions = await Promise.all(
      COMPETITORS.map(async (competitor) => {
        try {
          const searchQuery = `${competitor} ${problemStatement.slice(0, 50)} solution features`;
          const searchResults = await searchService.search({
            query: searchQuery,
            maxResults: 5,
            timeRange: 'year'
          });
          
          return {
            competitor,
            searchResults: searchResults.results
          };
        } catch (error) {
          console.error(`[competitive-analysis] Search failed for ${competitor}:`, error);
          return {
            competitor,
            searchResults: []
          };
        }
      })
    );
    
    console.log(`[competitive-analysis] Found ${competitorSolutions.reduce((sum, c) => sum + c.searchResults.length, 0)} total search results`);
    
    // Step 3: Analyze competitor approaches
    const competitorApproaches = await Promise.all(
      competitorSolutions.map(async ({ competitor, searchResults }) => {
        try {
          const analysis = await analyzeCompetitorApproach(
            competitor, 
            problemStatement, 
            searchResults
          );
          
          return {
            competitor,
            analysis,
            sources: searchResults.slice(0, 3).map(result => ({
              title: result.title,
              url: result.url,
              snippet: result.snippet
            }))
          };
        } catch (error) {
          console.error(`[competitive-analysis] Analysis failed for ${competitor}:`, error);
          return {
            competitor,
            analysis: {
              summary: 'Analysis unavailable - please try again with different competitors'
            },
            sources: []
          };
        }
      })
    );
    
    // Step 4: Analyze our approach
    const ourApproach = await analyzeOurApproach(PRD, problemStatement);
    
    // Step 5: Generate strategic comparison
    const comparison = await generateComparison(
      problemStatement,
      ourApproach,
      competitorApproaches,
      WHY_WE_WIN,
      WHY_WE_LOSE
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`[competitive-analysis] Completed analysis ${requestId} in ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      requestId,
      analysis: {
        problemStatement,
        ourApproach,
        competitorApproaches,
        comparison
      },
      metadata: {
        processingTime,
        searchResultsFound: competitorSolutions.reduce((sum, c) => sum + c.searchResults.length, 0),
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`[competitive-analysis] Analysis ${requestId} failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
      requestId
    }, { status: 500 });
  }
});

// Helper function to extract problem statement
async function extractProblem(prd: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract the core problem being solved from this PRD. Return ONLY the problem statement in 1-2 sentences, starting with "The problem is..."'
        },
        {
          role: 'user',
          content: `PRD: ${prd}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content?.trim() || 'Unable to extract problem statement';
  } catch (error) {
    console.error('[extractProblem] Failed:', error);
    return 'Problem extraction failed';
  }
}

// Helper function to analyze our approach
async function analyzeOurApproach(prd: string, problemStatement: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analyze this PRD and extract our solution approach. Return JSON with:
          - solution_approach: How we solve the problem (2-3 sentences)
          - key_methodology: Our core methodology (1-2 sentences) 
          - unique_aspects: What makes our approach unique (1-2 sentences)
          
          Be concise and focus on the solution, not the problem.`
        },
        {
          role: 'user',
          content: `Problem: ${problemStatement}\n\nOur PRD: ${prd}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('[analyzeOurApproach] Failed:', error);
    return {
      solution_approach: 'Analysis unavailable',
      key_methodology: 'Unable to determine methodology',
      unique_aspects: 'Analysis failed'
    };
  }
}

// Helper function to analyze competitor approach
async function analyzeCompetitorApproach(
  competitor: string, 
  problemStatement: string, 
  searchResults: { title: string; snippet: string }[]
) {
  if (searchResults.length === 0) {
    return {
      summary: 'No information found about how this competitor addresses the problem. Try searching manually or adding different competitors.'
    };
  }

  try {
    const searchContent = searchResults
      .slice(0, 5)
      .map(result => `${result.title}: ${result.snippet}`)
      .join('\n\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analyze how ${competitor} solves this problem based on search results. 
          
          Return JSON with a single field:
          - summary: A concise 3-4 sentence summary of their approach and key differentiators
          
          Focus on what makes their solution unique and how it compares to typical approaches. Base analysis only on the provided search results.`
        },
        {
          role: 'user',
          content: `Problem: ${problemStatement}\n\nSearch Results about ${competitor}:\n${searchContent}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 400
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    
    return JSON.parse(content);
  } catch (error) {
    console.error(`[analyzeCompetitorApproach] Failed for ${competitor}:`, error);
    return {
      summary: 'Analysis unavailable due to processing error. The search results may have been insufficient or the competitor information was unclear.'
    };
  }
}

// Helper function to generate strategic comparison
async function generateComparison(
  problemStatement: string,
  ourApproach: { solution_approach: string; key_methodology: string; unique_aspects: string },
  competitorApproaches: { competitor: string; analysis: { summary: string } }[],
  whyWeWin: string,
  whyWeLose: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Generate strategic competitive analysis. Return JSON with:
          - competitiveLandscape: Overall market overview (2-3 sentences)
          - ourPosition: Where we fit in the market (2-3 sentences)
          - keyInsights: Array of 3-5 strategic insights
          - recommendations: Array of 3-5 actionable recommendations
          - differentiationOpportunities: Array of 3-4 opportunities to differentiate
          
          Focus on strategic insights that help with product positioning and development priorities.`
        },
        {
          role: 'user',
          content: `
Problem: ${problemStatement}

Our Approach: ${JSON.stringify(ourApproach)}

Competitor Analysis: ${JSON.stringify(competitorApproaches)}

Our Advantages: ${whyWeWin}

Our Disadvantages: ${whyWeLose}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1200
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('[generateComparison] Failed:', error);
    return {
      competitiveLandscape: 'Analysis unavailable due to processing error',
      ourPosition: 'Unable to determine market position',
      keyInsights: ['Analysis failed - please try again'],
      recommendations: ['Unable to generate recommendations'],
      differentiationOpportunities: ['Analysis incomplete']
    };
  }
}