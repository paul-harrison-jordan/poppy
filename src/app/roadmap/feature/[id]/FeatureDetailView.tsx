'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

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

  Search,
  Mail
} from 'lucide-react'
import Link from 'next/link'
import SlackChannelsTab from '@/components/roadmap/SlackChannelsTab'
import JiraTicketsTab from '@/components/roadmap/JiraTicketsTab'
import EngineerAssignmentModal from '@/components/roadmap/EngineerAssignmentModal'
import { usePRDDetail, getWeeksToShip } from '@/hooks/useRoadmapData'

interface FeatureDetailProps {
  featureId: number
  currentUserEmail: string
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

  // Use shared hook for fetching PRD detail
  const { prd: feature, loading, refetch: fetchFeatureDetail } = usePRDDetail(featureId)

  useEffect(() => {
    if (feature?.roadmap?.weeks_to_ship) {
      setWeeksValue(feature.roadmap.weeks_to_ship.toString())
    }
  }, [feature?.roadmap?.weeks_to_ship])

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
      {/* Compact Navigation Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="text-xl">🌺</div>
                <h1 className="text-lg font-bold text-gray-800">Poppy</h1>
              </Link>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>/</span>
                <Link href="/roadmap" className="text-poppy hover:text-poppy/80 transition-colors font-medium">
                  Roadmap
                </Link>
                <span>/</span>
                <span className="text-gray-700 font-medium">Feature</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 text-gray-700 hover:bg-gray-50 hover:text-poppy"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <Link href="/roadmap">
                <button className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        
        {/* Compact Feature Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-4">
              <h1 className="text-2xl font-bold text-poppy mb-2 tracking-tight">
                {feature.title || `Feature #${feature.id}`}
              </h1>
              {feature.description && (
                <p className="text-sm text-primary/80 leading-relaxed line-clamp-2">
                  {feature.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={statusColors[feature.roadmap?.status as keyof typeof statusColors] || statusColors.planned}>
                {feature.roadmap?.status || 'Planned'}
              </Badge>
              
              {canEdit && editingWeeks ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={weeksValue}
                    onChange={(e) => setWeeksValue(e.target.value)}
                    className="w-16 h-7 text-xs"
                    placeholder="0"
                    min="0"
                  />
                  <button 
                    onClick={handleUpdateWeeks}
                    className="h-7 px-2 rounded bg-poppy/10 text-poppy border border-poppy/20 hover:bg-poppy/20"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="h-7 px-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs border-poppy/30 text-poppy bg-poppy/5 ${canEdit ? 'cursor-pointer' : ''}`} 
                    onClick={canEdit ? () => setEditingWeeks(true) : undefined}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {feature ? getWeeksToShip(feature) || 'Set' : 'Set'}w
                  </Badge>
                  {canEdit && (
                    <button 
                      onClick={() => setEditingWeeks(true)}
                      className="h-6 w-6 p-0 rounded hover:bg-gray-100"
                    >
                      <Edit className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-primary/60">
            <Users className="w-3 h-3" />
            <span>Owned by {feature.user.split('@')[0]}</span>
            {canEdit && (
              <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                You can edit
              </Badge>
            )}
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Development Status - Compact for editors */}
            {canEdit && (
              <Card className="p-4 bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Development Status
                  </h3>
                </div>
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      feature?.roadmap?.status === 'shipped' ? 'bg-green-500' :
                      feature?.roadmap?.status === 'in_progress' ? 'bg-blue-500' :
                      feature?.roadmap?.status === 'in_review' ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium text-primary capitalize">
                      {feature?.roadmap?.status?.replace('_', ' ') || 'Planned'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {feature?.roadmap?.status === 'shipped' ? 'Feature is live for all users' :
                     feature?.roadmap?.status === 'in_review' ? 'Feature is being tested' :
                     feature?.roadmap?.status === 'in_progress' ? 'Development in progress' :
                     'Planning phase'}
                  </p>
                </div>
              </Card>
            )}

            {/* PRD & Design Resources - Compact */}
            <Card className="p-4 bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Resources
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <a
                  href={feature['drive-link']}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all group bg-white/70"
                >
                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-primary group-hover:text-blue-600">PRD Document</h4>
                    <p className="text-xs text-gray-600 truncate">Requirements and specifications</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </a>

                {feature['v0-link'] ? (
                  <a
                    href={feature['v0-link']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md hover:border-green-300 transition-all group bg-white/70"
                  >
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <Palette className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-primary group-hover:text-green-600">Design Mockups</h4>
                      <p className="text-xs text-gray-600 truncate">Interactive prototypes</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                  </a>
                ) : (
                  <button
                    onClick={handleCreateDesign}
                    disabled={creatingDesign}
                    className="flex items-center gap-3 p-3 border border-poppy/30 rounded-lg hover:shadow-md hover:bg-poppy/5 transition-all group bg-poppy/5 disabled:opacity-50"
                  >
                    {creatingDesign ? (
                      <div className="w-6 h-6 animate-spin rounded-full border-2 border-poppy border-t-transparent" />
                    ) : (
                      <div className="p-2 bg-poppy/10 rounded border border-poppy/30">
                        <Sparkles className="w-4 h-4 text-poppy" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-medium text-sm text-primary group-hover:text-poppy">
                        {creatingDesign ? 'Creating...' : 'Create Design'}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">
                        {creatingDesign ? 'Generating designs' : 'AI-generated from PRD'}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </Card>

            {/* Engineering Management - Only for owners */}
            {canEdit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Engineer Assignment */}
                <Card className="p-4 bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      Engineering Team
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <EngineerAssignmentModal
                      prdId={feature.id}
                      prdTitle={feature.title || `Feature #${feature.id}`}
                      onAssignmentsChange={fetchFeatureDetail}
                      trigger={
                        <button className="w-full flex items-center gap-2 p-3 border border-green-200 rounded-lg hover:shadow-md hover:bg-green-50 transition-all bg-green-50/50">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Manage Engineers</span>
                        </button>
                      }
                    />
                    
                    {/* Weeks Estimation */}
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Estimated Duration</span>
                        {editingWeeks ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={weeksValue}
                              onChange={(e) => setWeeksValue(e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-poppy rounded focus:outline-none focus:ring-1 focus:ring-poppy"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-600">weeks</span>
                            <button
                              onClick={handleUpdateWeeks}
                              className="p-1 text-green-600 hover:text-green-800"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingWeeks(true)}
                            className="flex items-center gap-1 text-sm text-poppy hover:text-poppy/80"
                          >
                            <Clock className="w-4 h-4" />
                            <span>{feature ? getWeeksToShip(feature) || 'Set' : 'Set'} weeks</span>
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Engineering Tools */}
                <Card className="p-4 bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Tools & Communication
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {/* Slack Channels */}
                    <div className="max-h-24 overflow-y-auto">
                      <SlackChannelsTab 
                        prd={feature} 
                        userEmail={feature.user} 
                        onUpdate={fetchFeatureDetail}
                      />
                    </div>
                    
                    {/* Jira Tickets */}
                    <div className="max-h-24 overflow-y-auto">
                      <JiraTicketsTab 
                        prd={feature} 
                        userEmail={feature.user} 
                        onUpdate={fetchFeatureDetail}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Feedback & Comments */}
          <div className="space-y-6">
            
            {/* Customer Feedback Section - Compact */}
            <Card className="p-4 bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Customer Feedback
                </h3>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleSearchCustomers}
                    disabled={searchingCustomers}
                    className="flex-1 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-blue-50 text-blue-600 font-medium border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Search className={`w-3 h-3 ${searchingCustomers ? 'animate-spin' : ''}`} />
                    <span>{searchingCustomers ? 'Searching...' : 'Find'}</span>
                  </button>
                  <button
                    onClick={() => setShowAddFeedback(true)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {showAddFeedback && (
                <div className="mb-4 p-3 border border-poppy/20 rounded-lg bg-poppy/5">
                  <div className="space-y-3">
                    <div>
                      <Input
                        value={newFeedback.customer_name}
                        onChange={(e) => setNewFeedback({...newFeedback, customer_name: e.target.value})}
                        placeholder="Customer name"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <select
                        value={newFeedback.feedback_type}
                        onChange={(e) => setNewFeedback({...newFeedback, feedback_type: e.target.value as CustomerFeedback['feedback_type']})}
                        className="w-full p-2 border border-gray-300 rounded text-xs"
                      >
                        <option value="request">Request</option>
                        <option value="complaint">Complaint</option>
                        <option value="compliment">Compliment</option>
                        <option value="suggestion">Suggestion</option>
                      </select>
                    </div>
                    <div>
                      <Textarea
                        value={newFeedback.feedback_text}
                        onChange={(e) => setNewFeedback({...newFeedback, feedback_text: e.target.value})}
                        placeholder="What did the customer say?"
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddFeedback} size="sm" className="bg-poppy hover:bg-poppy/90 text-white text-xs">
                        Add
                      </Button>
                      <Button 
                        onClick={() => setShowAddFeedback(false)} 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {/* AI-matched customer feedback */}
                {customerMatches.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Search className="w-3 h-3 text-blue-600" />
                      AI Matches ({customerMatches.length})
                    </h4>
                    {customerMatches.map((match, index) => (
                      <div key={`match-${index}`} className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-primary truncate">
                                Customer {match.klaviyo_account_id}
                              </span>
                              <Badge variant="outline" className="text-xs border-gray-300 bg-white">
                                NPS: {match.nps_score_raw}
                              </Badge>
                            </div>
                            <p className="text-xs text-primary/80 leading-relaxed line-clamp-2">{match.nps_verbatim}</p>
                          </div>
                          <button
                            onClick={() => handleGetEmail(match, index)}
                            disabled={loadingEmail === match.klaviyo_account_id}
                            className="ml-2 px-2 py-1 rounded text-xs bg-poppy/10 text-poppy border border-poppy/20 hover:bg-poppy/20 disabled:opacity-50"
                          >
                            {loadingEmail === match.klaviyo_account_id ? (
                              <div className="w-3 h-3 animate-spin rounded-full border border-poppy border-t-transparent" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual customer feedback */}
                {feature.customer_feedback && feature.customer_feedback.length > 0 && (
                  <div className="space-y-2">
                    {customerMatches.length > 0 && (
                      <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-gray-600" />
                        Manual Feedback
                      </h4>
                    )}
                    {feature.customer_feedback.map((feedback) => (
                      <div key={feedback.id} className={`p-3 rounded-lg border ${feedbackTypeColors[feedback.feedback_type as keyof typeof feedbackTypeColors]}`}>
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-primary">{feedback.customer_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {feedback.feedback_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-primary/80 line-clamp-2">{feedback.feedback_text}</p>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {(!feature.customer_feedback || feature.customer_feedback.length === 0) && customerMatches.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-gray-600">No feedback yet</p>
                    <p className="text-xs text-gray-400">Use buttons above to add</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Team Comments - Compact */}
            <Card className="p-4 bg-white/90 backdrop-blur-sm border-gray-100 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-poppy" />
                  Team Comments
                </h3>
                <button className="px-2 py-1 rounded text-xs bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <Textarea
                    placeholder="Add a comment..."
                    rows={2}
                    className="text-xs border-gray-300 bg-white"
                  />
                  <div className="mt-2 flex justify-end">
                    <button className="px-3 py-1 rounded text-xs bg-poppy/10 text-poppy font-medium border border-poppy/20 hover:bg-poppy/20">
                      Post
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* TODO: Implement real team comments system */}
                  <div className="text-center py-6 text-gray-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-gray-600">No comments yet</p>
                    <p className="text-xs text-gray-400">Start the conversation</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 