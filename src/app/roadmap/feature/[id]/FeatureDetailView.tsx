'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  ExternalLink,
  FileText,
  Palette,
  MessageSquare,
  Plus,
  Share2,
  Sparkles,
  Home,
  Clock,
  Users,
  Edit,
  Save,
  X,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SlackChannelsTab from '@/components/roadmap/SlackChannelsTab'
import JiraTicketsTab from '@/components/roadmap/JiraTicketsTab'

interface FeatureDetailProps {
  featureId: number
  currentUserEmail: string
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
    weeks_to_ship?: number
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
  }
  customer_feedback?: Array<{
    id: number
    customer_name: string
    feedback_text: string
    feedback_type: string
    created_at: string
  }>
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
}

interface CustomerFeedback {
  id?: number
  customer_name: string
  feedback_text: string
  feedback_type: 'request' | 'complaint' | 'compliment' | 'suggestion'
}

const statusColors = {
  planned: 'bg-blue-50 text-blue-800 border-blue-200',
  in_progress: 'bg-poppy/10 text-poppy border-poppy/30',
  in_review: 'bg-purple-50 text-purple-800 border-purple-200',
  shipped: 'bg-sprout/10 text-sprout border-sprout/30',
  on_hold: 'bg-gray-50 text-gray-800 border-gray-200'
}

const feedbackTypeColors = {
  request: 'bg-poppy/5 border-poppy/20',
  complaint: 'bg-red-50 border-red-200',
  compliment: 'bg-sprout/10 border-sprout/30',
  suggestion: 'bg-blue-50 border-blue-200'
}

