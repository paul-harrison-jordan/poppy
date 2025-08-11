import { createServiceClient } from '@/utils/supabase/service';
import type { EvalResult, EvalJob, EvalStatus } from './types';
import { QualityMetrics } from './QualityMetrics';

export class EvalService {
  private static instance: EvalService;
  private jobs: Map<string, EvalJob> = new Map();
  
  static getInstance(): EvalService {
    if (!this.instance) {
      this.instance = new EvalService();
    }
    return this.instance;
  }

  async captureEvaluation(
    operation: string,
    model: string,
    input: { prompt?: string; context?: Record<string, unknown>; tokens?: number },
    output: { content?: string; tokens?: number; latency?: number },
    metadata: { userId?: string; sessionId?: string; version?: string } = {}
  ): Promise<string> {
    const evalId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create async job
    const job: EvalJob = {
      id: evalId,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.jobs.set(evalId, job);
    
    // Run evaluation asynchronously
    this.runEvaluation(evalId, operation, model, input, output, metadata).catch(error => {
      console.error(`Eval job ${evalId} failed:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    });
    
    return evalId;
  }

  private async runEvaluation(
    evalId: string,
    operation: string,
    model: string,
    input: { prompt?: string; context?: Record<string, unknown>; tokens?: number },
    output: { content?: string; tokens?: number; latency?: number },
    metadata: { userId?: string; sessionId?: string; version?: string }
  ): Promise<void> {
    const job = this.jobs.get(evalId);
    if (!job) return;

    try {
      console.log(`[EvalService] Starting evaluation ${evalId} for operation: ${operation}`);
      const startTime = Date.now();
      
      // Get quality metrics
      const metrics = await QualityMetrics.evaluateContent(operation, input, output);
      const overallScore = QualityMetrics.calculateOverallScore(metrics);
      
      const evalTime = Date.now() - startTime;
      
      const result: EvalResult = {
        id: evalId,
        timestamp: new Date(),
        operation,
        model,
        input,
        output,
        metrics,
        overallScore,
        metadata: {
          ...metadata,
          version: '1.0.0',
          evalTime
        }
      };

      // Store in database
      await this.storeEvaluation(result);
      
      // Update job status
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      
      console.log(`[EvalService] Completed evaluation ${evalId} with score ${overallScore.toFixed(3)} in ${evalTime}ms`);
      
      // Log quality alerts for poor performance
      if (overallScore < 0.6) {
        console.warn(`[EvalService] Quality alert: ${operation} scored ${overallScore.toFixed(3)} (below 0.6 threshold)`);
      }
      
    } catch (error) {
      console.error(`[EvalService] Evaluation ${evalId} failed:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  private async storeEvaluation(result: EvalResult): Promise<void> {
    try {
      const supabase = createServiceClient();
      
      const { error } = await supabase
        .from('ai_evaluations')
        .insert({
          eval_id: result.id,
          operation: result.operation,
          model: result.model,
          input_data: result.input,
          output_data: result.output,
          metrics: result.metrics,
          overall_score: result.overallScore,
          metadata: result.metadata,
          user_id: result.metadata.userId,
          session_id: result.metadata.sessionId,
          created_at: result.timestamp
        });

      if (error) {
        console.error(`[EvalService] Failed to store evaluation ${result.id}:`, error);
        // Don't throw - we don't want eval failures to break main operations
      } else {
        console.log(`[EvalService] Stored evaluation ${result.id}`);
      }
    } catch (error) {
      console.error(`[EvalService] Database error storing evaluation:`, error);
    }
  }

  getJob(evalId: string): EvalJob | undefined {
    return this.jobs.get(evalId);
  }

  async getEvaluationHistory(
    operation?: string, 
    userId?: string, 
    limit: number = 100
  ): Promise<EvalResult[]> {
    try {
      const supabase = createServiceClient();
      
      let query = supabase
        .from('ai_evaluations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (operation) {
        query = query.eq('operation', operation);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[EvalService] Failed to fetch evaluation history:', error);
        return [];
      }
      
      return (data || []).map(row => ({
        id: row.eval_id,
        timestamp: new Date(row.created_at),
        operation: row.operation,
        model: row.model,
        input: row.input_data,
        output: row.output_data,
        metrics: row.metrics,
        overallScore: row.overall_score,
        metadata: row.metadata || {}
      }));
    } catch (error) {
      console.error('[EvalService] Error fetching evaluation history:', error);
      return [];
    }
  }

  async getQualityTrends(
    operation: string, 
    days: number = 7,
    userId?: string
  ): Promise<{ date: string; avgScore: number; count: number }[]> {
    try {
      const supabase = createServiceClient();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      let query = supabase
        .from('ai_evaluations')
        .select('overall_score, created_at')
        .eq('operation', operation)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[EvalService] Failed to fetch quality trends:', error);
        return [];
      }
      
      // Group by date
      const groupedData = new Map<string, { scores: number[]; count: number }>();
      
      (data || []).forEach(row => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const existing = groupedData.get(date) || { scores: [], count: 0 };
        existing.scores.push(row.overall_score);
        existing.count++;
        groupedData.set(date, existing);
      });
      
      return Array.from(groupedData.entries()).map(([date, data]) => ({
        date,
        avgScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
        count: data.count
      }));
    } catch (error) {
      console.error('[EvalService] Error fetching quality trends:', error);
      return [];
    }
  }

  async getOperationStats(userId?: string): Promise<Record<string, {
    count: number;
    avgScore: number;
    trends: { improving: boolean; change: number };
  }>> {
    try {
      const supabase = createServiceClient();
      
      // Get last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('ai_evaluations')
        .select('operation, overall_score, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[EvalService] Failed to fetch operation stats:', error);
        return {};
      }
      
      const stats: Record<string, {
        count: number;
        avgScore: number;
        trends: { improving: boolean; change: number };
      }> = {};
      
      const operationData = new Map<string, { scores: number[]; dates: Date[] }>();
      
      (data || []).forEach(row => {
        const existing = operationData.get(row.operation) || { scores: [], dates: [] };
        existing.scores.push(row.overall_score);
        existing.dates.push(new Date(row.created_at));
        operationData.set(row.operation, existing);
      });
      
      operationData.forEach((data, operation) => {
        const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        
        // Calculate trend (first half vs second half)
        const midpoint = Math.floor(data.scores.length / 2);
        const firstHalf = data.scores.slice(0, midpoint);
        const secondHalf = data.scores.slice(midpoint);
        
        const firstAvg = firstHalf.length > 0 ? 
          firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? 
          secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length : 0;
        
        const change = secondAvg - firstAvg;
        
        stats[operation] = {
          count: data.scores.length,
          avgScore,
          trends: {
            improving: change > 0.05, // 5% improvement threshold
            change
          }
        };
      });
      
      return stats;
    } catch (error) {
      console.error('[EvalService] Error fetching operation stats:', error);
      return {};
    }
  }

  // Cleanup old jobs from memory (call periodically)
  cleanupJobs(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    
    for (const [id, job] of this.jobs.entries()) {
      if (job.createdAt.getTime() < cutoff) {
        this.jobs.delete(id);
      }
    }
  }
}