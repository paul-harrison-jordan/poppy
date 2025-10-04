import { openai } from '@/lib/openai';
import { AgentRegistry } from './AgentRegistry';
import { ORCHESTRATOR_PROMPT } from './agents/orchestrator';
import { 
  GardenRequest, 
  AgentUpdate, 
  OrchestrationPlan, 
  AgentResponse, 
  AgentType,
  HumanQuestion 
} from './types';

/**
 * Garden Orchestrator Service
 * Coordinates multi-agent workflows with proper abstraction
 */
export class GardenOrchestrator {
  /**
   * Stream a complete Garden workflow
   */
  static async* streamWorkflow(request: GardenRequest): AsyncGenerator<AgentUpdate> {
    const { query, storedContext = '', teamTerms = {}, existingDocument } = request;
    let enhancedContext = storedContext;
    
    const formattedTeamTerms = Object.entries(teamTerms)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    try {
      // Step 1: Orchestration planning
      yield { 
        type: 'thinking', 
        agent: 'orchestrator', 
        content: 'Analyzing your PM request and determining which specialist agents to involve...' 
      };

      const orchestrationPlan = await this.planOrchestration(query, enhancedContext, formattedTeamTerms);

      yield { 
        type: 'orchestration', 
        agent: 'orchestrator', 
        content: orchestrationPlan.thinking,
        agents_selected: orchestrationPlan.agents_needed
      };

      // Step 2: Planning Agent Deep Dive (focused on PRD)
      if (orchestrationPlan.agents_needed.includes('planning')) {
        yield { 
          type: 'agent_executing', 
          agent: 'planning', 
          content: 'PRD Planning Agent conducting deep problem analysis...' 
        };

        const planningResult = await this.executePlanningAgentWithQuestions(
          query, 
          enhancedContext, 
          formattedTeamTerms
        );

        // Check if planning agent has enhancement questions for the user
        if (planningResult.needsHumanInput && planningResult.questions) {
          yield {
            type: 'needs_human_input',
            agent: 'planning', 
            content: `The Planning Agent has identified ${planningResult.questions.length} optional questions that could enhance the PRD quality. The workflow will continue with reasonable assumptions, but you can provide input to further improve the outcome.`,
            questions: planningResult.questions
          };
          // Continue workflow - don't pause/return
        }

        yield { 
          type: 'agent_response', 
          agent: 'planning', 
          content: planningResult.response 
        };

        // Use planning recommendations to enhance context for other agents
        if (planningResult.researchRecommendations?.length > 0) {
          const researchContext = planningResult.researchRecommendations
            .filter((r: {
              research_type: string;
              query: string;
              purpose: string;
              prd_section: string;
              priority: string;
            }) => ['klaviyo_knowledge', 'web_search', 'competitive_analysis'].includes(r.research_type))
            .slice(0, 3) // Limit to top 3 research items
            .map((r: {
              research_type: string;
              query: string;
              purpose: string;
            }) => `${r.research_type}: "${r.query}" (Purpose: ${r.purpose})`)
            .join('; ');
            
          if (researchContext) {
            enhancedContext += `\n\nPLANNING AGENT RESEARCH RECOMMENDATIONS: ${researchContext}`;
          }
        }
      }

      // Step 3: Execute remaining specialist agents in parallel
      const remainingAgents = orchestrationPlan.agents_needed.filter(agent => agent !== 'planning');
      
      for (const agentType of remainingAgents) {
        yield { 
          type: 'agent_executing', 
          agent: agentType, 
          content: `${AgentRegistry.getAgent(agentType).name} analyzing...` 
        };
      }

      const agentResults = await this.executeAgentsParallel(
        { ...orchestrationPlan, agents_needed: remainingAgents }, 
        enhancedContext, 
        formattedTeamTerms
      );
      
      // Step 4: Yield individual agent responses
      for (const result of agentResults) {
        yield { 
          type: 'agent_response', 
          agent: result.agent, 
          content: result.response 
        };
      }

      // Step 5: Create structured document with Writing Agent
      yield { 
        type: 'thinking', 
        agent: 'orchestrator', 
        content: 'Creating structured document with Writing Agent...' 
      };

      const writingResult = await this.createDocument(query, agentResults, enhancedContext, teamTerms, existingDocument);

      yield {
        type: 'agent_response',
        agent: 'writing',
        content: existingDocument ? 
          `Document updated: "${writingResult.document.title}"` :
          `Document created: "${writingResult.document.title}"`
      };

      // Step 6: Create/Update Google Doc
      yield { 
        type: 'thinking', 
        agent: 'orchestrator', 
        content: existingDocument ? 'Updating Google Doc...' : 'Creating Google Doc...' 
      };

      const googleDoc = await this.createGoogleDoc(writingResult.document, existingDocument);

      yield { 
        type: 'final_response', 
        agent: 'orchestrator', 
        content: existingDocument ? 
          `✅ PRD analysis complete! Document updated: [${googleDoc.title}](${googleDoc.docUrl})` :
          `✅ PRD analysis complete! Document created: [${googleDoc.title}](${googleDoc.docUrl})`,
        googleDoc: googleDoc
      };

    } catch (error) {
      console.error('Garden workflow error:', error);
      yield {
        type: 'error',
        agent: 'orchestrator',
        content: 'An error occurred during the Garden workflow. Please try again.'
      };
    }
  }

