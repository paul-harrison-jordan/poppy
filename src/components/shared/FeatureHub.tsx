'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ExternalLink, 
  Calendar, 
  Target, 
  MessageSquare,
  FileText,
  Palette,
  CheckSquare,
  Clock,
  AlertTriangle,
  Activity,
  Eye,
  GitBranch,
  RefreshCw
} from 'lucide-react'

interface FeatureHubProps {
  featureId: string
  isPublic: boolean
}

interface FeatureData {
  id: number
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'in_review' | 'shipped'
  confidence: number
  targetShipDate: string
  createdAt: string
  lastUpdated: string
  hero: {
    why: string
    targetWindow: string
    confidence: number
  }
  sections: {
    prd: {
      url: string
      lastUpdated: string
      summary: string
    }
    design: {
      figma?: string
      v0Mocks?: string[]
      status: string
      lastUpdated: string
    }
    engineering: {
      jiraEpics: Array<{
        key: string
        title: string
        status: string
        url: string
        progress: number
      }>
      blockers: string[]
      velocity: number
    }
    feedback: {
      threads: Array<{
        id: string
        source: string
        summary: string
        sentiment: 'positive' | 'neutral' | 'negative'
        lastActivity: string
        url?: string
      }>
      overallSentiment: 'positive' | 'neutral' | 'negative'
    }
  }
  activity: Array<{
    id: string
    type: 'prd_update' | 'design_review' | 'code_commit' | 'feedback' | 'status_change'
    title: string
    description: string
    author: string
    timestamp: string
    url?: string
  }>
}

