'use client';

import { useState } from 'react';

interface Competitor {
  name: string;
  summary: string;
  ourEdge: string;
  sourceUrl?: string;
  features?: string[];
  relevantArticles?: Array<{
    title: string;
    url: string;
  }>;
  noResultsFound?: boolean;
  error?: string;
}

interface CompetitiveAnalysisResultsProps {
  query: string;
  competitors: Competitor[];
  summary?: string;
  sourceCount: number;
  searchedUrls: string[];
  onSearchOtherCompetitors?: () => void;
}

export default function CompetitiveAnalysisResults({
  query,
  competitors,
  summary,
  sourceCount,
  searchedUrls,
  onSearchOtherCompetitors
}: CompetitiveAnalysisResultsProps) {
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);
  const [showAllSources, setShowAllSources] = useState(false);

  if (!competitors || competitors.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-900">No Competitor Insights Found</h3>
            <p className="text-sm text-red-700">Analysis for &ldquo;{query}&rdquo; returned no results</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-red-800">
          <p>This could be because:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>The URLs provided don&apos;t contain help documentation</li>
            <li>The search terms don&apos;t match the competitor&apos;s documentation structure</li>
            <li>The competitors don&apos;t publicly document this feature</li>
          </ul>
          
          <div className="mt-4 p-3 bg-red-100 rounded border border-red-300">
            <p className="font-medium mb-2">💡 Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Try different competitor help desk URLs (e.g., help.zendesk.com, support.intercom.com)</li>
              <li>Refine your search query to be more specific</li>
              <li>Check if the competitors have publicly accessible documentation</li>
            </ul>
            
            {onSearchOtherCompetitors && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <button
                  onClick={onSearchOtherCompetitors}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  🔍 Search for Other Competitors
                </button>
                <p className="text-xs text-red-700 mt-2 text-center">
                  We&apos;ll help you find and analyze different competitors for this query
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const allSources = competitors.flatMap(comp => 
    (comp.relevantArticles || []).map(article => ({
      ...article,
      competitorName: comp.name
    }))
  );

  // Identify competitors that had no results or errors
  const failedCompetitors = competitors.filter(comp => comp.noResultsFound || comp.error);
  const successfulCompetitors = competitors.filter(comp => !comp.noResultsFound && !comp.error);

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Competitive Analysis: &ldquo;{query}&rdquo;
            </h3>
            <p className="text-blue-800 mb-4 leading-relaxed">
              {summary || `Analyzed ${competitors.length} competitors to understand how they approach this feature.`}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-blue-700">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>{competitors.length} competitors</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{sourceCount} source documents</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                <span>{searchedUrls.length} sites analyzed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Successful Competitor Cards */}
      {successfulCompetitors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Competitor Insights Found ({successfulCompetitors.length})
          </h3>
          {successfulCompetitors.map((competitor, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
            {/* Competitor Header */}
            <div 
              className="p-5 cursor-pointer"
              onClick={() => setExpandedCompetitor(expandedCompetitor === index ? null : index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">
                      {competitor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {competitor.name}
                      </h4>
                      {competitor.sourceUrl && (
                        <a
                          href={competitor.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      <span className="font-medium text-gray-900">How they solve this:</span> {competitor.summary}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{competitor.features?.length || 0} features</span>
                      <span>•</span>
                      <span>{competitor.relevantArticles?.length || 0} sources</span>
                    </div>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${expandedCompetitor === index ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedCompetitor === index && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                {/* Our Edge */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-green-900 mb-1">Our Differentiation Opportunity</h5>
                      <p className="text-green-800 text-sm leading-relaxed">{competitor.ourEdge}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                {competitor.features && competitor.features.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Key Features
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {competitor.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="inline-block bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full border border-gray-200"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Articles */}
                {competitor.relevantArticles && competitor.relevantArticles.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Documentation Sources
                    </h5>
                    <div className="space-y-2">
                      {competitor.relevantArticles.map((article, articleIndex) => (
                        <a
                          key={articleIndex}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="text-sm font-medium text-blue-800 group-hover:text-blue-900">
                              {article.title}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        </div>
      )}

      {/* Failed Competitors Section */}
      {failedCompetitors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Sites With No Results ({failedCompetitors.length})
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 mb-3">
              The following competitor sites didn&apos;t yield any results for your query. This could be due to:
            </p>
            <ul className="list-disc list-inside text-xs text-yellow-700 mb-4 space-y-1">
              <li>No publicly accessible help documentation</li>
              <li>Documentation structure doesn&apos;t match search terms</li>
              <li>Sites require authentication or have restricted access</li>
              <li>Different terminology used for similar features</li>
            </ul>
            
            <div className="space-y-2">
              {failedCompetitors.map((competitor, index) => (
                <div key={index} className="flex items-center justify-between bg-yellow-100 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center">
                      <span className="text-yellow-700 font-semibold text-sm">
                        {competitor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-900">{competitor.name}</p>
                      <p className="text-xs text-yellow-700">
                        {competitor.error ? `Error: ${competitor.error}` : 'No documentation found'}
                      </p>
                    </div>
                  </div>
                  {competitor.sourceUrl && (
                    <a
                      href={competitor.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-600 hover:text-yellow-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>

            {onSearchOtherCompetitors && (
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <button
                  onClick={onSearchOtherCompetitors}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  🔍 Find Alternative Competitors
                </button>
                <p className="text-xs text-yellow-700 mt-2 text-center">
                  Let&apos;s help you find competitors with better documentation coverage
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Sources Section */}
      {allSources.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              All Source References ({allSources.length})
            </h4>
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAllSources ? 'Hide' : 'Show All'}
            </button>
          </div>
          
          {showAllSources && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allSources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-900 line-clamp-2">
                        {source.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {source.competitorName}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}