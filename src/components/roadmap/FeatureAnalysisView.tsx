'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  ExternalLink,
  Calendar,
  Clock,
  Target,
  Users,
  FileText,
  Palette,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'

interface FeatureAnalysisProps {
  featureId: number
  onBack: () => void
}

interface FeatureDetail {
  id: number
  title?: string
  description?: string
  'drive-link': string
  'v0-link'?: string
  user: string
  created_at: string
  roadmap?: {
    priority_order?: number
    status?: string
    target_quarter?: string
    estimated_effort_points?: number
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
  }
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
  in_review: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
}

export default function FeatureAnalysisView({ featureId, onBack }: FeatureAnalysisProps) {
  const [feature, setFeature] = useState<FeatureDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeatureDetail()
  }, [featureId])

  const fetchFeatureDetail = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${featureId}`)
      if (response.ok) {
        const data = await response.json()
        setFeature(data)
      }
    } catch (error) {
      console.error('Error fetching feature detail:', error)
    } finally {
      setLoading(false)
    }
  }

  // Convert story points to weeks (assuming 1 story point = 0.5 weeks)
  const getTimelineInWeeks = (storyPoints?: number) => {
    if (!storyPoints) return 'Not estimated'
    const weeks = Math.ceil(storyPoints * 0.5)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }

  const getRiskLevel = (complexity?: number) => {
    if (!complexity) return 'Unknown'
    if (complexity <= 3) return 'Low Risk'
    if (complexity <= 7) return 'Medium Risk'
    return 'High Risk'
  }

  const getValueImpact = (value?: number) => {
    if (!value) return 'Unknown'
    if (value <= 3) return 'Low Impact'
    if (value <= 7) return 'Medium Impact'
    return 'High Impact'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!feature) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Feature not found</h3>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Roadmap
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Roadmap
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {feature.title || `Feature #${feature.id}`}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={statusColors[feature.roadmap?.status as keyof typeof statusColors] || statusColors.planned}>
                    {feature.roadmap?.status || 'Planned'}
                  </Badge>
                  {feature.roadmap?.priority_order && (
                    <Badge variant="outline">Priority #{feature.roadmap.priority_order}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Feature Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {feature.description || 'No description provided. Consider adding more details about what this feature does and why it\'s important.'}
                  </p>
                </div>

                {feature.roadmap?.roadmap_notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Technical Notes</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {feature.roadmap.roadmap_notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Owner: {feature.user.split('@')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Created {new Date(feature.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Timeline Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Estimated Timeline</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {getTimelineInWeeks(feature.roadmap?.estimated_effort_points)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {feature.roadmap?.estimated_effort_points || 0} story points
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Target Quarter</h3>
                      <p className="text-lg font-medium text-gray-700">
                        {feature.roadmap?.target_quarter || 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Technical Risk</h3>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium px-2 py-1 rounded ${
                          (feature.roadmap?.technical_complexity_score || 0) <= 3 
                            ? 'bg-green-100 text-green-800'
                            : (feature.roadmap?.technical_complexity_score || 0) <= 7
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getRiskLevel(feature.roadmap?.technical_complexity_score)}
                        </p>
                        <span className="text-sm text-gray-500">
                          ({feature.roadmap?.technical_complexity_score || 0}/10)
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Business Impact</h3>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium px-2 py-1 rounded ${
                          (feature.roadmap?.business_value_score || 0) <= 3 
                            ? 'bg-gray-100 text-gray-800'
                            : (feature.roadmap?.business_value_score || 0) <= 7
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getValueImpact(feature.roadmap?.business_value_score)}
                        </p>
                        <span className="text-sm text-gray-500">
                          ({feature.roadmap?.business_value_score || 0}/10)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Design & Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Assets & Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PRD Document */}
                  <a
                    href={feature['drive-link']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
                  >
                    <FileText className="w-8 h-8 text-blue-600 mr-3" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Product Requirements
                      </h3>
                      <p className="text-sm text-gray-600">
                        Full specifications and requirements
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </a>

                  {/* Design Link */}
                  {feature['v0-link'] ? (
                    <a
                      href={feature['v0-link']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
                    >
                      <Palette className="w-8 h-8 text-purple-600 mr-3" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          Design Mockups
                        </h3>
                        <p className="text-sm text-gray-600">
                          Visual designs and prototypes
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    </a>
                  ) : (
                    <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <Palette className="w-8 h-8 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-500">Design Mockups</h3>
                        <p className="text-sm text-gray-400">
                          No design available yet
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Effort</span>
                  <span className="font-semibold">
                    {feature.roadmap?.estimated_effort_points || 0} pts
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Timeline</span>
                  <span className="font-semibold">
                    {getTimelineInWeeks(feature.roadmap?.estimated_effort_points)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Business Value</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-semibold">
                      {feature.roadmap?.business_value_score || 0}/10
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Complexity</span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold">
                      {feature.roadmap?.technical_complexity_score || 0}/10
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <div className="flex items-center gap-1">
                      {feature.roadmap?.status === 'shipped' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="font-semibold capitalize">
                        {feature.roadmap?.status || 'Planned'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">
                  <BarChart3 className="w-5 h-5 inline mr-2" />
                  Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(feature.roadmap?.business_value_score || 0) >= 8 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <p className="text-sm text-blue-900">High business value - prioritize for development</p>
                    </div>
                  )}
                  
                  {(feature.roadmap?.technical_complexity_score || 0) >= 8 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                      <p className="text-sm text-blue-900">High complexity - consider breaking into smaller features</p>
                    </div>
                  )}
                  
                  {!feature['v0-link'] && (
                    <div className="flex items-start gap-2">
                      <Palette className="w-4 h-4 text-purple-600 mt-0.5" />
                      <p className="text-sm text-blue-900">Missing design mockups - consider creating before development</p>
                    </div>
                  )}

                  {(feature.roadmap?.estimated_effort_points || 0) === 0 && (
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-blue-900">No effort estimate - needs sizing before scheduling</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 