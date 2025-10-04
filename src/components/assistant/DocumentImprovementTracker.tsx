import React from 'react';
import { TrendingUp, Zap, CheckCircle, Clock, Star } from 'lucide-react';

interface ImprovementMetric {
  label: string;
  before: number;
  after: number;
  unit: string;
  improvement: number;
}

interface DocumentImprovementTrackerProps {
  initialScore: number;
  currentScore: number;
  tasksCompleted: number;
  totalTasks: number;
  improvements: ImprovementMetric[];
  estimatedTimeRemaining: string;
}

export default function DocumentImprovementTracker({
  initialScore,
  currentScore,
  tasksCompleted,
  totalTasks,
  improvements,
  estimatedTimeRemaining
}: DocumentImprovementTrackerProps) {
  const overallImprovement = currentScore - initialScore;
  const progressPercentage = (tasksCompleted / totalTasks) * 100;
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600'; 
    if (score >= 55) return 'text-orange-600';
    return 'text-red-600';
  };

  const getImprovementColor = (improvement: number) => {
    if (improvement > 20) return 'text-green-600 bg-green-50 border-green-200';
    if (improvement > 10) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (improvement > 0) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl border-2 border-purple-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            Document Quality
          </h3>
          <p className="text-sm text-gray-600">
            Real-time improvement tracking
          </p>
        </div>
        
        <div className="text-right">
          <div className={`text-4xl font-bold ${getScoreColor(currentScore)}`}>
            {currentScore}
            <span className="text-lg text-gray-400">/100</span>
          </div>
          {overallImprovement > 0 && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +{overallImprovement} points
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Tasks: {tasksCompleted}/{totalTasks}
          </span>
          <span className="text-gray-500">
            {estimatedTimeRemaining} remaining
          </span>
        </div>
        
        <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-sm">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      </div>

      {/* Score Journey */}
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Quality Journey</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            Live tracking
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold text-gray-500">
              {initialScore}
            </div>
            <div className="text-xs text-gray-400">Start</div>
          </div>
          
          <div className="flex-1 relative">
            <div className="h-1 bg-gradient-to-r from-gray-300 to-purple-500 rounded-full"/>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-lg animate-pulse"/>
          </div>
          
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>
              {currentScore}
            </div>
            <div className="text-xs text-gray-400">Current</div>
          </div>
          
          <div className="flex flex-col items-center opacity-50">
            <div className="text-2xl font-bold text-green-600">
              95+
            </div>
            <div className="text-xs text-gray-400">Goal</div>
          </div>
        </div>
      </div>

      {/* Improvement Metrics */}
      {improvements.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Recent Improvements
          </h4>
          
          <div className="grid gap-3">
            {improvements.map((metric, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${getImprovementColor(metric.improvement)}`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {metric.label}
                  </div>
                  <div className="text-xs opacity-75">
                    {metric.before} → {metric.after} {metric.unit}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-bold">
                      +{metric.improvement}%
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-semibold text-lg">
              {overallImprovement > 15 ? "🚀 Excellent progress!" :
               overallImprovement > 8 ? "⚡ Great momentum!" :
               overallImprovement > 3 ? "📈 Nice improvement!" :
               "🎯 Let's improve this PRD!"}
            </p>
            <p className="text-sm opacity-90">
              {overallImprovement > 15 ? "Your PRD is becoming world-class!" :
               overallImprovement > 8 ? "Keep this pace and you'll have an amazing PRD!" :
               overallImprovement > 3 ? "Each task makes your PRD stronger!" :
               "Every improvement brings you closer to a stellar PRD!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}