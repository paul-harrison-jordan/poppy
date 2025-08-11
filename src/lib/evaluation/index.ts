export { EvalService } from './EvalService';
export { QualityMetrics } from './QualityMetrics';
export { withEvaluation, withOpenAIEval, EvaluatedOperations } from './EvalMiddleware';
export type { 
  EvalResult, 
  EvalJob, 
  EvalMetric, 
  QualityConfig,
  EvalStatus 
} from './types';