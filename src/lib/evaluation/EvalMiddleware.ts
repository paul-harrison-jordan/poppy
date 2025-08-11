import { EvalService } from './EvalService';

export interface EvalContext {
  operation: string;
  model: string;
  userId?: string;
  sessionId?: string;
}

export async function withEvaluation<T>(
  context: EvalContext,
  input: { prompt?: string; context?: Record<string, unknown>; tokens?: number },
  operation: () => Promise<{ content?: string; tokens?: number }>
): Promise<T> {
  const startTime = Date.now();
  const evalService = EvalService.getInstance();
  
  try {
    // Execute the main operation
    const result = await operation();
    const latency = Date.now() - startTime;
    
    // Capture evaluation asynchronously (don't await)
    evalService.captureEvaluation(
      context.operation,
      context.model,
      input,
      { ...result, latency },
      {
        userId: context.userId,
        sessionId: context.sessionId
      }
    );
    
    return result as T;
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Still capture failed evaluations for analysis
    evalService.captureEvaluation(
      context.operation,
      context.model,
      input,
      { latency },
      {
        userId: context.userId,
        sessionId: context.sessionId
      }
    );
    
    throw error;
  }
}

// Helper for wrapping OpenAI calls
export async function withOpenAIEval<T>(
  operation: string,
  model: string,
  prompt: string,
  openaiCall: () => Promise<{ choices: { message: { content?: string } }[]; usage?: { total_tokens: number } }>,
  metadata?: { userId?: string; sessionId?: string }
): Promise<T> {
  return withEvaluation<T>(
    {
      operation,
      model,
      userId: metadata?.userId,
      sessionId: metadata?.sessionId
    },
    {
      prompt,
      tokens: prompt.length / 4 // Rough token estimate
    },
    async () => {
      const response = await openaiCall();
      return {
        content: response.choices[0]?.message?.content || '',
        tokens: response.usage?.total_tokens
      };
    }
  );
}

// Type-safe wrapper for specific operations
export class EvaluatedOperations {
  static async generateContent(
    model: string,
    prompt: string,
    openaiCall: () => Promise<any>,
    metadata?: { userId?: string; sessionId?: string }
  ) {
    return withOpenAIEval(
      'generate-content',
      model,
      prompt,
      openaiCall,
      metadata
    );
  }
  
  static async brainstorm(
    model: string,
    prompt: string,
    openaiCall: () => Promise<any>,
    metadata?: { userId?: string; sessionId?: string }
  ) {
    return withOpenAIEval(
      'brainstorm',
      model,
      prompt,
      openaiCall,
      metadata
    );
  }
  
  static async generateQuestions(
    model: string,
    prompt: string,
    openaiCall: () => Promise<any>,
    metadata?: { userId?: string; sessionId?: string }
  ) {
    return withOpenAIEval(
      'generate-questions',
      model,
      prompt,
      openaiCall,
      metadata
    );
  }
  
  static async analyzeDocument(
    model: string,
    prompt: string,
    openaiCall: () => Promise<any>,
    metadata?: { userId?: string; sessionId?: string }
  ) {
    return withOpenAIEval(
      'analyze-document',
      model,
      prompt,
      openaiCall,
      metadata
    );
  }
}