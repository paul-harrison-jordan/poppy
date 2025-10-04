import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Target,
  AlertCircle,
  Eye,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  Cpu
} from 'lucide-react';
import type { ActionPlan } from '@/types/assistant';

interface TaskApprovalFlowProps {
  plan: ActionPlan;
  onApprove: (taskId: string) => void;
  onReject: (taskId: string, reason?: string) => void;
  onRequestChanges: (taskId: string, feedback: string) => void;
  onComplete: () => void;
  className?: string;
}

export default function TaskApprovalFlow({ 
  plan, 
  onApprove, 
  onReject, 
  onRequestChanges, 
  onComplete,
  className = '' 
}: TaskApprovalFlowProps) {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showThinking, setShowThinking] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const currentTask = plan.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === plan.tasks.length - 1;
  const completedTasks = plan.tasks.filter(t => t.status === 'completed').length;
  const progressPercentage = (completedTasks / plan.tasks.length) * 100;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (feedbackMode) return; // Don't handle keys when typing feedback
      
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleApprove();
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          handleReject();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setShowThinking(!showThinking);
          break;
        case 'ArrowDown':
        case 'c':
          e.preventDefault();
          setFeedbackMode(true);
          break;
        case 'p':
          e.preventDefault();
          setShowPreview(!showPreview);
          break;
        case 'Escape':
          e.preventDefault();
          if (feedbackMode) {
            setFeedbackMode(false);
            setFeedback('');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentTaskIndex, feedbackMode, showThinking, showPreview]);

  const handleApprove = () => {
    onApprove(currentTask.id);
    
    if (isLastTask) {
      setTimeout(() => onComplete(), 800); // Delay for animation
    } else {
      setTimeout(() => {
        setCurrentTaskIndex(prev => prev + 1);
        setShowThinking(false);
        setShowPreview(false);
      }, 400);
    }
  };

  const handleReject = () => {
    onReject(currentTask.id);
    
    if (isLastTask) {
      onComplete();
    } else {
      setTimeout(() => {
        setCurrentTaskIndex(prev => prev + 1);
        setShowThinking(false);
        setShowPreview(false);
      }, 400);
    }
  };

  const handleRequestChanges = () => {
    if (!feedback.trim()) return;
    
    onRequestChanges(currentTask.id, feedback);
    setFeedback('');
    setFeedbackMode(false);
    
    // Move to next task after requesting changes
    if (!isLastTask) {
      setTimeout(() => {
        setCurrentTaskIndex(prev => prev + 1);
        setShowThinking(false);
        setShowPreview(false);
      }, 400);
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Target className="w-4 h-4 text-blue-500" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEffortColor = (effort: string) => {
    const colors = {
      minutes: 'bg-green-100 text-green-700 border-green-200',
      hours: 'bg-blue-100 text-blue-700 border-blue-200',
      days: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return colors[effort as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className={`bg-white border-2 border-purple-300 rounded-xl shadow-lg ${className}`}>
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-t-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg">{plan.objective}</h3>
            <p className="text-purple-100 text-sm">
              Task {currentTaskIndex + 1} of {plan.tasks.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
            <div className="text-xs text-purple-200">Complete</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-purple-400/30 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Current Task */}
      <div className="p-6 space-y-4">
        <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-5 border border-purple-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-lg mb-2">
                {currentTask.action}
              </h4>
              <p className="text-gray-600 text-sm mb-3">
                {currentTask.rationale}
              </p>
            </div>
            
            <div className="flex items-center gap-3 ml-4">
              {getImpactIcon(currentTask.impact)}
              <span className={`text-xs px-2 py-1 rounded-full border ${getEffortColor(currentTask.effort)}`}>
                {currentTask.effort}
              </span>
            </div>
          </div>

          {/* Tool Information */}
          {currentTask.tool && (
            <div className="flex items-center gap-2 text-purple-600 text-sm bg-purple-50 px-3 py-2 rounded-lg">
              <Cpu className="w-4 h-4" />
              <span className="font-medium">Using: {currentTask.tool}</span>
            </div>
          )}
        </div>

        {/* Thinking Process Toggle */}
        <button
          onClick={() => setShowThinking(!showThinking)}
          className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Why this task?</span>
          </div>
          {showThinking ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
        </button>

        {/* Thinking Process */}
        {showThinking && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-3">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Assistant&apos;s Thinking:</p>
              <div className="space-y-2 text-blue-700">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">→</span>
                  <span>Identified this as a {currentTask.impact} impact improvement</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">→</span>
                  <span>Estimated effort: {currentTask.effort} based on complexity</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">→</span>
                  <span>This addresses: {currentTask.rationale.toLowerCase()}</span>
                </div>
                {currentTask.tool && (
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span>Will use {currentTask.tool} to ensure quality</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Hide' : 'Preview'} expected outcome
        </button>

        {/* Preview */}
        {showPreview && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-green-800 text-sm">
              <span className="font-medium">Expected result:</span> This task will improve your PRD by making the {currentTask.action.toLowerCase()} more clear and actionable, directly contributing to: {plan.expectedOutcome}
            </p>
          </div>
        )}

        {/* Feedback Input */}
        {feedbackMode && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 space-y-3">
            <label className="block text-sm font-medium text-yellow-800">
              What changes would you like?
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe what should be different..."
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleRequestChanges}
                disabled={!feedback.trim()}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Request Changes
              </button>
              <button
                onClick={() => {
                  setFeedbackMode(false);
                  setFeedback('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleReject}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Reject
            </button>
            
            <button
              onClick={() => setFeedbackMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
            >
              <Edit3 className="w-4 h-4" />
              Changes
            </button>
          </div>

          <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <ArrowRight className="w-5 h-5" />
            {isLastTask ? 'Complete!' : 'Approve'}
          </button>
        </div>
        
        {/* Keyboard Shortcuts */}
        <div className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-4">
          <span><kbd className="px-2 py-1 bg-gray-200 rounded">→</kbd> Approve</span>
          <span><kbd className="px-2 py-1 bg-gray-200 rounded">←</kbd> Reject</span>
          <span><kbd className="px-2 py-1 bg-gray-200 rounded">↓</kbd> Request Changes</span>
          <span><kbd className="px-2 py-1 bg-gray-200 rounded">↑</kbd> Toggle Thinking</span>
        </div>
      </div>
    </div>
  );
}