import { openai } from '@/lib/openai';
import { Agent, AgentContext, AgentResult } from './types';
import { ModelSelector, ModelChoice, AgentTask } from './ModelSelector';

export abstract class LLMAgent implements Agent {
  public readonly name: string;
  public readonly purpose: string;
  public readonly model: ModelChoice;
  public readonly maxTokens: number;
  protected readonly promptTemplate: string;
  private modelSelector: ModelSelector;
  private forceModel?: boolean; // Flag to force using the specified model
  private agentTask?: AgentTask; // Task definition for smart model selection

  constructor(
    name: string,
    purpose: string,
    model: ModelChoice,
    maxTokens: number,
    promptTemplate: string,
    forceModel: boolean = false,
    agentTask?: AgentTask
  ) {
    this.name = name;
    this.purpose = purpose;
    this.model = model;
    this.maxTokens = maxTokens;
    this.promptTemplate = promptTemplate;
    this.forceModel = forceModel;
    this.agentTask = agentTask;
    this.modelSelector = new ModelSelector();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    // Use smart model selection unless model is forced
    const selectedModel = this.forceModel 
      ? this.model 
      : this.modelSelector.select(this.model, this.agentTask);
    
    try {
      console.log(`[${this.name}] Starting execution with model: ${selectedModel}`);
      
      const prompt = this.buildPrompt(context);
      const tokenEstimate = this.estimateTokens(prompt);
      
      console.log(`[${this.name}] Estimated tokens: ${tokenEstimate}, Max tokens: ${this.maxTokens}`);
      
      if (tokenEstimate > this.maxTokens * 0.8) {
        console.warn(`[${this.name}] Token usage approaching limit: ${tokenEstimate}/${this.maxTokens}`);
      }

      const response = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
      });

      const result = this.parseResponse(response.choices[0]?.message?.content || '');
      const executionTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      console.log(`[${this.name}] Completed in ${executionTime}ms, tokens used: ${tokensUsed}`);

      return {
        success: true,
        result,
        metadata: {
          tokensUsed,
          modelUsed: selectedModel,
          executionTime
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`[${this.name}] Failed after ${executionTime}ms:`, error);
      
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime
        }
      };
    }
  }

  protected buildPrompt(context: AgentContext): string {
    // Simple template replacement - can be enhanced later
    let prompt = this.promptTemplate;
    
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = typeof value === 'string' ? value : JSON.stringify(value);
      prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    return prompt;
  }

  protected parseResponse(response: string): any {
    // Default implementation returns raw response
    // Subclasses can override for structured parsing
    return response.trim();
  }

  private estimateTokens(text: string): number {
    // Rough token estimation (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}