'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { ExternalLink, FileText, Palette, User, CheckCircle, Clock, Filter, Share2, Download, Search, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import PMDashboard from '@/components/PMDashboard'
import SuggestedCustomers from '@/components/SuggestedCustomers'

interface Feature {
  id: number;
  title?: string;
  description?: string;
  'drive-link': string;
  'v0-link': string;
  'v0-chat-id'?: string;
  user: string;
  shipped: boolean;
  created_at?: string;
  roadmap?: {
    status?: string;
    target_quarter?: string;
    weeks_to_ship?: number;
    business_value_score?: number;
    roadmap_notes?: string;
  }
  slack_channels?: Array<{
    id: number;
    channel_name: string;
    is_primary: boolean;
  }>;
  jira_tickets?: Array<{
    id: number;
    ticket_key: string;
    is_primary_epic: boolean;
  }>;
}

export default function FeaturesPage() {
  const { data: session, status } = useSession()
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [availableUsers, setAvailableUsers] = useState<string[]>([])

  // Define all functions before any hooks or conditional returns
  const fetchFeatures = useCallback(async () => {
    try {
      console.log('Fetching features for user:', session?.user?.email)
      const response = await fetch('/api/roadmap/prds')
      if (response.ok) {
        const data = await response.json()
        console.log('Received features data:', data)
        setFeatures(data)
        
        // Extract unique users
        const users = [...new Set(data.map((f: Feature) => f.user))].sort()
        setAvailableUsers(users)
        
        // Default to current user
        setFilterUser(session?.user?.email || 'all')
      } else {
        console.error('Failed to fetch features:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching features:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.email])

  // Filter features based on search and filters
  const filteredFeatures = features.filter(feature => {
    const matchesSearch = !searchTerm || 
      (feature.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (feature.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (feature.roadmap?.roadmap_notes?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesUser = filterUser === 'all' || feature.user === filterUser
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'shipped' && feature.shipped) ||
      (filterStatus === 'in-progress' && !feature.shipped)
    
    return matchesSearch && matchesUser && matchesStatus
  })

  const shippedFeatures = filteredFeatures.filter(f => f.shipped)
  const inProgressFeatures = filteredFeatures.filter(f => !f.shipped)

  const handleShare = async () => {
    const params = new URLSearchParams()
    if (filterUser !== 'all') params.set('user', filterUser)
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (searchTerm) params.set('search', searchTerm)
    
    const url = `${window.location.origin}/features?${params.toString()}`
    await navigator.clipboard.writeText(url)
    // Could add toast notification here
  }

  const handleExport = () => {
    const csvContent = filteredFeatures.map(f => {
      const title = f.title || `Feature #${f.id}`
      const status = f.shipped ? 'Shipped' : 'In Progress'
      const quarter = f.roadmap?.target_quarter || ''
      const created = f.created_at || ''
      return `"${title}","${f.user}","${status}","${quarter}","${created}"`
    }).join('\n')
    
    const blob = new Blob([`Title,Owner,Status,Target Quarter,Created\n${csvContent}`], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `features-${filterUser === 'all' ? 'all' : filterUser.split('@')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Call useEffect after all function definitions
  useEffect(() => {
    if (session?.user?.email) {
      fetchFeatures()
    }
  }, [session?.user?.email, fetchFeatures])

  // Listen for PRD updates (temporary debugging - should rely on database as source of truth)
  useEffect(() => {
    const handlePRDUpdate = () => {
      console.log('PRD update event received, refreshing features...')
      if (session?.user?.email) {
        fetchFeatures()
      }
    }

    window.addEventListener('savedPRDUpdated', handlePRDUpdate)
    window.addEventListener('prdCountUpdated', handlePRDUpdate)

    return () => {
      window.removeEventListener('savedPRDUpdated', handlePRDUpdate)
      window.removeEventListener('prdCountUpdated', handlePRDUpdate)
    }
  }, [session?.user?.email, fetchFeatures])

  // Handle loading and auth states after all hooks are called
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-primary animate-pulse font-sans">Loading...</div>
      </div>
    )
  }
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral/80">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">PM Portfolio</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Showcase your product accomplishments. Review your work, share achievements with stakeholders, 
              and demonstrate the impact of your product management efforts.
            </p>
          </div>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search features, descriptions, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="w-48">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <SelectValue placeholder="Filter by PM" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PMs</SelectItem>
                    {availableUsers.map(user => (
                      <SelectItem key={user} value={user}>
                        {user.split('@')[0]} {user === session?.user?.email && '(You)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              <button
                onClick={handleShare}
                className="px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 bg-poppy/10 text-poppy font-semibold border border-poppy/20 hover:bg-poppy/20 hover:scale-102"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Portfolio</span>
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200 hover:scale-102"
              >
                <Download className="w-4 h-4" />
                <span>Export List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* PM Dashboard */}
        <PMDashboard features={filteredFeatures} />

        {/* Current Work */}
        {inProgressFeatures.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-2 flex items-center">
              <Clock className="w-6 h-6 text-orange-600 mr-2" />
              Current Work
            </h2>
            <p className="text-gray-600 mb-6">Features actively being developed and managed</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {inProgressFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        )}

        {/* Shipped Accomplishments */}
        {shippedFeatures.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              Shipped Accomplishments
            </h2>
            <p className="text-gray-600 mb-6">Features successfully delivered to users</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {shippedFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredFeatures.length === 0 && features.length > 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No features match your filters</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters to see more features.</p>
          </div>
        )}
        
        {(!features || features.length === 0) && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No features in your portfolio yet</h3>
            <p className="text-gray-500 mb-4">Start building your PM portfolio by creating your first PRD.</p>
            <Link href="/" className="inline-flex items-center px-6 py-3 rounded-xl transition-all duration-200 bg-poppy/10 text-poppy font-semibold border border-poppy/20 hover:bg-poppy/20 hover:scale-102">
              Create First Feature
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const getWeeksToShip = () => {
    if (feature.roadmap?.weeks_to_ship) return feature.roadmap.weeks_to_ship;
    if (feature.roadmap?.estimated_effort_points) {
      return Math.ceil(feature.roadmap.estimated_effort_points * 0.5);
    }
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header with Title and Status */}
      <Link href={`/roadmap/feature/${feature.id}`} className="block">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-primary text-lg hover:text-poppy transition-colors line-clamp-2">
              {feature.title || `Feature #${feature.id}`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">by {feature.user.split('@')[0]}</p>
            {feature.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{feature.description}</p>
            )}
          </div>
          <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
            feature.shipped 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-orange-50 text-orange-800 border border-orange-200'
          }`}>
            {feature.shipped ? '✅ Shipped' : '🚧 In Progress'}
          </div>
        </div>
      </Link>

      {/* Key Metrics */}
      <div className="flex flex-wrap gap-2 mb-4">
        {feature.roadmap?.target_quarter && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
            <Calendar className="w-3 h-3" />
            {feature.roadmap.target_quarter}
          </div>
        )}
        {getWeeksToShip() && (
          <div className="flex items-center gap-1 px-2 py-1 bg-poppy/10 text-poppy rounded text-xs">
            <Clock className="w-3 h-3" />
            {getWeeksToShip()}w to ship
          </div>
        )}
        {feature.roadmap?.business_value_score && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
            📊 Impact: {feature.roadmap.business_value_score}/10
          </div>
        )}
        {feature.slack_channels?.some(ch => ch.is_primary) && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
            💬 Slack
          </div>
        )}
        {feature.jira_tickets?.some(ticket => ticket.is_primary_epic) && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
            🎫 Epic
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link 
          href={feature['drive-link']} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group text-sm"
        >
          <FileText className="w-4 h-4 text-primary mr-2" />
          <span className="text-primary">PRD</span>
          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-poppy transition-colors ml-1" />
        </Link>

        {(feature['v0-link']) && (
          <Link 
            href={`/?mode=design&feature_id=${feature.id}`}
            className="flex items-center justify-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group text-sm"
          >
            <Palette className="w-4 h-4 text-primary mr-2" />
            <span className="text-primary">Design</span>
          </Link>
        )}
      </div>

      {/* Suggested Customers Section */}
      <div className="pt-4 border-t border-gray-100">
        <SuggestedCustomers featureId={feature.id} className="mb-4" />
      </div>

      {/* View Details Button */}
      <div>
        <Link 
          href={`/roadmap/feature/${feature.id}`}
          className="block w-full text-center py-2 px-4 bg-poppy/10 text-poppy hover:bg-poppy hover:text-white rounded-lg transition-colors font-medium text-sm"
        >
          View Details & Manage
        </Link>
      </div>
    </div>
  );
}