import React from 'react';
import { Check, X, Edit3, Clock, Zap, Target, AlertCircle } from 'lucide-react';
import type { ActionPlan, ActionTask } from '@/types/assistant';

interface PlanCardProps {
  plan: ActionPlan;
  onAccept: () => void;
  onReject: () => void;
  onImprove: (feedback: string) => void;
  isExecuting?: boolean;
}

export default function PlanCard({ plan, onAccept, onReject, onImprove, isExecuting }: PlanCardProps) {
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Target className="w-4 h-4 text-blue-500" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEffortLabel = (effort: string) => {
    const colors = {
      minutes: 'bg-green-100 text-green-700',
      hours: 'bg-blue-100 text-blue-700',
      days: 'bg-purple-100 text-purple-700'
    };
    return colors[effort as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getTaskStatus = (task: ActionTask) => {
    if (task.status === 'completed') return '✓';
    if (task.status === 'in_progress') return '⋯';
    if (task.status === 'failed') return '✗';
    return '○';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">
                Poppy Plan
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {plan.totalEffort}
            </div>
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                  style={{ width: `${plan.impactScore * 10}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{plan.impactScore}/10</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{plan.objective}</h3>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">I will:</div>
        {plan.tasks.map((task, idx) => (
          <div 
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all bg-white border ${
              task.status === 'completed' ? 'border-green-200 bg-green-50' :
              task.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
              task.status === 'failed' ? 'border-red-200 bg-red-50' :
              'border-gray-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-purple-600 font-bold">
                {idx + 1})
              </span>
              <span className="text-xs">
                {getTaskStatus(task)}
              </span>
            </div>
            
            <div className="flex-1">
              <p className="text-sm text-gray-900 font-medium leading-tight">{task.action}</p>
              {task.rationale && (
                <p className="text-xs text-gray-600 mt-1">{task.rationale}</p>
              )}
              
              {task.result && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                  ✓ {task.result}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {getImpactIcon(task.impact)}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEffortLabel(task.effort)}`}>
                {task.effort}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Expected Outcome */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Expected Outcome</p>
        <p className="text-sm text-gray-800">{plan.expectedOutcome}</p>
      </div>

      {/* Actions */}
      {plan.status === 'proposed' && !isExecuting && (
        <div className="flex items-center gap-3 pt-3 border-t border-purple-200">
          {!showFeedback ? (
            <>
              <button
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-sm font-semibold text-sm"
              >
                <Check className="w-4 h-4" />
                Let&apos;s Do It!
              </button>
              <button
                onClick={() => setShowFeedback(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm font-semibold text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Adjust Plan
              </button>
              <button
                onClick={onReject}
                className="px-3 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What should be different?"
                className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <button
                onClick={() => {
                  onImprove(feedback);
                  setShowFeedback(false);
                  setFeedback('');
                }}
                disabled={!feedback.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Send
              </button>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback('');
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status indicators */}
      {plan.status === 'accepted' && (
        <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
          Plan Accepted - Executing...
        </div>
      )}
      
      {plan.status === 'rejected' && (
        <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
          Plan Rejected
        </div>
      )}
      
      {plan.status === 'in_progress' && (
        <div className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium text-center animate-pulse">
          Executing Plan...
        </div>
      )}
      
      {plan.status === 'completed' && (
        <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
          ✓ Plan Completed
        </div>
      )}
    </div>
  );
}