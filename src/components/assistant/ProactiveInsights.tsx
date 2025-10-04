import React from 'react';
import { AlertTriangle, TrendingUp, Shield, Star, ArrowRight, Clock } from 'lucide-react';
import type { ProactiveAnalysis, DocumentInsight } from '@/types/assistant';

interface ProactiveInsightsProps {
  analysis: ProactiveAnalysis;
  onActionClick: (action: string) => void;
}

export default function ProactiveInsights({ analysis, onActionClick }: ProactiveInsightsProps) {
  const getInsightIcon = (type: DocumentInsight['type']) => {
    switch (type) {
      case 'gap': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'risk': return <Shield className="w-4 h-4 text-red-500" />;
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'strength': return <Star className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: DocumentInsight['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const criticalInsights = analysis.insights.filter(i => i.priority === 'critical' || i.priority === 'high');
  const otherInsights = analysis.insights.filter(i => i.priority !== 'critical' && i.priority !== 'high');

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-xl border border-purple-200 p-5 space-y-4">
      {/* Header with Score */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Document Analysis
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Ready to help you improve this PRD</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{analysis.estimatedImprovementTime}</span>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-3xl font-bold ${getScoreColor(analysis.documentScore)}`}>
            {analysis.documentScore}
          </div>
          <div className="text-xs text-gray-500 mt-1">Quality Score</div>
        </div>
      </div>

      {/* Top Recommendations */}
      {analysis.topRecommendations.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <div className="text-xs font-medium text-purple-600 mb-2 uppercase tracking-wide">
            Quick Wins
          </div>
          <div className="space-y-2">
            {analysis.topRecommendations.map((rec, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick(rec)}
                className="w-full flex items-center justify-between gap-2 p-2 text-left text-sm bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <span className="text-gray-700">{rec}</span>
                <ArrowRight className="w-3 h-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Critical Insights */}
      {criticalInsights.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Needs Attention
          </div>
          {criticalInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getPriorityColor(insight.priority)}`}
            >
              <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{insight.description}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
                    {insight.section}
                  </span>
                </div>
                {insight.suggestedAction && (
                  <button
                    onClick={() => onActionClick(insight.suggestedAction!)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 group"
                  >
                    <span>{insight.suggestedAction}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other Insights (Collapsed by default) */}
      {otherInsights.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
            View {otherInsights.length} more insights
          </summary>
          <div className="mt-2 space-y-2">
            {otherInsights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-xs"
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <span className="text-gray-600">{insight.section}:</span>
                  <span className="text-gray-800 ml-1">{insight.description}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 text-white">
        <p className="text-sm font-medium mb-1">
          I can help you improve this document {analysis.documentScore < 60 ? 'significantly' : 'further'}
        </p>
        <p className="text-xs opacity-90">
          Just tell me what you&apos;d like to focus on, or I can create a comprehensive improvement plan.
        </p>
      </div>
    </div>
  );
}