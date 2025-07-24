'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  MessageSquare,
  FileText,
  Palette,
  Users,
  Star,
  Target,
  TrendingUp,
  Calendar,
  Link as LinkIcon,
  Download,
  Share2,
  Edit3,
  BarChart3
} from 'lucide-react'

interface FeatureApprovalViewProps {
  prdId: number
  userEmail: string
  onBack: () => void
}

interface PRDDetail {
  id: number
  title?: string
  description?: string
  'drive-link': string
  'v0-link'?: string
  user: string
  shipped: boolean
  created_at: string
  updated_at: string
  roadmap?: {
    priority_order: number
    status: string
    target_quarter?: string
    estimated_effort_points?: number
    business_value_score?: number
    technical_complexity_score?: number
    dependencies?: string[]
    risks?: Array<{risk: string, mitigation: string, impact: string}>
    success_metrics?: Array<{metric: string, target: string, measurement: string}>
    roadmap_notes?: string
    last_updated_by?: string
  }
  slack_channels?: Array<{
    id: number
    channel_name: string
    channel_url?: string
    channel_purpose?: string
    is_primary: boolean
  }>
  jira_tickets?: Array<{
    id: number
    ticket_key: string
    ticket_url: string
    ticket_type?: string
    ticket_title?: string
    ticket_status?: string
    is_primary_epic: boolean
  }>
  customer_feedback?: Array<{
    id: number
    customer_name?: string
    customer_company?: string
    feedback_type: string
    feedback_content: string
    urgency_level: string
    business_impact?: string
    feedback_date?: string
  }>
  stakeholder_signoffs?: Array<{
    id: number
    stakeholder_name: string
    stakeholder_role?: string
    signoff_type: string
    status: string
    signoff_notes?: string
    due_date?: string
  }>
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
  in_review: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
}

const urgencyColors = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  low: 'bg-green-50 border-green-200 text-green-800'
}

