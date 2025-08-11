import { openai } from '@/lib/openai';
import type { EvalMetric, QualityConfig } from './types';

export class QualityMetrics {
  private static configs: QualityConfig[] = [
    {
      operation: 'generate-content',
      metrics: [
        {
          name: 'relevance',
          evaluator: 'llm',
          weight: 0.4,
          prompt: 'Rate how well this content addresses the original request. Score 0-1 where 1 is perfectly relevant.'
        },
        {
          name: 'clarity',
          evaluator: 'llm', 
          weight: 0.3,
          prompt: 'Rate the clarity and readability of this content. Score 0-1 where 1 is exceptionally clear.'
        },
        {
          name: 'completeness',
          evaluator: 'llm',
          weight: 0.3,
          prompt: 'Rate how complete and comprehensive this content is. Score 0-1 where 1 is fully comprehensive.'
        }
      ]
    },
    {
      operation: 'brainstorm',
      metrics: [
        {
          name: 'creativity',
          evaluator: 'llm',
          weight: 0.4,
          prompt: 'Rate the creativity and novelty of these brainstorm ideas. Score 0-1 where 1 is highly creative.'
        },
        {
          name: 'feasibility',
          evaluator: 'llm',
          weight: 0.3,
          prompt: 'Rate how feasible and actionable these ideas are. Score 0-1 where 1 is highly feasible.'
        },
        {
          name: 'diversity',
          evaluator: 'heuristic',
          weight: 0.3
        }
      ]
    },
    {
      operation: 'generate-questions',
      metrics: [
        {
          name: 'relevance',
          evaluator: 'llm',
          weight: 0.5,
          prompt: 'Rate how relevant these questions are to the PRD context. Score 0-1 where 1 is highly relevant.'
        },
        {
          name: 'depth',
          evaluator: 'llm',
          weight: 0.3,
          prompt: 'Rate the depth and thoughtfulness of these questions. Score 0-1 where 1 is very insightful.'
        },
        {
          name: 'coverage',
          evaluator: 'heuristic',
          weight: 0.2
        }
      ]
    }
  ];

  static getConfigForOperation(operation: string): QualityConfig | undefined {
    return this.configs.find(config => config.operation === operation);
  }

  static async evaluateContent(
    operation: string,
    input: { prompt?: string; context?: Record<string, unknown> },
    output: { content?: string; tokens?: number; latency?: number }
  ): Promise<EvalMetric[]> {
    const config = this.getConfigForOperation(operation);
    if (!config) {
      console.warn(`No quality config found for operation: ${operation}`);
      return [];
    }

    const metrics: EvalMetric[] = [];

    for (const metricConfig of config.metrics) {
      try {
        let score: number;
        
        switch (metricConfig.evaluator) {
          case 'llm':
            score = await this.evaluateWithLLM(
              metricConfig.prompt!,
              input,
              output
            );
            break;
          case 'heuristic':
            score = await this.evaluateWithHeuristics(
              metricConfig.name,
              input,
              output
            );
            break;
          case 'external':
            score = await this.evaluateWithExternal(
              metricConfig.name,
              input,
              output
            );
            break;
          default:
            console.warn(`Unknown evaluator type: ${metricConfig.evaluator}`);
            continue;
        }

        metrics.push({
          name: metricConfig.name,
          score: Math.max(0, Math.min(1, score)), // Clamp to 0-1
          weight: metricConfig.weight,
          details: {
            evaluator: metricConfig.evaluator,
            latency: output.latency
          }
        });
      } catch (error) {
        console.error(`Failed to evaluate metric ${metricConfig.name}:`, error);
        // Add a neutral score so we don't skip the metric entirely
        metrics.push({
          name: metricConfig.name,
          score: 0.5,
          weight: metricConfig.weight,
          details: { 
            evaluator: metricConfig.evaluator,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }

    return metrics;
  }

  private static async evaluateWithLLM(
    evalPrompt: string,
    input: { prompt?: string; context?: Record<string, unknown> },
    output: { content?: string }
  ): Promise<number> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast, cheap model for evals
      messages: [
        {
          role: 'system',
          content: `You are an expert evaluator. ${evalPrompt}

Return only a decimal number between 0 and 1, nothing else.

Examples:
- Perfect quality: 1.0
- Good quality: 0.8
- Average quality: 0.6  
- Poor quality: 0.3
- Unacceptable: 0.1`
        },
        {
          role: 'user',
          content: `Original Request: ${input.prompt || 'Not provided'}

Generated Content: ${output.content || 'Not provided'}

Context: ${input.context ? JSON.stringify(input.context, null, 2) : 'Not provided'}`
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });

    const scoreText = response.choices[0]?.message?.content?.trim();
    const score = parseFloat(scoreText || '0.5');
    
    return isNaN(score) ? 0.5 : score;
  }

  private static async evaluateWithHeuristics(
    metricName: string,
    input: { prompt?: string; context?: Record<string, unknown> },
    output: { content?: string; tokens?: number; latency?: number }
  ): Promise<number> {
    switch (metricName) {
      case 'diversity':
        return this.calculateDiversity(output.content || '');
      case 'coverage':
        return this.calculateCoverage(input, output);
      case 'efficiency':
        return this.calculateEfficiency(output.tokens || 0, output.latency || 0);
      default:
        console.warn(`Unknown heuristic metric: ${metricName}`);
        return 0.5;
    }
  }

  private static async evaluateWithExternal(
    metricName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input: { prompt?: string; context?: Record<string, unknown> },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _output: { content?: string }
  ): Promise<number> {
    // Placeholder for external evaluators (e.g., grammar checkers, fact checkers)
    console.warn(`External evaluator not implemented for: ${metricName}`);
    return 0.5;
  }

  private static calculateDiversity(content: string): number {
    if (!content) return 0;
    
    // Simple diversity metric based on unique words and concepts
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const diversityRatio = uniqueWords.size / Math.max(words.length, 1);
    
    // Convert to 0-1 scale (assuming good diversity is > 0.6 ratio)
    return Math.min(1, diversityRatio / 0.6);
  }

  private static calculateCoverage(
    input: { prompt?: string; context?: Record<string, unknown> },
    output: { content?: string }
  ): number {
    if (!input.prompt || !output.content) return 0;
    
    // Simple coverage metric - how many key concepts from input appear in output
    const inputWords = new Set(
      input.prompt.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3) // Filter out small words
    );
    
    const outputWords = new Set(
      output.content.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
    );
    
    const overlap = [...inputWords].filter(word => outputWords.has(word));
    return overlap.length / Math.max(inputWords.size, 1);
  }

  private static calculateEfficiency(tokens: number, latency: number): number {
    if (tokens === 0 || latency === 0) return 0.5;
    
    // Tokens per second - higher is better
    const tokensPerSecond = tokens / (latency / 1000);
    
    // Normalize to 0-1 scale (assuming 50 tokens/sec is excellent)
    return Math.min(1, tokensPerSecond / 50);
  }

  static calculateOverallScore(metrics: EvalMetric[]): number {
    if (metrics.length === 0) return 0.5;
    
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (totalWeight === 0) return 0.5;
    
    const weightedSum = metrics.reduce(
      (sum, metric) => sum + (metric.score * metric.weight),
      0
    );
    
    return weightedSum / totalWeight;
  }
}