export default function FeatureDetailView({ featureId, currentUserEmail }: FeatureDetailProps) {
  const [feature, setFeature] = useState<FeatureDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddFeedback, setShowAddFeedback] = useState(false)
  const [creatingDesign, setCreatingDesign] = useState(false)
  const [editingWeeks, setEditingWeeks] = useState(false)
  const [weeksValue, setWeeksValue] = useState('')
  const [newFeedback, setNewFeedback] = useState<CustomerFeedback>({
    customer_name: '',
    feedback_text: '',
    feedback_type: 'request'
  })

  useEffect(() => {
    fetchFeatureDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId])

  useEffect(() => {
    if (feature?.roadmap?.weeks_to_ship) {
      setWeeksValue(feature.roadmap.weeks_to_ship.toString())
    }
  }, [feature?.roadmap?.weeks_to_ship])

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

  const handleAddFeedback = async () => {
    if (!newFeedback.customer_name.trim() || !newFeedback.feedback_text.trim()) return

    try {
      const response = await fetch(`/api/roadmap/prd/${featureId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback)
      })

      if (response.ok) {
        await fetchFeatureDetail() // Refresh data
        setNewFeedback({ customer_name: '', feedback_text: '', feedback_type: 'request' })
        setShowAddFeedback(false)
      }
    } catch (error) {
      console.error('Error adding feedback:', error)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
  }

  const handleCreateDesign = async () => {
    setCreatingDesign(true)
    try {
      // First get the PRD content
      const prdResponse = await fetch(feature!['drive-link'])
      if (!prdResponse.ok) throw new Error('Could not fetch PRD content')
      
      const prdText = await prdResponse.text()
      
      // Generate design prompt
      const designResponse = await fetch('/api/generate-design-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdText })
      })
      
      if (!designResponse.ok) throw new Error('Failed to generate design prompt')
      
      const designData = await designResponse.json()
      
      // Create v0 chat with the design prompt
      const v0Response = await fetch('/api/create-v0-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: designData.designPrompt,
          apiKey: localStorage.getItem('v0-api-key')
        })
      })
      
      const v0Data = await v0Response.json()
      
      if (!v0Data.success) {
        // Handle specific error types
        if (v0Data.timeout) {
          throw new Error('Design generation timed out. This can happen with complex designs. Please try again with a simpler approach.')
        } else if (v0Data.invalidApiKey) {
          throw new Error('Invalid V0 API key. Please check your API key in Settings.')
        } else {
          throw new Error(v0Data.error || 'Failed to create design')
        }
      }
      
      // Open the design in a new tab
      window.open(v0Data.chat.demo, '_blank')
      
    } catch (error) {
      console.error('Error creating design:', error)
      
      // Show more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Failed to create design'
      
      if (errorMessage.includes('timed out')) {
        alert('⏱️ Design creation timed out\n\nThis can happen with complex designs. Try:\n• Simplifying your PRD\n• Breaking down the feature into smaller parts\n• Trying again in a few minutes')
      } else if (errorMessage.includes('API key')) {
        alert('🔑 Invalid V0 API Key\n\nPlease check your V0 API key in Settings and try again.')
      } else {
        alert(`❌ Failed to create design\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`)
      }
    } finally {
      setCreatingDesign(false)
    }
  }

  // Helper to get weeks - prioritize direct weeks over story points
  const getWeeksToShip = () => {
    if (feature?.roadmap?.weeks_to_ship) return feature.roadmap.weeks_to_ship
    if (feature?.roadmap?.estimated_effort_points) {
      return Math.ceil(feature.roadmap.estimated_effort_points * 0.5)
    }
    return null
  }

  const handleUpdateWeeks = async () => {
    const weeks = parseInt(weeksValue)
    if (isNaN(weeks) || weeks < 0) return
    
    try {
      const response = await fetch(`/api/roadmap/prd/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks_to_ship: weeks })
      })
      
      if (response.ok) {
        await fetchFeatureDetail()
        setEditingWeeks(false)
      }
    } catch (error) {
      console.error('Error updating weeks:', error)
    }
  }

  const handleCancelEdit = () => {
    setWeeksValue(feature?.roadmap?.weeks_to_ship?.toString() || '')
    setEditingWeeks(false)
  }

  // Check if current user can edit this feature
  const canEdit = feature?.user === currentUserEmail

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral/80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
      </div>
    )
  }

  if (!feature) {
    return (
      <div className="min-h-screen bg-neutral/80 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Feature not found</h1>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" className="border-gray-300 hover:border-poppy/30">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button className="bg-poppy hover:bg-poppy/90 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Roadmap
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral/80">
      {/* Navigation Icons */}
      <div className="absolute top-6 right-8 flex flex-col gap-4 z-10">
        <Link href="/" className="text-poppy hover:text-poppy/80 transition-colors" aria-label="Go to homepage">
          <Home className="w-7 h-7" />
        </Link>
        <Button onClick={handleShare} variant="ghost" size="sm" className="text-poppy hover:text-poppy/80 hover:bg-poppy/10 transition-colors p-1">
          <Share2 className="w-7 h-7" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/roadmap">
            <Button variant="ghost" size="sm" className="text-primary/60 hover:text-poppy hover:bg-poppy/10 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Roadmap
            </Button>
          </Link>
        </div>
        
        {/* Feature Title & Basic Info */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-poppy mb-4 tracking-tight">
            {feature.title || `Feature #${feature.id}`}
          </h1>
          
          <div className="flex items-center gap-3 mb-4">
            <Badge className={statusColors[feature.roadmap?.status as keyof typeof statusColors] || statusColors.planned}>
              {feature.roadmap?.status || 'Planned'}
            </Badge>
            
            {canEdit && editingWeeks ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={weeksValue}
                  onChange={(e) => setWeeksValue(e.target.value)}
                  className="w-20 h-8 text-sm"
                  placeholder="0"
                  min="0"
                />
                <Button size="sm" onClick={handleUpdateWeeks} className="h-8 px-2">
                  <Save className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 px-2">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`border-poppy/30 text-poppy bg-poppy/5 ${canEdit ? 'cursor-pointer' : ''}`} 
                  onClick={canEdit ? () => setEditingWeeks(true) : undefined}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {getWeeksToShip() || 'Set'} weeks to ship
                </Badge>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingWeeks(true)} className="h-6 w-6 p-0">
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-primary/60">
              <Users className="w-4 h-4" />
              <span>Owned by {feature.user.split('@')[0]}</span>
              {canEdit && (
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                  You can edit
                </Badge>
              )}
            </div>
          </div>
          
          {feature.description && (
            <p className="text-xl text-primary/80 leading-relaxed font-medium">
              {feature.description}
            </p>
          )}
        </div>

        {/* PM Management Tabs */}
        <Tabs defaultValue="resources" className="w-full">
          <TabsList className={`grid w-full ${canEdit ? 'grid-cols-4' : 'grid-cols-2'} mb-6`}>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Resources
            </TabsTrigger>
            {canEdit && (
              <TabsTrigger value="slack" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Slack
              </TabsTrigger>
            )}
            {canEdit && (
              <TabsTrigger value="jira" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Jira
              </TabsTrigger>
            )}
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources">
            <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-primary">
                  <div className="p-2 bg-poppy/10 rounded-lg border border-poppy/20">
                    <FileText className="w-5 h-5 text-poppy" />
                  </div>
                  PRD & Design Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PRD Link */}
                <a
                  href={feature['drive-link']}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-poppy/30 transition-all group bg-white/70 backdrop-blur-sm"
                >
                  <div className="p-2 bg-blue-50 rounded-lg mr-3 border border-blue-200">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary group-hover:text-poppy transition-colors">
                      View PRD Document
                    </h3>
                    <p className="text-sm text-gray-600">
                      Full requirements and specifications - share with engineering
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-poppy transition-colors" />
                </a>

                {/* Design Access or Creation */}
                {feature['v0-link'] ? (
                  <a
                    href={feature['v0-link']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-sprout/30 transition-all group bg-white/70 backdrop-blur-sm"
                  >
                    <div className="p-2 bg-sprout/10 rounded-lg mr-3 border border-sprout/30">
                      <Palette className="w-6 h-6 text-sprout" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary group-hover:text-sprout transition-colors">
                        View Design Mockups
                      </h3>
                      <p className="text-sm text-gray-600">
                        Interactive prototypes - share with designers and engineering
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-sprout transition-colors" />
                  </a>
                ) : (
                  <button
                    onClick={handleCreateDesign}
                    disabled={creatingDesign}
                    className="w-full flex items-center p-4 border border-poppy/30 rounded-xl hover:shadow-md hover:bg-poppy/5 transition-all group bg-poppy/5 disabled:opacity-50"
                  >
                    {creatingDesign ? (
                      <div className="w-8 h-8 mr-3 animate-spin rounded-full border-2 border-poppy border-t-transparent" />
                    ) : (
                      <div className="p-2 bg-poppy/10 rounded-lg mr-3 border border-poppy/30">
                        <Sparkles className="w-6 h-6 text-poppy" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-primary group-hover:text-poppy transition-colors">
                        {creatingDesign ? 'Creating Design...' : 'Create Design Mockups'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {creatingDesign ? 'Generating designs from PRD' : 'AI-generated designs from your PRD'}
                      </p>
                    </div>
                  </button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canEdit && (
            <TabsContent value="slack">
              <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
                <CardContent className="pt-6">
                  <SlackChannelsTab 
                    prd={feature} 
                    userEmail={feature.user} 
                    onUpdate={fetchFeatureDetail}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canEdit && (
            <TabsContent value="jira">
              <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
                <CardContent className="pt-6">
                  <JiraTicketsTab 
                    prd={feature} 
                    userEmail={feature.user} 
                    onUpdate={fetchFeatureDetail}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="feedback">
            <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-primary">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    Customer Feedback
                  </CardTitle>
                  {canEdit && (
                    <Button 
                      onClick={() => setShowAddFeedback(true)} 
                      size="sm"
                      className="bg-poppy hover:bg-poppy/90 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showAddFeedback && (
                  <div className="mb-6 p-4 border border-poppy/20 rounded-xl bg-poppy/5">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customer_name" className="text-primary font-medium">Customer Name</Label>
                        <Input
                          id="customer_name"
                          value={newFeedback.customer_name}
                          onChange={(e) => setNewFeedback({...newFeedback, customer_name: e.target.value})}
                          placeholder="Customer or company name"
                          className="focus-poppy"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="feedback_type" className="text-primary font-medium">Feedback Type</Label>
                        <select
                          id="feedback_type"
                          value={newFeedback.feedback_type}
                          onChange={(e) => setNewFeedback({...newFeedback, feedback_type: e.target.value as CustomerFeedback['feedback_type']})}
                          className="w-full p-2 border border-gray-300 rounded-md focus-poppy"
                        >
                          <option value="request">Feature Request</option>
                          <option value="complaint">Complaint</option>
                          <option value="compliment">Compliment</option>
                          <option value="suggestion">Suggestion</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="feedback_text" className="text-primary font-medium">Feedback</Label>
                        <Textarea
                          id="feedback_text"
                          value={newFeedback.feedback_text}
                          onChange={(e) => setNewFeedback({...newFeedback, feedback_text: e.target.value})}
                          placeholder="What did the customer say?"
                          rows={3}
                          className="focus-poppy"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={handleAddFeedback} size="sm" className="bg-poppy hover:bg-poppy/90 text-white">
                          Add Feedback
                        </Button>
                        <Button 
                          onClick={() => setShowAddFeedback(false)} 
                          variant="outline" 
                          size="sm"
                          className="border-gray-300 hover:border-poppy/30"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {feature.customer_feedback && feature.customer_feedback.length > 0 ? (
                    feature.customer_feedback.map((feedback) => (
                      <div 
                        key={feedback.id} 
                        className={`p-3 rounded-lg border ${feedbackTypeColors[feedback.feedback_type as keyof typeof feedbackTypeColors]} backdrop-blur-sm`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-primary text-sm">{feedback.customer_name}</h4>
                            <Badge variant="outline" className="text-xs border-gray-300">
                              {feedback.feedback_type}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-primary/80 text-sm">{feedback.feedback_text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="p-3 bg-gray-50 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center border border-gray-200">
                        <MessageSquare className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">No customer feedback yet</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add" to record customer input</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 