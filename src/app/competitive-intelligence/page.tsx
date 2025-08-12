'use client';

import React, { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Search, Globe, FileText, Sparkles, ArrowRight, X } from 'lucide-react';

interface CompetitorInsight {
  feature: string;
  description: string;
  customerBenefit: string;
  implementationHints: string;
  confidence: number;
}

interface SearchResult {
  competitor: string;
  helpDocsUrl: string;
  insights: CompetitorInsight[];
  searchQueries: string[];
  timestamp: string;
}

export default function CompetitiveIntelligencePage() {
  const [helpDocsUrl, setHelpDocsUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!helpDocsUrl) {
      setError('Please enter a help documentation URL');
      return;
    }

    // Validate URL
    try {
      new URL(helpDocsUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/competitive-intelligence/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ helpDocsUrl }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults([data, ...searchResults]);
      setHelpDocsUrl('');
    } catch (err) {
      setError('Failed to search help documentation. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const removeResult = (index: number) => {
    setSearchResults(searchResults.filter((_, i) => i !== index));
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Competitive Intelligence
            </h1>
            <p className="text-lg text-gray-600">
              Analyze competitor help documentation to understand how they communicate feature value to customers
            </p>
          </div>

          {/* Search Input */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-start space-x-3 mb-4">
              <Globe className="w-5 h-5 text-blue-500 mt-1" />
              <div className="flex-1">
                <label htmlFor="helpDocsUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Help Documentation URL
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Enter the URL of a competitor&apos;s help center or documentation site to analyze how they explain their features
                </p>
                <div className="flex space-x-3">
                  <input
                    id="helpDocsUrl"
                    type="url"
                    value={helpDocsUrl}
                    onChange={(e) => setHelpDocsUrl(e.target.value)}
                    placeholder="https://help.competitor.com or https://docs.competitor.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSearching}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !helpDocsUrl}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Analyze</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-6">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{result.competitor}</h3>
                        <a 
                          href={result.helpDocsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {result.helpDocsUrl}
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => removeResult(index)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Queries Used */}
                  <div className="px-6 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Search queries performed:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.searchQueries.map((query, qIndex) => (
                        <span key={qIndex} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Insights */}
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Sparkles className="w-4 h-4 text-yellow-500 mr-2" />
                      Feature Insights
                    </h4>
                    <div className="space-y-4">
                      {result.insights.map((insight, iIndex) => (
                        <div key={iIndex} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">{insight.feature}</h5>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                          
                          <div className="space-y-2 mt-3">
                            <div className="flex items-start space-x-2">
                              <ArrowRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-xs font-medium text-gray-600">Customer Benefit: </span>
                                <span className="text-xs text-gray-700">{insight.customerBenefit}</span>
                              </div>
                            </div>
                            <div className="flex items-start space-x-2">
                              <ArrowRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-xs font-medium text-gray-600">Implementation: </span>
                                <span className="text-xs text-gray-700">{insight.implementationHints}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Analyzed on {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {searchResults.length === 0 && !isSearching && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No competitor analysis yet
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Enter a competitor&apos;s help documentation URL above to start analyzing how they communicate feature value to their customers.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}