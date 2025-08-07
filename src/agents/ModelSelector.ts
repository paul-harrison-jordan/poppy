export type ModelChoice = 'gpt-4o-mini' | 'gpt-4o' | 'o3';

export interface AgentTask {
  type: 'extraction' | 'classification' | 'analysis' | 'synthesis' | 'generation';
  criticality?: number; // 0-1 scale
  contextSize?: number; // Rough estimate of input size
  outputComplexity?: number; // 0-1 scale for expected output complexity
}

export class ModelSelector {
  select(modelHint?: ModelChoice, task?: AgentTask): ModelChoice {
    // If no task provided, fall back to hint or default
    if (!task) {
      return modelHint || 'gpt-4o';
    }

    const complexity = this.assessComplexity(task);

    // Apply selection rules from the proposal
    if (task.type === 'extraction' || task.type === 'classification') {
      return 'gpt-4o-mini'; // Fast, cheap, good enough
    }
    
    if (task.type === 'analysis' && complexity < 0.7) {
      return 'gpt-4o-mini'; // Still sufficient
    }
    
    if (task.type === 'synthesis' || task.type === 'analysis') {
      return 'gpt-4o'; // Balanced choice
    }
    
    if (task.type === 'generation' && (task.criticality || 0) > 0.8) {
      return 'o3'; // Only for final PRD sections
    }
    
    return 'gpt-4o'; // Default fallback
  }

  assessComplexity(task: AgentTask): number {
    let complexity = 0.5; // Base complexity
    
    // Adjust based on task type
    switch (task.type) {
      case 'extraction':
      case 'classification':
        complexity = 0.3; // Simple tasks
        break;
      case 'analysis':
        complexity = 0.6; // Moderate tasks
        break;
      case 'synthesis':
        complexity = 0.7; // Complex tasks
        break;
      case 'generation':
        complexity = 0.8; // Most complex tasks
        break;
    }
    
    // Adjust based on context size
    if (task.contextSize) {
      if (task.contextSize > 5000) {
        complexity += 0.2;
      } else if (task.contextSize > 2000) {
        complexity += 0.1;
      }
    }
    
    // Adjust based on output complexity
    if (task.outputComplexity) {
      complexity += task.outputComplexity * 0.2;
    }
    
    // Adjust based on criticality
    if (task.criticality) {
      complexity += task.criticality * 0.1;
    }
    
    // Cap at 1.0
    return Math.min(complexity, 1.0);
  }
}