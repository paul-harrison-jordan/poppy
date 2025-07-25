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
  CheckCircle2,
  Circle,
  Search,
  Mail
} from 'lucide-react'
import Link from 'next/link'
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
  total_estimated_weeks?: number
  roadmap?: {
    priority_order?: number
    status?: string
    target_quarter?: string
    estimated_effort_points?: number
    weeks_to_ship?: number
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
    milestone_running_locally?: boolean
    milestone_feature_flag?: boolean
    milestone_ga?: boolean
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

interface CustomerMatch {
  gmv: string
  klaviyo_account_id: string
  nps_score_raw: string
  nps_verbatim: string
  survey_end_date: string
  match_score: number
  row_number: number
  email?: string
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
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([])
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null)
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

  const handleSearchCustomers = async () => {
    if (!feature) return
    
    setSearchingCustomers(true)
    try {
      const response = await fetch(`/api/roadmap/prd/${featureId}/match-customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Customer search completed:', result)
        
        // Add the matches to the customer matches state
        if (result.matches && result.matches.length > 0) {
          setCustomerMatches(result.matches)
        } else {
          setCustomerMatches([])
          alert('No relevant customer feedback found for this PRD.')
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to search customers:', errorData)
        alert('Failed to search for customers. Please try again.')
      }
    } catch (error) {
      console.error('Error searching customers:', error)
      alert('An error occurred while searching for customers.')
    } finally {
      setSearchingCustomers(false)
    }
  }

  const handleGetEmail = async (customerMatch: CustomerMatch, index: number) => {
    setLoadingEmail(customerMatch.klaviyo_account_id)
    try {
      // Get Google Sheets ID from localStorage
      const CUSTOMER_SHEET_ID = localStorage.getItem('customer_sheet_id')
      
      if (!CUSTOMER_SHEET_ID) {
        alert('Please configure your Google Sheets ID in Settings first. Go to Instructions/Settings page and add your customer sheet ID.')
        return
      }

      console.log('Customer match data:', customerMatch)
      console.log('Row number:', customerMatch.row_number)
      
      // Use row_number if available, otherwise fallback to index + 2 (assuming header row)
      const rowNumber = customerMatch.row_number && customerMatch.row_number > 0 
        ? customerMatch.row_number 
        : index + 2;
      
      const response = await fetch('/api/get-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: CUSTOMER_SHEET_ID,
          rowNumber: rowNumber
        })
      })

      if (response.ok) {
        const { email } = await response.json()
        
        // Update the customer match with email
        setCustomerMatches(prev => 
          prev.map((match, i) => 
            i === index ? { ...match, email } : match
          )
        )
        
        // Generate and open email draft
        await generateEmail(customerMatch, email)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch email:', errorData)
        alert('Failed to fetch customer email. Please check your Google Sheets configuration.')
      }
    } catch (error) {
      console.error('Error fetching email:', error)
      alert('An error occurred while fetching customer email.')
    } finally {
      setLoadingEmail(null)
    }
  }

  const generateEmail = async (customerMatch: CustomerMatch, email: string) => {
    try {
      const emailSubject = `Following up on your feedback about ${feature?.title}`
      const emailBody = `Hi there,

I hope this email finds you well! I'm reaching out because I noticed you provided some valuable feedback in our recent survey (NPS: ${customerMatch.nps_score_raw}).

You mentioned: "${customerMatch.nps_verbatim}"

I wanted to let you know that we're actively working on improvements in this area with a new feature called "${feature?.title}". Your feedback has been incredibly helpful in shaping our product roadmap.

I'd love to:
1. Share more details about what we're building
2. Get your thoughts on our approach
3. Potentially include you in our beta testing when it's ready

Would you be interested in a brief 15-minute call to discuss this further? I'm happy to work around your schedule.

Thanks for being such a valuable customer and for taking the time to share your feedback with us.

Best regards,
[Your Name]

P.S. If you have any other thoughts or suggestions, I'm always happy to hear them!`

      // Create Gmail compose URL
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      
      // Open Gmail in new tab
      window.open(gmailUrl, '_blank')
      
    } catch (error) {
      console.error('Error generating email:', error)
      alert('An error occurred while generating the email.')
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

  // Helper to get weeks - prioritize engineer assignments as source of truth
  const getWeeksToShip = () => {
    // Prioritize total estimated weeks from engineer assignments
    if (feature?.total_estimated_weeks && feature.total_estimated_weeks > 0) {
      return feature.total_estimated_weeks
    }
    // Fall back to manual weeks estimation
    if (feature?.roadmap?.weeks_to_ship) return feature.roadmap.weeks_to_ship
    // Legacy: story points conversion (deprecated)
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

  const handleMilestoneToggle = async (milestone: 'running_locally' | 'feature_flag' | 'ga', checked: boolean) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${featureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`milestone_${milestone}`]: checked })
      })
      
      if (response.ok) {
        await fetchFeatureDetail()
        
        // Auto-update status based on milestones
        if (checked) {
          let newStatus = 'in_progress'
          if (milestone === 'ga') {
            newStatus = 'shipped'
          } else if (milestone === 'feature_flag') {
            newStatus = 'in_review'
          }
          
          // Update status if different
          if (feature?.roadmap?.status !== newStatus) {
            await fetch(`/api/roadmap/prd/${featureId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            })
            await fetchFeatureDetail()
          }
        }
      }
    } catch (error) {
      console.error('Error updating milestone:', error)
    }
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
      {/* Enhanced Poppy Navigation Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Poppy Logo & Breadcrumb */}
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="text-2xl">🌺</div>
                <h1 className="text-xl font-bold text-gray-800">Poppy</h1>
              </Link>
              
              <div className="flex items-center gap-2 text-gray-500">
                <span>/</span>
                <Link href="/roadmap" className="text-poppy hover:text-poppy/80 transition-colors font-medium">
                  Roadmap
                </Link>
                <span>/</span>
                <span className="text-gray-700 font-medium">Feature Details</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              
              <Link href="/roadmap">
                <button className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Roadmap</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
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
                <button 
                  onClick={handleUpdateWeeks}
                  className="h-8 px-2 rounded-lg bg-poppy/10 text-poppy border border-poppy/20 hover:bg-poppy/20 transition-all"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="h-8 px-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
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
                  <button 
                    onClick={() => setEditingWeeks(true)}
                    className="h-6 w-6 p-0 rounded hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="w-3 h-3 text-gray-500" />
                  </button>
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

        {/* Development Milestones - Only for editors */}
        {canEdit && (
          <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl text-primary">
                <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                Development Milestones
              </CardTitle>
              <p className="text-gray-600 text-sm">Track progress and automatically update feature status</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleMilestoneToggle('running_locally', !feature?.roadmap?.milestone_running_locally)}
                >
                  {feature?.roadmap?.milestone_running_locally ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-primary">Running Locally</h3>
                    <p className="text-sm text-gray-600">Feature works in dev environment</p>
                  </div>
                </div>

                <div 
                  className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleMilestoneToggle('feature_flag', !feature?.roadmap?.milestone_feature_flag)}
                >
                  {feature?.roadmap?.milestone_feature_flag ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-primary">Behind Feature Flag</h3>
                    <p className="text-sm text-gray-600">Ready for limited testing</p>
                  </div>
                </div>

                <div 
                  className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleMilestoneToggle('ga', !feature?.roadmap?.milestone_ga)}
                >
                  {feature?.roadmap?.milestone_ga ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-primary">Generally Available</h3>
                    <p className="text-sm text-gray-600">Shipped to all users</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Single Page Layout - No Tabs */}
        <div className="space-y-8">{/* Removed tabs wrapper */}

          {/* PRD & Design Resources Section */}
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

          {/* Slack Channels Section - Only for owners */}
          {canEdit && (
            <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <CardContent className="pt-6">
                <SlackChannelsTab 
                  prd={feature} 
                  userEmail={feature.user} 
                  onUpdate={fetchFeatureDetail}
                />
              </CardContent>
            </Card>
          )}

          {/* Jira Tickets Section - Only for owners */}
          {canEdit && (
            <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <CardContent className="pt-6">
                <JiraTicketsTab 
                  prd={feature} 
                  userEmail={feature.user} 
                  onUpdate={fetchFeatureDetail}
                />
              </CardContent>
            </Card>
          )}

          {/* Customer Feedback Section */}
          <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
            <CardHeader className="pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-primary">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    Customer Feedback
                  </CardTitle>
                  <div className="flex gap-2">
                  <button
                    onClick={handleSearchCustomers}
                    disabled={searchingCustomers}
                    className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 bg-blue-50 text-blue-600 font-medium border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className={`w-4 h-4 ${searchingCustomers ? 'animate-spin' : ''}`} />
                    <span>{searchingCustomers ? 'Searching...' : 'Find Customers'}</span>
                  </button>
                  <button
                    onClick={() => setShowAddFeedback(true)}
                    className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Feedback</span>
                  </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  AI can suggest customers with relevant feedback history for this feature
                </p>
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
                  {/* AI-matched customer feedback */}
                  {customerMatches.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 bg-blue-50 rounded border border-blue-200">
                          <Search className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-primary">AI-Matched Customer Feedback ({customerMatches.length})</h3>
                      </div>
                      {customerMatches.map((match, index) => (
                        <div 
                          key={`match-${index}`}
                          className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 backdrop-blur-sm"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div>
                                <h4 className="font-semibold text-primary text-sm">
                                  Customer {match.klaviyo_account_id}
                                  {match.email && (
                                    <span className="ml-2 text-xs text-gray-600">({match.email})</span>
                                  )}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs border-gray-300 bg-white">
                                    NPS: {match.nps_score_raw}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs border-green-300 bg-green-50 text-green-700">
                                    {match.gmv}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-700">
                                    Match: {Math.round(match.match_score * 100)}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleGetEmail(match, index)}
                                disabled={loadingEmail === match.klaviyo_account_id}
                                className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 bg-poppy/10 text-poppy border border-poppy/20 hover:bg-poppy/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingEmail === match.klaviyo_account_id ? (
                                  <>
                                    <div className="w-3 h-3 animate-spin rounded-full border border-poppy border-t-transparent" />
                                    <span>Loading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-3 h-3" />
                                    <span>{match.email ? 'Email' : 'Get Email'}</span>
                                  </>
                                )}
                              </button>
                              <span className="text-xs text-gray-500">
                                {new Date(match.survey_end_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-primary/80 text-sm leading-relaxed">{match.nps_verbatim}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual customer feedback */}
                  {feature.customer_feedback && feature.customer_feedback.length > 0 && (
                    <div className="space-y-3">
                      {customerMatches.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-gray-50 rounded border border-gray-200">
                            <MessageSquare className="w-4 h-4 text-gray-600" />
                          </div>
                          <h3 className="font-semibold text-primary">Manual Customer Feedback</h3>
                        </div>
                      )}
                      {feature.customer_feedback.map((feedback) => (
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
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {(!feature.customer_feedback || feature.customer_feedback.length === 0) && customerMatches.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="p-3 bg-gray-50 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center border border-gray-200">
                        <MessageSquare className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">No customer feedback yet</p>
                      <p className="text-xs text-gray-400 mt-1">Click &quot;Find Customers&quot; to search for relevant customers or &quot;Add Feedback&quot; to record manual input</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          {/* Team Comments Section */}
          <Card className="bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl text-primary">
                  <div className="p-2 bg-poppy/10 rounded-lg border border-poppy/20">
                    <MessageSquare className="w-5 h-5 text-poppy" />
                  </div>
                  Team Comments
                </CardTitle>
                <button
                  className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Comment</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Comment Input */}
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <Textarea
                    placeholder="Add a comment for your team..."
                    rows={3}
                    className="border-gray-300 bg-white focus:ring-2 focus:ring-poppy focus:border-poppy"
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Comments are visible to your team members</span>
                    <button className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20">
                      Post Comment
                    </button>
                  </div>
                </div>
                
                {/* Sample Comments */}
                <div className="space-y-3">
                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-poppy/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-poppy">JD</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-800">John Doe</span>
                          <span className="text-xs text-gray-500">2 hours ago</span>
                        </div>
                        <p className="text-sm text-gray-700">Engineering estimates 2 weeks for this feature. The backend API changes are minimal.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-sprout/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-sprout">SM</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-800">Sarah Miller</span>
                          <span className="text-xs text-gray-500">Yesterday</span>
                        </div>
                        <p className="text-sm text-gray-700">Design mockups look great! This aligns well with our Q2 user experience goals.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center py-6 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Start the conversation by adding the first comment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div> {/* End of single page layout */}
      </div>
    </div>
  )
} 