const statusConfig = {
  planned: { color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Calendar },
  in_progress: { color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
  in_review: { color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Eye },
  shipped: { color: 'bg-green-50 border-green-200 text-green-700', icon: CheckSquare }
}

const sentimentConfig = {
  positive: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  neutral: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  negative: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
}

export default function FeatureHub({ featureId }: FeatureHubProps) {
  const [feature, setFeature] = useState<FeatureData | null>(null)
  const [loading, setLoading] = useState(true)

  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  // Mock data for demonstration
  useEffect(() => {
    const mockFeature: FeatureData = {
      id: parseInt(featureId),
      title: "Customer Dashboard Redesign",
      description: "Complete overhaul of the customer dashboard to improve user experience and reduce churn",
      status: 'in_progress',
      confidence: 85,
      targetShipDate: '2024-03-15',
      createdAt: '2024-01-10',
      lastUpdated: new Date().toISOString(),
      hero: {
        why: "Customer satisfaction scores have dropped 15% due to navigation complexity. This redesign will streamline the user journey and reduce time-to-value by 40%.",
        targetWindow: "Q1 2024 (March 15th target)",
        confidence: 85
      },
      sections: {
        prd: {
          url: "https://docs.google.com/document/d/abc123",
          lastUpdated: "2024-01-18",
          summary: "Comprehensive PRD covering user research, technical requirements, and success metrics. Last updated with mobile responsiveness requirements."
        },
        design: {
          figma: "https://figma.com/design/dashboard-v2",
          v0Mocks: ["https://v0.dev/t/abc123", "https://v0.dev/t/def456"],
          status: "Design review complete",
          lastUpdated: "2024-01-20"
        },
        engineering: {
          jiraEpics: [
            {
              key: "DASH-123",
              title: "Frontend Dashboard Components",
              status: "In Progress",
              url: "https://company.atlassian.net/browse/DASH-123",
              progress: 75
            },
            {
              key: "DASH-124", 
              title: "Backend API Updates",
              status: "To Do",
              url: "https://company.atlassian.net/browse/DASH-124",
              progress: 0
            }
          ],
          blockers: ["Waiting for API team review"],
          velocity: 7.5
        },
        feedback: {
          threads: [
            {
              id: "1",
              source: "Customer Support",
              summary: "Users reporting confusion with current navigation - requesting simpler layout",
              sentiment: "negative",
              lastActivity: "2024-01-19",
              url: "https://company.slack.com/thread/123"
            },
            {
              id: "2", 
              source: "Product Team",
              summary: "Positive feedback on new wireframes from stakeholder review",
              sentiment: "positive",
              lastActivity: "2024-01-18"
            }
          ],
          overallSentiment: "positive"
        }
      },
      activity: [
        {
          id: "1",
          type: "design_review",
          title: "Design Review Complete", 
          description: "Stakeholder review completed with minor feedback incorporated",
          author: "Sarah Chen",
          timestamp: "2024-01-20T14:30:00Z"
        },
        {
          id: "2",
          type: "prd_update",
          title: "PRD Updated",
          description: "Added mobile responsiveness requirements and updated success metrics",
          author: "Mike Johnson",
          timestamp: "2024-01-18T16:45:00Z",
          url: "https://docs.google.com/document/d/abc123"
        }
      ]
    }

    setFeature(mockFeature)
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }, [featureId])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setLastRefresh(new Date().toLocaleTimeString())
      // In real implementation, would refetch data here
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [autoRefresh])



  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50' 
    return 'text-red-600 bg-red-50'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prd_update': return FileText
      case 'design_review': return Palette
      case 'code_commit': return GitBranch
      case 'feedback': return MessageSquare
      case 'status_change': return Activity
      default: return Activity
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poppy"></div>
      </div>
    )
  }

  if (!feature) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Feature Not Found</h2>
          <p className="text-gray-600">The requested feature could not be found.</p>
        </div>
      </div>
    )
  }

  const StatusIcon = statusConfig[feature.status].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto p-6">
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-poppy/10 rounded-lg flex items-center justify-center">
                <StatusIcon className="w-5 h-5 text-poppy" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{feature.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${statusConfig[feature.status].color} border text-xs font-medium`}>
                    {feature.status.replace('_', ' ')}
                  </Badge>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(feature.confidence)}`}>
                    <Target className="w-3 h-3" />
                    {feature.confidence}%
                  </div>
                  <div className="text-xs text-gray-500">Target: {feature.hero.targetWindow}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span>Updated: {lastRefresh}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="h-8 w-8 p-0 text-gray-600 hover:text-poppy"
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Compact Why Statement */}
          <div className="bg-gradient-to-r from-poppy/5 to-poppy/10 border border-poppy/20 rounded-lg p-4">
            <p className="text-sm text-gray-800 leading-relaxed">{feature.hero.why}</p>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PRD Status */}
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-sm">PRD</span>
                  </div>
                  <a 
                    href={feature.sections.prd.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="text-xs text-blue-700 mb-1">
                  Updated: {new Date(feature.sections.prd.lastUpdated).toLocaleDateString()}
                </div>
                <p className="text-xs text-blue-800 line-clamp-2">{feature.sections.prd.summary}</p>
              </Card>

              {/* Design Status */}
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-900 text-sm">Design</span>
                  </div>
                  <div className="flex gap-1">
                    {feature.sections.design.figma && (
                      <a 
                        href={feature.sections.design.figma} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-xs text-purple-700 mb-1">
                  {feature.sections.design.status}
                </div>
                <div className="text-xs text-purple-800">
                  v0 Mocks: {feature.sections.design.v0Mocks?.length || 0}
                </div>
              </Card>

              {/* Engineering Status */}
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-900 text-sm">Engineering</span>
                  </div>
                  <div className="text-xs text-green-700 font-medium">
                    {feature.sections.engineering.velocity}/10 velocity
                  </div>
                </div>
                <div className="text-xs text-green-700 mb-1">
                  {feature.sections.engineering.jiraEpics.length} epics
                </div>
                <div className="text-xs text-green-800">
                  {feature.sections.engineering.blockers.length > 0 && (
                    <span className="text-red-600">⚠ {feature.sections.engineering.blockers.length} blockers</span>
                  )}
                </div>
              </Card>
            </div>

            {/* Engineering Details */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Engineering Progress
                </h3>
              </div>
              
              <div className="space-y-3">
                {feature.sections.engineering.jiraEpics.map((epic) => (
                  <div key={epic.key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <a 
                          href={epic.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-blue-600 hover:text-blue-800"
                        >
                          {epic.key}
                        </a>
                        <Badge variant="outline" className="text-xs">
                          {epic.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {epic.progress}%
                      </div>
                    </div>
                    <h4 className="text-sm text-gray-900 mb-2">{epic.title}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${epic.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {feature.sections.engineering.blockers.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-900 text-sm">Blockers</span>
                    </div>
                    <ul className="space-y-1">
                      {feature.sections.engineering.blockers.map((blocker, index) => (
                        <li key={index} className="text-xs text-red-800">• {blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Feedback & Activity */}
          <div className="space-y-6">
            {/* Feedback Summary */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feedback
                </h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${sentimentConfig[feature.sections.feedback.overallSentiment].color} ${sentimentConfig[feature.sections.feedback.overallSentiment].bg}`}>
                  {feature.sections.feedback.overallSentiment}
                </div>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {feature.sections.feedback.threads.map((thread) => (
                  <div key={thread.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs text-gray-900">{thread.source}</span>
                          <div className={`w-2 h-2 rounded-full ${
                            thread.sentiment === 'positive' ? 'bg-green-400' :
                            thread.sentiment === 'negative' ? 'bg-red-400' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-2">{thread.summary}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(thread.lastActivity).toLocaleDateString()}
                        </div>
                      </div>
                      {thread.url && (
                        <a 
                          href={thread.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </h3>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {feature.activity.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <ActivityIcon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                        <div className="text-xs text-gray-500 mt-1">by {activity.author}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}