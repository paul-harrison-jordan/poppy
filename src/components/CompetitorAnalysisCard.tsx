'use client';

import { useState } from 'react';

interface CompetitorInsight {
  feature: string;
  description: string;
  customerBenefit: string;
  implementationHints: string;
  confidence: number;
}

interface CompetitorAnalysis {
  name: string;
  summary: string;
  ourEdge: string;
  sourceUrl?: string;
  features?: string[];
  insights?: CompetitorInsight[];
}

interface CompetitorAnalysisCardProps {
  competitor: CompetitorAnalysis;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function CompetitorAnalysisCard({ 
  competitor, 
  isExpanded = false, 
  onToggle 
}: CompetitorAnalysisCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.();
  };

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {competitor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {competitor.name}
            </h3>
            <p className="text-xs text-gray-500">
              {competitor.features?.length || 0} features analyzed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {competitor.sourceUrl && (
            <a
              href={competitor.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Summary (always visible) */}
      <div className="px-4 pb-2">
        <p className="text-sm text-gray-700 leading-relaxed">
          {competitor.summary}
        </p>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Our Edge */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-medium text-green-800">Our Opportunity</span>
            </div>
            <p className="text-sm text-green-700">
              {competitor.ourEdge}
            </p>
          </div>

          {/* Key Features */}
          {competitor.features && competitor.features.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-800 mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Key Features
              </h4>
              <div className="flex flex-wrap gap-1">
                {competitor.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Insights */}
          {competitor.insights && competitor.insights.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-800 mb-3 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Problem-Solving Approaches
              </h4>
              <div className="space-y-3">
                {competitor.insights.map((insight, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-sm text-gray-900">
                        {insight.feature}
                      </h5>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          insight.confidence >= 0.8 ? 'bg-green-500' : 
                          insight.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-xs text-gray-500">
                          {Math.round(insight.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">
                      {insight.description}
                    </p>
                    <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                      <span className="font-medium">Customer Benefit:</span> {insight.customerBenefit}
                    </div>
                    {insight.implementationHints && (
                      <div className="text-xs text-purple-700 bg-purple-50 p-2 rounded border border-purple-200 mt-2">
                        <span className="font-medium">Implementation:</span> {insight.implementationHints}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}