'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, ExternalLink, Calendar, Users, MessageSquare, Link } from 'lucide-react'
import PRDOverviewTab from './PRDOverviewTab'
import SlackChannelsTab from './SlackChannelsTab'
import JiraTicketsTab from './JiraTicketsTab'
import CustomerFeedbackTab from './CustomerFeedbackTab'
import StakeholderSignoffsTab from './StakeholderSignoffsTab'

interface PRDDetailViewProps {
  prdId: number
  userEmail: string
  onBack: () => void
}

interface PRDDetail {
  id: number
  'drive-link': string
  'v0-link'?: string
  user: string
  shipped: boolean
  created_at: string
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
    is_public: boolean
  }>
  stakeholder_signoffs?: Array<{
    id: number
    stakeholder_email: string
    stakeholder_name: string
    stakeholder_role?: string
    signoff_type: string
    status: string
    signoff_notes?: string
    due_date?: string
    requested_by: string
  }>
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800', 
  in_review: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  on_hold: 'bg-gray-100 text-gray-800'
}

export default function PRDDetailView({ prdId, userEmail, onBack }: PRDDetailViewProps) {
  const [prd, setPRD] = useState<PRDDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchPRDDetail()
  }, [prdId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const extractPRDTitle = (driveLink: string) => {
    try {
      const url = new URL(driveLink)
      const docName = url.searchParams.get('docName') || url.pathname.split('/').pop()
      return docName || 'Untitled PRD'
    } catch {
      return 'Untitled PRD'
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">Loading PRD details...</div>
  }

  if (!prd) {
    return <div className="text-center py-8 text-red-600">PRD not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Roadmap
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl mb-2">
                {extractPRDTitle(prd['drive-link'])}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className={statusColors[prd.roadmap?.status as keyof typeof statusColors] || statusColors.planned}>
                  {prd.roadmap?.status || 'planned'}
                </Badge>
                {prd.roadmap?.target_quarter && (
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {prd.roadmap.target_quarter}
                  </Badge>
                )}
                {prd.roadmap?.estimated_effort_points && (
                  <Badge variant="outline">
                    {prd.roadmap.estimated_effort_points} pts
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={prd['drive-link']} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">View PRD</span>
                  <span className="sm:hidden">PRD</span>
                </a>
              </Button>
              {prd['v0-link'] && (
                <Button variant="outline" size="sm" asChild>
                  <a href={prd['v0-link']} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">View Design</span>
                    <span className="sm:hidden">Design</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="slack" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">Slack</span>
            {prd.slack_channels && prd.slack_channels.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {prd.slack_channels.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jira" className="flex items-center gap-1 text-xs sm:text-sm">
            <Link className="w-3 h-3" />
            <span className="hidden sm:inline">Jira</span>
            {prd.jira_tickets && prd.jira_tickets.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {prd.jira_tickets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">Feedback</span>
            {prd.customer_feedback && prd.customer_feedback.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {prd.customer_feedback.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signoffs" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="w-3 h-3" />
            <span className="hidden sm:inline">Sign-offs</span>
            {prd.stakeholder_signoffs && prd.stakeholder_signoffs.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {prd.stakeholder_signoffs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <PRDOverviewTab prd={prd} userEmail={userEmail} onUpdate={fetchPRDDetail} />
        </TabsContent>
        
        <TabsContent value="slack" className="mt-6">
          <SlackChannelsTab prd={prd} userEmail={userEmail} onUpdate={fetchPRDDetail} />
        </TabsContent>
        
        <TabsContent value="jira" className="mt-6">
          <JiraTicketsTab prd={prd} userEmail={userEmail} onUpdate={fetchPRDDetail} />
        </TabsContent>
        
        <TabsContent value="feedback" className="mt-6">
          <CustomerFeedbackTab prd={prd} userEmail={userEmail} onUpdate={fetchPRDDetail} />
        </TabsContent>
        
        <TabsContent value="signoffs" className="mt-6">
          <StakeholderSignoffsTab prd={prd} userEmail={userEmail} onUpdate={fetchPRDDetail} />
        </TabsContent>
      </Tabs>
    </div>
  )
}