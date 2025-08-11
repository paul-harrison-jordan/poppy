'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Target, TrendingUp, Loader2, CheckCircle, AlertCircle, ExternalLink, Globe } from 'lucide-react'

interface CompetitorAnalysis {
  competitor: string
  analysis: {
    summary: string
  }
  sources: {
    title: string
    url: string
    snippet: string
  }[]
}

interface CompetitiveAnalysisResult {
  success: boolean
  requestId: string
  analysis: {
    problemStatement: string
    ourApproach: {
      solution_approach: string
      key_methodology: string
      unique_aspects: string
    }
    competitorApproaches: CompetitorAnalysis[]
    comparison: {
      competitiveLandscape: string
      ourPosition: string
      keyInsights: string[]
      recommendations: string[]
      differentiationOpportunities: string[]
    }
  }
}

export default function CompetitiveAnalysisPage() {
  const [formData, setFormData] = useState({
    PRD: '',
    COMPETITORS: [''],
    WHY_WE_WIN: '',
    WHY_WE_LOSE: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CompetitiveAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCompetitorChange = (index: number, value: string) => {
    const newCompetitors = [...formData.COMPETITORS]
    newCompetitors[index] = value
    setFormData({ ...formData, COMPETITORS: newCompetitors })
  }

  const addCompetitor = () => {
    if (formData.COMPETITORS.length < 5) {
      setFormData({ 
        ...formData, 
        COMPETITORS: [...formData.COMPETITORS, ''] 
      })
    }
  }

  const removeCompetitor = (index: number) => {
    if (formData.COMPETITORS.length > 1) {
      const newCompetitors = formData.COMPETITORS.filter((_, i) => i !== index)
      setFormData({ ...formData, COMPETITORS: newCompetitors })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const filteredCompetitors = formData.COMPETITORS.filter(c => c.trim() !== '')
      
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          COMPETITORS: filteredCompetitors
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }


  const isFormValid = () => {
    return (
      formData.PRD.trim().length >= 50 &&
      formData.COMPETITORS.filter(c => c.trim() !== '').length >= 1 &&
      formData.WHY_WE_WIN.trim().length >= 20 &&
      formData.WHY_WE_LOSE.trim().length >= 20
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-white to-lavender-secondary-light/20 pl-64">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-poppy-primary-light rounded-xl">
              <Target className="w-6 h-6 text-poppy-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-poppy-primary">Competitive Analysis</h1>
              <p className="text-warm-neutral">Analyze how competitors solve similar problems</p>
            </div>
          </div>
        </div>

        {/* Analysis Form */}
        <motion.div 
          className="bg-warm-white rounded-2xl shadow-lg border border-warm-neutral/10 p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PRD Input */}
            <div>
              <label className="block text-sm font-semibold text-poppy-primary mb-2">
                Product Requirements Document (PRD)
              </label>
              <textarea
                value={formData.PRD}
                onChange={(e) => setFormData({ ...formData, PRD: e.target.value })}
                placeholder="Describe your product feature or solution in detail (minimum 50 characters)..."
                className="w-full h-32 p-4 border border-warm-neutral/20 rounded-xl resize-none focus:ring-2 focus:ring-poppy-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-warm-neutral mt-1">
                {formData.PRD.length}/50 minimum characters
              </p>
            </div>

            {/* Competitors */}
            <div>
              <label className="block text-sm font-semibold text-poppy-primary mb-2">
                Competitors (1-5)
              </label>
              <div className="space-y-2">
                {formData.COMPETITORS.map((competitor, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={competitor}
                      onChange={(e) => handleCompetitorChange(index, e.target.value)}
                      placeholder={`Competitor ${index + 1}`}
                      className="flex-1 p-3 border border-warm-neutral/20 rounded-lg focus:ring-2 focus:ring-poppy-primary focus:border-transparent"
                      required={index === 0}
                    />
                    {formData.COMPETITORS.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCompetitor(index)}
                        className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {formData.COMPETITORS.length < 5 && (
                <button
                  type="button"
                  onClick={addCompetitor}
                  className="mt-2 px-4 py-2 text-poppy-primary hover:bg-poppy-primary-light rounded-lg text-sm"
                >
                  Add Competitor
                </button>
              )}
            </div>

            {/* Why We Win */}
            <div>
              <label className="block text-sm font-semibold text-poppy-primary mb-2">
                Why We Win
              </label>
              <textarea
                value={formData.WHY_WE_WIN}
                onChange={(e) => setFormData({ ...formData, WHY_WE_WIN: e.target.value })}
                placeholder="Describe your competitive advantages (minimum 20 characters)..."
                className="w-full h-24 p-4 border border-warm-neutral/20 rounded-xl resize-none focus:ring-2 focus:ring-poppy-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-warm-neutral mt-1">
                {formData.WHY_WE_WIN.length}/20 minimum characters
              </p>
            </div>

            {/* Why We Lose */}
            <div>
              <label className="block text-sm font-semibold text-poppy-primary mb-2">
                Why We Lose
              </label>
              <textarea
                value={formData.WHY_WE_LOSE}
                onChange={(e) => setFormData({ ...formData, WHY_WE_LOSE: e.target.value })}
                placeholder="Describe your competitive disadvantages (minimum 20 characters)..."
                className="w-full h-24 p-4 border border-warm-neutral/20 rounded-xl resize-none focus:ring-2 focus:ring-poppy-primary focus:border-transparent"
                required
              />
              <p className="text-xs text-warm-neutral mt-1">
                {formData.WHY_WE_LOSE.length}/20 minimum characters
              </p>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="w-full bg-poppy-primary text-warm-white py-4 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-poppy-primary/90 transition-colors"
              whileHover={{ scale: isFormValid() && !isLoading ? 1.02 : 1 }}
              whileTap={{ scale: isFormValid() && !isLoading ? 0.98 : 1 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Competitors...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  Start Competitive Analysis
                </div>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">Analysis Failed</span>
            </div>
            <p className="text-destructive mt-1">{error}</p>
          </motion.div>
        )}

        {/* Results Display */}
        {result?.success && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Success Banner */}
            <div className="bg-success/10 border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Analysis Complete</span>
                <span className="text-xs text-warm-neutral ml-auto">
                  Request ID: {result.requestId.slice(0, 8)}...
                </span>
              </div>
            </div>

            {/* Problem Statement */}
            <div className="bg-warm-white rounded-2xl shadow-lg border border-warm-neutral/10 p-6">
              <h3 className="text-xl font-bold text-poppy-primary mb-3">Problem Statement</h3>
              <p className="text-warm-neutral leading-relaxed">{result.analysis.problemStatement}</p>
            </div>

            {/* Our Approach */}
            <div className="bg-warm-white rounded-2xl shadow-lg border border-warm-neutral/10 p-6">
              <h3 className="text-xl font-bold text-poppy-primary mb-4">Our Approach</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Solution Approach</h4>
                  <p className="text-warm-neutral">{result.analysis.ourApproach.solution_approach}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Key Methodology</h4>
                  <p className="text-warm-neutral">{result.analysis.ourApproach.key_methodology}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Unique Aspects</h4>
                  <p className="text-warm-neutral">{result.analysis.ourApproach.unique_aspects}</p>
                </div>
              </div>
            </div>

            {/* Competitor Approaches */}
            <div className="bg-warm-white rounded-2xl shadow-lg border border-warm-neutral/10 p-6">
              <h3 className="text-xl font-bold text-poppy-primary mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Competitor Analysis
              </h3>
              <div className="space-y-6">
                {result.analysis.competitorApproaches.map((comp, index) => (
                  <div key={index} className="border border-warm-neutral/10 rounded-xl p-5">
                    <h4 className="font-bold text-xl text-poppy-primary mb-3">{comp.competitor}</h4>
                    
                    {/* Analysis Summary */}
                    <div className="mb-4">
                      <p className="text-warm-neutral leading-relaxed">{comp.analysis.summary}</p>
                    </div>
                    
                    {/* Sources */}
                    {comp.sources && comp.sources.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ExternalLink className="w-4 h-4 text-poppy-primary" />
                          <span className="font-semibold text-poppy-primary text-sm">Sources</span>
                        </div>
                        <div className="space-y-2">
                          {comp.sources.map((source, sourceIndex) => (
                            <div key={sourceIndex} className="bg-warm-neutral-light/30 rounded-lg p-3 border border-warm-neutral/10">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-poppy-primary hover:text-poppy-primary/80 font-medium text-sm flex items-center gap-1 mb-1"
                              >
                                {source.title}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <p className="text-xs text-warm-neutral leading-relaxed">{source.snippet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* No sources message */}
                    {(!comp.sources || comp.sources.length === 0) && (
                      <div className="bg-warm-neutral-light/20 rounded-lg p-3 border border-warm-neutral/10">
                        <p className="text-xs text-warm-neutral">
                          No sources found. Consider searching manually: 
                          <a 
                            href={`https://google.com/search?q=${encodeURIComponent(comp.competitor + ' customer support features')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-poppy-primary hover:text-poppy-primary/80 ml-1 underline"
                          >
                            Search Google
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Comparison */}
            <div className="bg-warm-white rounded-2xl shadow-lg border border-warm-neutral/10 p-6">
              <h3 className="text-xl font-bold text-poppy-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Strategic Analysis
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Competitive Landscape</h4>
                  <p className="text-warm-neutral">{result.analysis.comparison.competitiveLandscape}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Our Position</h4>
                  <p className="text-warm-neutral">{result.analysis.comparison.ourPosition}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Key Insights</h4>
                  <ul className="list-disc list-inside text-warm-neutral space-y-1">
                    {result.analysis.comparison.keyInsights.map((insight, index) => (
                      <li key={index}>{insight}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside text-warm-neutral space-y-1">
                    {result.analysis.comparison.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-poppy-primary mb-2">Differentiation Opportunities</h4>
                  <ul className="list-disc list-inside text-warm-neutral space-y-1">
                    {result.analysis.comparison.differentiationOpportunities.map((opp, index) => (
                      <li key={index}>{opp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}