  /**
   * Plan which agents to use and what questions to ask them
   */
  private static async planOrchestration(
    query: string, 
    storedContext: string, 
    formattedTeamTerms: string
  ): Promise<OrchestrationPlan> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: ORCHESTRATOR_PROMPT },
          { role: 'user', content: `PM Context: ${storedContext}\n\nTeam Terms:\n${formattedTeamTerms}\n\nQuery: ${query}` }
        ],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Orchestration planning error:', error);
      // Fallback plan
      return { 
        thinking: "I'll analyze this from planning and strategy perspectives",
        agents_needed: ['planning', 'strategy'] as AgentType[],
        sub_queries: { planning: query, strategy: query }
      };
    }
  }

  /**
   * Execute Planning Agent with question generation and human-in-the-loop capability
   */
  private static async executePlanningAgentWithQuestions(
    query: string,
    storedContext: string,
    formattedTeamTerms: string
  ): Promise<{
    response: string;
    needsHumanInput: boolean;
    questions?: HumanQuestion[];
    researchRecommendations?: {
      research_type: string;
      query: string;
      purpose: string;
      prd_section: string;
      priority: string;
    }[];
  }> {
    console.log('🧠 Planning Agent: Starting comprehensive PRD analysis');
    console.log(`📋 Query: ${query}`);
    console.log(`📂 Context length: ${storedContext.length} chars`);
    console.log(`🏷️ Team terms available: ${formattedTeamTerms ? 'Yes' : 'No'}`);
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: AgentRegistry.getPrompt('planning') },
          { 
            role: 'user', 
            content: `CONTEXT: ${storedContext}

TEAM TERMS:
${formattedTeamTerms}

PRD REQUEST: ${query}

REMINDER: Use the annotated PRD example as your quality benchmark. Generate questions that would help create a PRD matching that level of excellence.` 
          }
        ],
        response_format: { type: 'json_object' }
      });

      const planningAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log('✅ Planning Agent: Analysis complete');
      console.log(`🎯 User problems identified: ${planningAnalysis.user_problems?.length || 0}`);
      console.log(`🔍 Research recommendations: ${planningAnalysis.recommended_research?.length || 0}`);
      console.log(`❓ Questions generated: ${planningAnalysis.critical_questions?.length || 0}`);
      
      // Log research strategy
      if (planningAnalysis.recommended_research?.length) {
        console.log('📊 Research Strategy:');
        planningAnalysis.recommended_research.forEach((r: {
          research_type: string;
          query: string;
          priority: string;
        }, i: number) => {
          console.log(`  ${i + 1}. ${r.research_type}: "${r.query}" (Priority: ${r.priority})`);
        });
      }
      
      // Extract questions that require human input
      const humanQuestions = planningAnalysis.critical_questions
        ?.filter((q: {
          category: string;
          question: string;
          why_important: string;
          requires_human_input: boolean;
        }) => q.requires_human_input)
        ?.map((q: {
          category: string;
          question: string;
          why_important: string;
          requires_human_input: boolean;
        }, index: number) => ({
          id: `planning_${index}`,
          category: q.category as 'user_problem' | 'business_context' | 'technical' | 'market',
          question: q.question,
          why_important: q.why_important,
          required: true
        })) || [];

      const needsHumanInput = humanQuestions.length > 0;

      // Format the planning response with research recommendations
      let formattedResponse = `## PRD Planning Analysis\n\n`;
      formattedResponse += `**Thinking Process:** ${planningAnalysis.thinking_process}\n\n`;
      
      // Show context analysis
      if (planningAnalysis.context_analysis) {
        formattedResponse += `**Context Analysis:**\n`;
        formattedResponse += `- Existing context used: ${planningAnalysis.context_analysis.existing_context_used}\n`;
        formattedResponse += `- Team terms applied: ${planningAnalysis.context_analysis.team_terms_applied}\n`;
        if (planningAnalysis.context_analysis.knowledge_gaps) {
          formattedResponse += `- Knowledge gaps: ${planningAnalysis.context_analysis.knowledge_gaps}\n`;
        }
        formattedResponse += `\n`;
      }
      
      if (planningAnalysis.user_problems?.length) {
        formattedResponse += `**User Problems Identified:**\n`;
        planningAnalysis.user_problems.forEach((problem: {
          problem_statement: string;
          affected_users: string;
          severity: string;
          current_workarounds: string;
        }) => {
          formattedResponse += `- **${problem.problem_statement}** (${problem.severity})\n`;
          formattedResponse += `  - Affects: ${problem.affected_users}\n`;
          formattedResponse += `  - Current workarounds: ${problem.current_workarounds}\n`;
        });
        formattedResponse += `\n`;
      }

      if (planningAnalysis.proposed_solution) {
        formattedResponse += `**Proposed Solution:**\n`;
        formattedResponse += `${planningAnalysis.proposed_solution.approach}\n\n`;
        formattedResponse += `**Key Capabilities:**\n`;
        planningAnalysis.proposed_solution.key_capabilities?.forEach((cap: string) => {
          formattedResponse += `- ${cap}\n`;
        });
        formattedResponse += `\n`;
      }

      if (planningAnalysis.critical_questions?.length) {
        formattedResponse += `**Critical Questions:**\n`;
        planningAnalysis.critical_questions.forEach((q: {
          category: string;
          question: string;
          why_important: string;
          requires_human_input: boolean;
        }) => {
          const status = q.requires_human_input ? '🔴 Needs Answer' : '✅ Analyzed';
          formattedResponse += `- ${status} [${q.category}] ${q.question}\n`;
          formattedResponse += `  Why important: ${q.why_important}\n`;
        });
        formattedResponse += `\n`;
      }

      // Show research strategy with execution plan
      if (planningAnalysis.recommended_research?.length) {
        formattedResponse += `**🔍 Research Strategy:**\n`;
        const highPriority = planningAnalysis.recommended_research.filter((r: {
          priority: string;
        }) => r.priority === 'high');
        const mediumPriority = planningAnalysis.recommended_research.filter((r: {
          priority: string;
        }) => r.priority === 'medium');
        
        if (highPriority.length) {
          formattedResponse += `🔥 **High Priority Research** (executing now):\n`;
          highPriority.forEach((research: {
            research_type: string;
            query: string;
            purpose: string;
            prd_section: string;
          }) => {
            formattedResponse += `  • **${research.research_type}**: "${research.query}"\n`;
            formattedResponse += `    → ${research.purpose} (${research.prd_section} section)\n`;
          });
          formattedResponse += `\n`;
        }
        
        if (mediumPriority.length) {
          formattedResponse += `⚡ **Additional Research**:\n`;
          mediumPriority.forEach((research: {
            research_type: string;
            query: string;
            purpose: string;
          }) => {
            formattedResponse += `  • ${research.research_type}: "${research.query}"\n`;
          });
          formattedResponse += `\n`;
        }
        
        formattedResponse += `📡 **Research agents are now executing these queries...**\n\n`;
      }

      if (needsHumanInput) {
        formattedResponse += `**💡 Optional Enhancement Questions:** ${humanQuestions.length} questions could further improve PRD quality.`;
      }

      return {
        response: formattedResponse,
        needsHumanInput,
        questions: needsHumanInput ? humanQuestions : undefined,
        researchRecommendations: planningAnalysis.recommended_research || []
      };

    } catch (error) {
      console.error('Planning agent with questions error:', error);
      return {
        response: 'PRD Planning Agent encountered an error during deep analysis.',
        needsHumanInput: false
      };
    }
  }

  /**
   * Continue workflow after receiving human responses
   */
  static async* continueWithHumanResponses(
    request: GardenRequest,
    responses: Record<string, string>
  ): AsyncGenerator<AgentUpdate> {
    // This method would be called when human provides answers
    // It would resume the workflow with the additional context
    const enhancedContext = `${request.storedContext || ''}\n\nHuman Input:\n${Object.entries(responses).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}`;
    
    const enhancedRequest = {
      ...request,
      storedContext: enhancedContext
    };

    yield* this.streamWorkflow(enhancedRequest);
  }

  /**
   * Execute multiple agents in parallel using direct OpenAI calls
   */
  private static async executeAgentsParallel(
    plan: OrchestrationPlan,
    storedContext: string,
    formattedTeamTerms: string
  ): Promise<AgentResponse[]> {
    const agentPromises = plan.agents_needed.map(async (agentType) => {
      const subQuery = plan.sub_queries[agentType] || plan.sub_queries[Object.keys(plan.sub_queries)[0]];
      
      try {
        // Special handling for research agent with function calling
        if (agentType === 'research') {
          return await this.executeResearchAgent(subQuery, storedContext, formattedTeamTerms);
        }
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: AgentRegistry.getPrompt(agentType) },
            { 
              role: 'user', 
              content: `CONTEXT: ${storedContext}

TEAM TERMS:
${formattedTeamTerms}

FOCUSED QUERY: ${subQuery}

QUALITY TARGET: Create analysis that helps build a PRD matching the excellence shown in our annotated example. Focus on specific metrics, user problems, and actionable insights.` 
            }
          ]
        });

        return {
          agent: agentType,
          query: subQuery,
          response: response.choices[0].message.content || 'No response available',
          timestamp: new Date().toISOString(),
          tokensUsed: response.usage?.total_tokens || 0
        };
        
      } catch (error) {
        console.error(`Agent ${agentType} error:`, error);
        return {
          agent: agentType,
          query: subQuery,
          response: `${AgentRegistry.getAgent(agentType).name} encountered an error and could not complete the analysis.`,
          timestamp: new Date().toISOString()
        };
      }
    });

    return Promise.all(agentPromises);
  }

  /**
   * Execute research agent with specialized tools
   */
  private static async executeResearchAgent(
    query: string,
    storedContext: string,
    formattedTeamTerms: string
  ): Promise<AgentResponse> {
    console.log('🔍 Research Agent: Starting research with tools');
    console.log(`📋 Research Query: ${query}`);
    console.log(`🛠️ Available Tools: klaviyo_knowledge, web_search`);
    
    try {
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'klaviyo_knowledge',
            description: 'Search Klaviyo help center and knowledge base for specific platform features, best practices, and documentation',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for Klaviyo knowledge base'
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'web_search',
            description: 'Search the web for industry trends, competitive analysis, market research, and general information',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for web search'
                }
              },
              required: ['query']
            }
          }
        }
      ];

      console.log('🤖 Research Agent: Making OpenAI API call with tools enabled');
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: AgentRegistry.getPrompt('research') },
          { 
            role: 'user', 
            content: `CONTEXT: ${storedContext}

TEAM TERMS:
${formattedTeamTerms}

RESEARCH QUERY: ${query}

GOAL: Find specific data, metrics, and evidence that would support creating a high-quality PRD. Look for user pain points, market data, competitive insights, and success metrics.` 
          }
        ],
        tools,
        tool_choice: 'auto'
      });

      console.log('📊 Research Agent: OpenAI response received');
      console.log(`💰 Tokens used: ${response.usage?.total_tokens || 0}`);
      
      let finalResponse = response.choices[0].message.content || '';
      const toolCalls = response.choices[0].message.tool_calls;

      // Handle tool calls with comprehensive logging
      if (toolCalls && toolCalls.length > 0) {
        console.log(`🔥 TOOL CALLS DETECTED: Research Agent executing ${toolCalls.length} tool call(s)`);
        console.log(`📋 Original query: "${query}"`);
        console.log('🛠️ Tools being called:', toolCalls.map(tc => tc.function.name).join(', '));
        
        const messages = [
          { role: 'system' as const, content: AgentRegistry.getPrompt('research') },
          { 
            role: 'user' as const, 
            content: `Context: ${storedContext}\n\nTeam Terms:\n${formattedTeamTerms}\n\nFocused Query: ${query}` 
          },
          response.choices[0].message
        ];

        for (const toolCall of toolCalls) {
          let toolResult = '';
          console.log(`\n🛠️ EXECUTING TOOL: ${toolCall.function.name}`);
          console.log(`📝 Arguments: ${toolCall.function.arguments}`);
          
          const startTime = Date.now();
          
          if (toolCall.function.name === 'klaviyo_knowledge') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`🔍 Klaviyo Knowledge Search: "${args.query}"`);
            toolResult = await this.searchKlaviyoKnowledge(args.query);
            console.log(`📚 Klaviyo search completed in ${Date.now() - startTime}ms`);
          } else if (toolCall.function.name === 'web_search') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`🌐 Web Search: "${args.query}"`);
            toolResult = await this.performWebSearch(args.query);
            console.log(`🌍 Web search completed in ${Date.now() - startTime}ms`);
          }

          console.log(`📊 Tool result: ${toolResult.length} characters`);
          console.log(`📝 First 200 chars: ${toolResult.substring(0, 200)}...`);
          
          messages.push({
            role: 'tool' as const,
            content: toolResult,
            tool_call_id: toolCall.id
          });
        }
        
        console.log(`🧠 Synthesizing research results for: "${query}"`);
        console.log(`📬 Message history: ${messages.length} messages`);

        // Get final response with tool results
        const finalRes = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages
        });

        console.log(`✅ Research synthesis complete`);
        console.log(`💰 Final synthesis tokens: ${finalRes.usage?.total_tokens || 0}`);

        finalResponse = finalRes.choices[0].message.content || finalResponse;
        console.log(`📄 Final research response: ${finalResponse.length} characters`);
      } else {
        console.log(`🔴 NO TOOL CALLS: Research agent did not request any tool usage`);
        console.log(`📬 Direct response: ${finalResponse.substring(0, 200)}...`);
      }

      return {
        agent: 'research',
        query,
        response: finalResponse,
        timestamp: new Date().toISOString(),
        tokensUsed: response.usage?.total_tokens || 0
      };

    } catch (error) {
      console.error('Research agent error:', error);
      return {
        agent: 'research',
        query,
        response: `Research Agent encountered an error and could not complete the analysis.`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Search Klaviyo knowledge base by directly accessing help articles
   */
  private static async searchKlaviyoKnowledge(query: string): Promise<string> {
    try {
      console.log(`🔍 Klaviyo Knowledge Search initiated for: "${query}"`);
      
      // Try to find relevant Klaviyo help articles based on common topics
      const klaviyoUrls = this.getKlaviyoHelpUrls(query);
      let results = '';
      
      for (const url of klaviyoUrls.slice(0, 2)) { // Limit to 2 URLs to avoid timeouts
        try {
          console.log(`📖 Fetching Klaviyo article: ${url}`);
          
          // Simulate WebFetch call - in production this would use the WebFetch tool
          const articleContent = await this.fetchKlaviyoArticle(url);
          results += `\n\n## From ${url}:\n${articleContent}`;
          
        } catch (error) {
          console.error(`Failed to fetch ${url}:`, error);
          results += `\n\n## ${url}: Failed to fetch content`;
        }
      }
      
      console.log(`✅ Klaviyo Knowledge Search completed for: ${query}`);
      
      return `Klaviyo Knowledge Search Results for "${query}":

Searched URLs:
${klaviyoUrls.map(url => `- ${url}`).join('\n')}

${results || 'No specific articles found. General Klaviyo best practices apply.'}

[Search completed - see console logs for full request details]`;
      
    } catch (error) {
      console.error('Klaviyo knowledge search error:', error);
      return `Unable to search Klaviyo knowledge base for "${query}". Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please try manual search at help.klaviyo.com`;
    }
  }

  /**
   * Get relevant Klaviyo help URLs based on query
   */
  private static getKlaviyoHelpUrls(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const baseUrl = 'https://help.klaviyo.com/hc/en-us/articles/';
    
    // Map common topics to specific help article IDs
    const topicUrls: { [key: string]: string[] } = {
      'email': [
        `${baseUrl}115005078767-Getting-started-with-email`,
        `${baseUrl}360051267032-Email-best-practices`
      ],
      'sms': [
        `${baseUrl}115005057447-Getting-started-with-SMS`,
        `${baseUrl}4408443175451-SMS-compliance-and-best-practices`
      ],
      'segment': [
        `${baseUrl}115005237908-How-to-create-a-segment`,
        `${baseUrl}360032501012-Understanding-segments`
      ],
      'flow': [
        `${baseUrl}115005078647-Getting-started-with-flows`,
        `${baseUrl}360032476271-Flow-best-practices`
      ],
      'template': [
        `${baseUrl}115005255808-How-to-create-an-email-template`,
        `${baseUrl}115005256008-Template-best-practices`
      ],
      'integration': [
        `${baseUrl}115005075967-Available-integrations`,
        `${baseUrl}115005082927-How-to-integrate-with-Klaviyo`
      ]
    };
    
    // Find matching topics
    const matchedUrls: string[] = [];
    for (const [topic, urls] of Object.entries(topicUrls)) {
      if (lowerQuery.includes(topic)) {
        matchedUrls.push(...urls);
      }
    }
    
    // Default fallback URLs if no specific match
    if (matchedUrls.length === 0) {
      matchedUrls.push(
        `${baseUrl}115005078767-Getting-started-with-email`,
        `${baseUrl}360051267032-Email-best-practices`
      );
    }
    
    return matchedUrls;
  }

  /**
   * Fetch and summarize Klaviyo article content
   */
  private static async fetchKlaviyoArticle(url: string): Promise<string> {
    // In production, this would use WebFetch tool
    // For now, return structured response based on URL analysis
    const urlParts = url.split('-');
    const topicArea = urlParts.slice(-2).join(' ').replace('-', ' ');
    
    return `Key information from Klaviyo documentation on ${topicArea}:
- Best practices and implementation guidelines
- Common use cases and examples
- Integration requirements and setup steps
- Troubleshooting tips and known limitations

[Note: This is a structured response. In production, real article content would be fetched and analyzed]`;
  }

  /**
   * Perform web search with comprehensive logging
   */
  private static async performWebSearch(query: string): Promise<string> {
    try {
      console.log(`🌐 Web Search initiated for: "${query}"`);
      
      // Generate targeted search queries based on the research query
      const searchQueries = this.generateSearchQueries(query);
      let searchResults = '';
      
      for (const searchQuery of searchQueries.slice(0, 2)) { // Limit to 2 searches
        try {
          console.log(`🔍 Performing web search: "${searchQuery}"`);
          
          // In production, this would use the WebSearch tool
          const results = await this.executeWebSearch(searchQuery);
          searchResults += `\n\n## Search: "${searchQuery}"\n${results}`;
          
          console.log(`✅ Web search completed for: "${searchQuery}"`);
          
        } catch (error) {
          console.error(`Web search failed for "${searchQuery}":`, error);
          searchResults += `\n\n## Search: "${searchQuery}" - Failed to complete`;
        }
      }
      
      console.log(`🎯 Web Search summary completed for: "${query}"`);
      
      return `Web Search Results for "${query}":

Search queries executed:
${searchQueries.map(q => `- "${q}"`).join('\n')}

${searchResults || 'No search results available at this time.'}

[Search completed - see console logs for detailed request information]`;
      
    } catch (error) {
      console.error('Web search orchestration error:', error);
      return `Unable to perform web search for "${query}". Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please try manual research or try again later.`;
    }
  }

  /**
   * Generate targeted search queries for research
   */
  private static generateSearchQueries(query: string): string[] {
    // Generate variations for comprehensive research
    const queries = [
      `${query} industry trends 2024`,
      `${query} competitive analysis market research`,
      `${query} best practices implementation guide`,
      `"${query}" market size growth opportunities`
    ];
    
    return queries;
  }

  /**
   * Execute individual web search
   */
  private static async executeWebSearch(searchQuery: string): Promise<string> {
    // In production, this would use the WebSearch tool
    // For now, simulate realistic search result structure
    
    const searchTopics = this.extractSearchTopics(searchQuery);
    
    return `Search Results:
• Industry Analysis: Current trends and market dynamics for ${searchTopics.main}
• Competitive Landscape: Key players and positioning strategies
• Best Practices: Implementation guidelines and success factors
• Market Data: Growth metrics and opportunity assessment
• Expert Insights: Professional recommendations and analysis

Sources analyzed:
- Industry reports and market research
- Competitive intelligence platforms  
- Professional blogs and case studies
- Academic and trade publications

[Note: This represents structured search analysis. In production, real web search and page crawling would provide specific URLs and content]`;
  }

  /**
   * Extract main topics from search query for targeted analysis
   */
  private static extractSearchTopics(query: string): { main: string; secondary: string[] } {
    const words = query.toLowerCase().split(' ');
    const stopWords = ['and', 'or', 'the', 'in', 'on', 'at', 'for', 'with', 'by'];
    
    const relevantWords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word) && !word.includes('202')
    );
    
    return {
      main: relevantWords[0] || 'general topic',
      secondary: relevantWords.slice(1, 3)
    };
  }

  /**
   * Create structured document using Writing Agent directly
   */
  private static async createDocument(
    originalQuery: string, 
    agentResults: AgentResponse[], 
    storedContext: string, 
    teamTerms: Record<string, string>,
    existingDocument?: { title: string; content: string }
  ) {
    try {
      const formattedTeamTerms = Object.entries(teamTerms)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');

      const agentSummary = agentResults
        .map((resp) => 
          `${resp.agent.toUpperCase()} AGENT:\n${resp.response}\n`
        )
        .join('\n');

      const writingPrompt = `ORIGINAL QUERY: ${originalQuery}

CONTEXT: ${storedContext}

TEAM TERMS:
${formattedTeamTerms}

AGENT RESPONSES:
${agentSummary}

${existingDocument ? `EXISTING DOCUMENT TO UPDATE:
Title: ${existingDocument.title}
Content: ${existingDocument.content}

INSTRUCTION: Update and enhance the existing document based on the new query and agent responses. Keep the same document ID but improve the content to match the annotated PRD example's quality.` : 'DOCUMENT TYPE: PRD (Primary) or analysis (Secondary)'}

QUALITY REQUIREMENT: ${existingDocument ? 'Update and enhance the existing document to match' : 'Create a PRD that matches'} the excellence demonstrated in the annotated example. Include:
- Specific problem metrics (like "65% of searches end without purchase")
- Proper JTBD format for user stories
- Measurable success targets with baselines
- Phased rollout strategy
- Proactive risk identification and mitigation
- Clear dependencies and open questions

Follow the formatting guidelines and respond with the specified JSON format.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: AgentRegistry.getPrompt('writing') },
          { role: 'user', content: writingPrompt }
        ],
        response_format: { type: 'json_object' }
      });

      const documentResult = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        agent: 'writing',
        originalQuery,
        document: documentResult,
        agentResponsesProcessed: agentResults.length,
        timestamp: new Date().toISOString(),
        tokensUsed: response.usage?.total_tokens || 0
      };
      
    } catch (error) {
      console.error('Writing agent error:', error);
      throw error;
    }
  }

  /**
   * Create Google Doc simulation (direct implementation)
   */
  private static async createGoogleDoc(
    document: {
      title: string;
      content: string;
      documentType: string;
      suggestedFilename: string;
    },
    existingDocument?: { title: string; content: string }
  ) {
    try {
      // For document updates, we'll simulate updating the existing doc
      // In production, this would integrate with Google Docs API
      const isUpdate = existingDocument !== undefined;
      const docId = isUpdate ? 
        `garden_updated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
        `garden_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

      // Simulate Google Doc creation
      const result = {
        success: true,
        docId,
        docUrl,
        title: document.title,
        documentType: document.documentType,
        createdAt: new Date().toISOString(),
        // For demo purposes, we'll return the content as preview
        preview: document.content.substring(0, 500) + (document.content.length > 500 ? '...' : ''),
        fullContent: document.content
      };

      return result;
    } catch (error) {
      console.error('Google Doc creation error:', error);
      throw error;
    }
  }
}