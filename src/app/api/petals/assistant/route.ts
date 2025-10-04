import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { run } from '@openai/agents';
import { pmAssistant, executionAgent, strategyAgent } from '@/services/agents/pmAssistant';
import { z } from 'zod';
import type { ActionPlan, ToolCall } from '@/types/assistant';

const AssistantRequestSchema = z.object({
  message: z.string().min(1),
  documentContext: z.string().nullable(),
  plan: z.object({
    id: z.string(),
    action: z.enum(['accept', 'reject', 'improve']),
    feedback: z.string().nullable()
  }).nullable().optional(),
  mode: z.enum(['chat', 'analyze', 'execute']).default('chat')
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, documentContext, plan, mode } = AssistantRequestSchema.parse(body);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial tool call notification
          const toolCallStart: ToolCall = {
            id: 'tc-1',
            tool: 'PM Assistant',
            description: 'Analyzing your request...',
            status: 'calling',
            timestamp: new Date()
          };
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'tool_call', data: toolCallStart })}\n\n`
          ));

          // Build context for the assistant
          let fullPrompt = message;
          
          if (plan) {
            fullPrompt = `User ${plan.action}ed the plan with feedback: "${plan.feedback || 'None'}"\n\nOriginal request: ${message}`;
          } else if (documentContext) {
            fullPrompt = `Document Context:\n${documentContext}\n\nUser Request: ${message}\n\nIMPORTANT: Create an actionable plan with specific tasks. Be concise.`;
          }

          // Select appropriate agent based on mode
          const agent = mode === 'execute' ? executionAgent : 
                       mode === 'analyze' ? strategyAgent : 
                       pmAssistant;

          // Run the agent
          const result = await run(agent, fullPrompt);
          
          // Send tool completion
          const toolCallEnd: ToolCall = {
            id: 'tc-1',
            tool: 'PM Assistant',
            description: 'Analysis complete',
            status: 'completed',
            timestamp: new Date(),
            result: 'Plan generated'
          };
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'tool_call', data: toolCallEnd })}\n\n`
          ));

          // Parse and send the plan - check tool calls first
          const planData = extractPlanFromToolCalls(result) || extractPlan(result.finalOutput || '');
          
          if (planData) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'plan', data: planData })}\n\n`
            ));
          } else {
            // Fallback to text response
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'message', data: result.finalOutput || '' })}\n\n`
            ));
          }

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', data: 'Processing failed' })}\n\n`
          ));
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

interface ToolCallResult {
  name: string;
  result: string;
}

interface AgentStep {
  toolCalls?: ToolCallResult[];
}

interface AgentResult {
  toolCalls?: ToolCallResult[];
  steps?: AgentStep[];
  finalOutput?: string;
}

function extractPlanFromToolCalls(result: AgentResult): ActionPlan | null {
  try {
    // Check if result has tool calls with the create_action_plan tool
    if (result.toolCalls) {
      const planToolCall = result.toolCalls.find((call) => 
        call.name === 'create_action_plan' && call.result
      );
      
      if (planToolCall) {
        const parsed = JSON.parse(planToolCall.result);
        if (parsed.plan) {
          return {
            id: `plan-${Date.now()}`,
            ...parsed.plan,
            status: 'proposed',
            createdAt: new Date()
          };
        }
      }
    }

    // Check if result has steps with tool outputs
    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolCalls) {
          const planToolCall = step.toolCalls.find((call) => 
            call.name === 'create_action_plan' && call.result
          );
          
          if (planToolCall) {
            const parsed = JSON.parse(planToolCall.result);
            if (parsed.plan) {
              return {
                id: `plan-${Date.now()}`,
                ...parsed.plan,
                status: 'proposed',
                createdAt: new Date()
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Tool call plan extraction error:', e);
  }
  
  return null;
}

function extractPlan(output: string): ActionPlan | null {
  try {
    // Try to parse JSON from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.plan) {
      return {
        id: `plan-${Date.now()}`,
        ...parsed.plan,
        status: 'proposed',
        createdAt: new Date()
      };
    }
    
    // Fallback: Create plan from structured text
    if (output.includes('•') || output.includes('-')) {
      const lines = output.split('\n').filter(l => l.trim());
      const tasks = lines
        .filter(l => l.match(/^[•\-\*]\s/))
        .map((line, i) => ({
          id: `task-${i}`,
          action: line.replace(/^[•\-\*]\s+/, ''),
          rationale: 'Addresses user request',
          impact: 'medium' as const,
          effort: 'hours' as const,
          tool: null,
          status: 'pending' as const
        }));
      
      if (tasks.length > 0) {
        return {
          id: `plan-${Date.now()}`,
          objective: lines[0] || 'Improve PRD',
          tasks,
          expectedOutcome: 'PRD improvements implemented',
          totalEffort: `${tasks.length} hours`,
          impactScore: 7,
          status: 'proposed',
          createdAt: new Date()
        };
      }
    }
  } catch (e) {
    console.error('Plan extraction error:', e);
  }
  
  return null;
}