export default function FeatureApprovalView({ prdId, userEmail, onBack }: FeatureApprovalViewProps) {
  const [prd, setPRD] = useState<PRDDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isUpdating, setIsUpdating] = useState(false)
  const [comments, setComments] = useState<any[]>([])

  useEffect(() => {
    fetchPRDDetail()
    fetchComments()
  }, [prdId])

  const fetchPRDDetail = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prdId}`)
      if (response.ok) {
        const data = await response.json()
        setPRD(data)
      }
    } catch (error) {
      console.error('Error fetching PRD detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/features/${prdId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!prd) return
    
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchPRDDetail() // Refresh data
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getApprovalScore = () => {
    if (!prd) return 0
    
    let score = 0
    let maxScore = 0
    
    // Business value (30%)
    if (prd.roadmap?.business_value_score) {
      score += (prd.roadmap.business_value_score / 10) * 30
    }
    maxScore += 30
    
    // Stakeholder approval (25%)
    const approvedSignoffs = prd.stakeholder_signoffs?.filter(s => s.status === 'approved').length || 0
    const totalSignoffs = prd.stakeholder_signoffs?.length || 1
    score += (approvedSignoffs / totalSignoffs) * 25
    maxScore += 25
    
    // Customer feedback positivity (20%)
    const positiveFeedback = prd.customer_feedback?.filter(f => 
      f.feedback_type === 'feature_request' || f.urgency_level === 'high'
    ).length || 0
    const totalFeedback = prd.customer_feedback?.length || 1
    score += (positiveFeedback / totalFeedback) * 20
    maxScore += 20
    
    // Technical feasibility (25%) - inverse of complexity
    if (prd.roadmap?.technical_complexity_score) {
      score += ((10 - prd.roadmap.technical_complexity_score) / 10) * 25
    }
    maxScore += 25
    
    return Math.round((score / maxScore) * 100)
  }

  const getRecommendation = () => {
    const score = getApprovalScore()
    if (score >= 80) return { action: 'approve', color: 'green', text: 'Strong Approve' }
    if (score >= 60) return { action: 'approve', color: 'blue', text: 'Approve with Conditions' }
    if (score >= 40) return { action: 'review', color: 'yellow', text: 'Needs More Review' }
    return { action: 'reject', color: 'red', text: 'Consider Rejecting' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!prd) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">Feature not found</h3>
      </div>
    )
  }

  const recommendation = getRecommendation()
  const approvalScore = getApprovalScore()

  return (
    <div className="space-y-6">
      {/* Header with approval status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Roadmap
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {prd.title || `Feature #${prd.id}`}
            </h1>
            <p className="text-gray-600">
              by {prd.user.split('@')[0]} • Created {new Date(prd.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Approval Score */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              approvalScore >= 80 ? 'text-green-600' :
              approvalScore >= 60 ? 'text-blue-600' :
              approvalScore >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {approvalScore}%
            </div>
            <div className="text-xs text-gray-500">Approval Score</div>
          </div>

          {/* Current Status */}
          <Badge 
            className={`${statusColors[prd.roadmap?.status as keyof typeof statusColors] || statusColors.planned} border`}
          >
            {prd.roadmap?.status || 'planned'}
          </Badge>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleStatusChange('approved')}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            
            <Button
              onClick={() => handleStatusChange('rejected')}
              disabled={isUpdating}
              variant="destructive"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div className={`p-4 rounded-lg border ${
        recommendation.color === 'green' ? 'bg-green-50 border-green-200' :
        recommendation.color === 'blue' ? 'bg-blue-50 border-blue-200' :
        recommendation.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              recommendation.color === 'green' ? 'bg-green-100' :
              recommendation.color === 'blue' ? 'bg-blue-100' :
              recommendation.color === 'yellow' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <Star className={`w-5 h-5 ${
                recommendation.color === 'green' ? 'text-green-600' :
                recommendation.color === 'blue' ? 'text-blue-600' :
                recommendation.color === 'yellow' ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <div>
              <h3 className={`font-semibold ${
                recommendation.color === 'green' ? 'text-green-800' :
                recommendation.color === 'blue' ? 'text-blue-800' :
                recommendation.color === 'yellow' ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                AI Recommendation: {recommendation.text}
              </h3>
              <p className={`text-sm ${
                recommendation.color === 'green' ? 'text-green-600' :
                recommendation.color === 'blue' ? 'text-blue-600' :
                recommendation.color === 'yellow' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                Based on business value, stakeholder approval, and technical feasibility
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              recommendation.color === 'green' ? 'text-green-600' :
              recommendation.color === 'blue' ? 'text-blue-600' :
              recommendation.color === 'yellow' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {approvalScore}%
            </div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({prd.customer_feedback?.length || 0})</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders ({prd.stakeholder_signoffs?.length || 0})</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Business Value</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(prd.roadmap?.business_value_score || 0) * 10}%` }}
                      />
                    </div>
                    <span className="font-semibold">{prd.roadmap?.business_value_score || 0}/10</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Technical Complexity</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${(prd.roadmap?.technical_complexity_score || 0) * 10}%` }}
                      />
                    </div>
                    <span className="font-semibold">{prd.roadmap?.technical_complexity_score || 0}/10</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Effort Points</span>
                  <span className="font-semibold">{prd.roadmap?.estimated_effort_points || 0} pts</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Target Quarter</span>
                  <Badge variant="outline">{prd.roadmap?.target_quarter || 'TBD'}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prd.roadmap?.risks && prd.roadmap.risks.length > 0 ? (
                  prd.roadmap.risks.map((risk, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-medium text-red-800 text-sm">{risk.risk}</div>
                      <div className="text-xs text-red-600 mt-1">{risk.mitigation}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No risks identified</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Success Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Success Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prd.roadmap?.success_metrics && prd.roadmap.success_metrics.length > 0 ? (
                  prd.roadmap.success_metrics.map((metric, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium text-green-800 text-sm">{metric.metric}</div>
                      <div className="text-xs text-green-600 mt-1">Target: {metric.target}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No success metrics defined</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {prd.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{prd.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRD Document */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Product Requirements Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">PRD Document</h4>
                      <p className="text-sm text-blue-600">Google Docs</p>
                    </div>
                    <a
                      href={prd['drive-link']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full"
                >
                  <a href={`/features/${prd.id}`} target="_blank">
                    <FileText className="w-4 h-4 mr-2" />
                    View in Detail Page
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Design Document */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Design Mockups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prd['v0-link'] ? (
                  <>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-purple-900">Design Prototype</h4>
                          <p className="text-sm text-purple-600">v0.dev</p>
                        </div>
                        <a
                          href={prd['v0-link']}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full"
                    >
                      <a href={prd['v0-link']} target="_blank">
                        <Palette className="w-4 h-4 mr-2" />
                        Open Design
                      </a>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Palette className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No design mockups available</p>
                    <Button 
                      asChild 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                    >
                      <a href={`/?mode=design&prd=${encodeURIComponent(prd['drive-link'])}&feature_id=${prd.id}`}>
                        Create Design
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          {prd.customer_feedback && prd.customer_feedback.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {prd.customer_feedback.map((feedback) => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {feedback.customer_name || 'Anonymous'}
                        </CardTitle>
                        {feedback.customer_company && (
                          <p className="text-sm text-gray-600">{feedback.customer_company}</p>
                        )}
                      </div>
                      <Badge className={urgencyColors[feedback.urgency_level as keyof typeof urgencyColors]}>
                        {feedback.urgency_level} priority
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Feedback Type</label>
                        <p className="text-sm">{feedback.feedback_type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Content</label>
                        <p className="text-sm text-gray-700">{feedback.feedback_content}</p>
                      </div>
                      {feedback.business_impact && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Business Impact</label>
                          <p className="text-sm text-gray-700">{feedback.business_impact}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No customer feedback yet</h3>
              <p className="text-gray-500">Customer feedback will appear here when available</p>
            </div>
          )}
        </TabsContent>

        {/* Stakeholder Signoffs Tab */}
        <TabsContent value="stakeholders" className="space-y-6">
          {prd.stakeholder_signoffs && prd.stakeholder_signoffs.length > 0 ? (
            <div className="space-y-4">
              {prd.stakeholder_signoffs.map((signoff) => (
                <Card key={signoff.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{signoff.stakeholder_name}</h4>
                          <p className="text-sm text-gray-600">{signoff.stakeholder_role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          signoff.status === 'approved' ? 'bg-green-100 text-green-800' :
                          signoff.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {signoff.status}
                        </Badge>
                        {signoff.due_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {new Date(signoff.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {signoff.signoff_notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        {signoff.signoff_notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No stakeholder signoffs</h3>
              <p className="text-gray-500">Stakeholder approvals will appear here when requested</p>
            </div>
          )}
        </TabsContent>

        {/* Execution Tab */}
        <TabsContent value="execution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jira Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Development Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {prd.jira_tickets && prd.jira_tickets.length > 0 ? (
                  <div className="space-y-3">
                    {prd.jira_tickets.map((ticket) => (
                      <div key={ticket.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{ticket.ticket_key}</h4>
                            <p className="text-sm text-gray-600">{ticket.ticket_title}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{ticket.ticket_status}</Badge>
                            <a
                              href={ticket.ticket_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:text-blue-800 mt-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No development tickets linked</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slack Channels */}
            <Card>
              <CardHeader>
                <CardTitle>Communication Channels</CardTitle>
              </CardHeader>
              <CardContent>
                {prd.slack_channels && prd.slack_channels.length > 0 ? (
                  <div className="space-y-3">
                    {prd.slack_channels.map((channel) => (
                      <div key={channel.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">#{channel.channel_name}</h4>
                            <p className="text-sm text-gray-600">{channel.channel_purpose}</p>
                          </div>
                          {channel.channel_url && (
                            <a
                              href={channel.channel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No communication channels linked</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-6">
          <div className="text-center py-8">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Comments integration coming soon</h3>
            <p className="text-gray-500">Feature-level comments and discussions will appear here</p>
            <Button asChild variant="outline" className="mt-4">
              <a href={`/features/${prd.id}`} target="_blank">
                View in Feature Detail Page
              </a>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}