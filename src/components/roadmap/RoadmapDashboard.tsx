'use client'

import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import EngineerAssignmentModal from './EngineerAssignmentModal'
import { 
  Share2, 
  Download, 
  CheckCircle,
  Clock,
  Calendar,
  ArrowRight,
  Palette,
  FileText,
  Sparkles,
  Users,
  Filter,
  MessageSquare,
  Link,
  GripVertical,
  Edit3
} from 'lucide-react'

interface RoadmapDashboardProps {
  userEmail: string
}

interface PRD {
  id: number
  title?: string
  description?: string
  'drive-link': string
  'v0-link'?: string
  'v0-chat-id'?: string
  user: string
  shipped: boolean
  created_at: string
  roadmap?: {
    priority_order?: number
    status?: string
    target_quarter?: string
    estimated_effort_points?: number
    weeks_to_ship?: number  // Direct weeks estimation
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
  }
  assigned_engineers_count?: number
  total_estimated_weeks?: number
  slack_channels?: Array<{
    id: number
    channel_name: string
    channel_url?: string
    is_primary: boolean
  }>
  jira_tickets?: Array<{
    id: number
    ticket_key: string
    ticket_url: string
    ticket_type?: string
    is_primary_epic: boolean
  }>
}

export default function RoadmapDashboard({ userEmail }: RoadmapDashboardProps) {
  const [prds, setPRDs] = useState<PRD[]>([])
  const [loading, setLoading] = useState(true)
  const [availableUsers, setAvailableUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string>(userEmail)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [editingWeeks, setEditingWeeks] = useState<{ [key: number]: boolean }>({})
  const [tempWeeks, setTempWeeks] = useState<{ [key: number]: string }>({})

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/roadmap/users')
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchRoadmap = useCallback(async () => {
    try {
      setLoading(true)
      const url = selectedUser ? `/api/roadmap/prds?user=${encodeURIComponent(selectedUser)}` : '/api/roadmap/prds'
      console.log('Fetching roadmap data from:', url)
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log('Roadmap data for user:', selectedUser, data)
        setPRDs(data.sort((a: PRD, b: PRD) => 
          (a.roadmap?.priority_order || 999) - (b.roadmap?.priority_order || 999)
        ))
      } else {
        console.error('Failed to fetch roadmap:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching roadmap:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedUser])

  useEffect(() => {
    fetchAvailableUsers()
  }, [])

  useEffect(() => {
    fetchRoadmap()
  }, [selectedUser, fetchRoadmap])

  // Listen for PRD updates to refresh roadmap
  useEffect(() => {
    const handlePRDUpdate = () => {
      console.log('PRD update event received, refreshing roadmap...')
      fetchRoadmap()
    }

    window.addEventListener('savedPRDUpdated', handlePRDUpdate)
    window.addEventListener('prdCountUpdated', handlePRDUpdate)

    return () => {
      window.removeEventListener('savedPRDUpdated', handlePRDUpdate)
      window.removeEventListener('prdCountUpdated', handlePRDUpdate)
    }
  }, [fetchRoadmap])

  // Helper function to get weeks - prioritize engineer assignments over manual estimates
  const getWeeksToShip = (prd: PRD) => {
    // Prioritize engineer assignment total as the source of truth
    if (prd.total_estimated_weeks && prd.total_estimated_weeks > 0) {
      return prd.total_estimated_weeks;
    }
    // Fall back to manual weeks estimation
    if (prd.roadmap?.weeks_to_ship) return prd.roadmap.weeks_to_ship;
    // Legacy: story points conversion (deprecated)
    if (prd.roadmap?.estimated_effort_points) {
      return Math.ceil(prd.roadmap.estimated_effort_points * 0.5);
    }
    return null;
  }

  const handleUpdateWeeks = async (prdId: number, weeks: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks_to_ship: weeks })
      })
      
      if (response.ok) {
        setPRDs(prev => prev.map(prd => 
          prd.id === prdId 
            ? { ...prd, roadmap: { ...prd.roadmap, weeks_to_ship: weeks } }
            : prd
        ))
        setEditingWeeks(prev => ({ ...prev, [prdId]: false }))
        setTempWeeks(prev => ({ ...prev, [prdId]: '' }))
      }
    } catch (error) {
      console.error('Error updating weeks:', error)
    }
  }

  const startEditingWeeks = (prdId: number, currentWeeks?: number) => {
    setEditingWeeks(prev => ({ ...prev, [prdId]: true }))
    setTempWeeks(prev => ({ ...prev, [prdId]: currentWeeks?.toString() || '' }))
  }

  const cancelEditingWeeks = (prdId: number) => {
    setEditingWeeks(prev => ({ ...prev, [prdId]: false }))
    setTempWeeks(prev => ({ ...prev, [prdId]: '' }))
  }

  // Helper function to determine shipping timeline with better categories
  const getShippingTimeframe = (prd: PRD) => {
    if (prd.shipped || prd.roadmap?.status === 'shipped') return 'shipped';
    
    const weeks = getWeeksToShip(prd);
    if (!weeks) return 'planned';
    
    if (weeks <= 2) return 'shippingSoon';  // This week and next week
    if (weeks <= 8) return 'thisQuarter';   // Next 2 months
    return 'planned';  // Longer term
  }

  // Categorize PRDs by shipping timeline with better PM-focused categories
  const shipped = prds.filter(prd => getShippingTimeframe(prd) === 'shipped')
  
  const shippingSoon = prds.filter(prd => getShippingTimeframe(prd) === 'shippingSoon')
  
  const thisQuarter = prds.filter(prd => getShippingTimeframe(prd) === 'thisQuarter')
  
  const planned = prds.filter(prd => getShippingTimeframe(prd) === 'planned')

  const handleShare = async () => {
    const url = `${window.location.origin}/roadmap/shared?user=${encodeURIComponent(selectedUser)}`
    await navigator.clipboard.writeText(url)
    // Could add a toast notification here
  }

  const handleExport = () => {
    window.open(`/api/roadmap/export?format=csv&user=${encodeURIComponent(selectedUser)}`, '_blank')
  }

  const handleFeatureClick = (featureId: number) => {
    window.location.href = `/roadmap/feature/${featureId}`
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    const featureId = parseInt(draggableId)
    
    // Determine source and destination timeframes
    const sourceTimeframe = source.droppableId
    const destTimeframe = destination.droppableId
    
    if (sourceTimeframe === destTimeframe) {
      // Reordering within same timeframe - update priority order
      const timeframeFeatures = getTimeframeFeatures(sourceTimeframe)
      const reorderedFeatures = Array.from(timeframeFeatures)
      const [movedFeature] = reorderedFeatures.splice(source.index, 1)
      reorderedFeatures.splice(destination.index, 0, movedFeature)
      
      // Update priority orders for all features in this timeframe
      const updates = reorderedFeatures.map((feature, index) => ({
        id: feature.id,
        priority_order: index + 1
      }))
      
      // Update local state optimistically
      setPRDs(prev => prev.map(prd => {
        const update = updates.find(u => u.id === prd.id)
        return update ? { ...prd, roadmap: { ...prd.roadmap, priority_order: update.priority_order } } : prd
      }))
      
      // Save to backend
      try {
        await Promise.all(updates.map(update => 
          fetch(`/api/roadmap/prd/${update.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority_order: update.priority_order })
          })
        ))
      } catch (error) {
        console.error('Error updating feature order:', error)
        fetchRoadmap() // Revert on error
      }
    } else {
      // Moving between timeframes - update feature timeframe
      const feature = prds.find(prd => prd.id === featureId)
      if (!feature) return
      
      const updateData: { shipped?: boolean; weeks_to_ship?: number | null; status?: string } = {}
      
      // Map droppable IDs to roadmap properties
      if (destTimeframe === 'shipped') {
        updateData.shipped = true
        updateData.status = 'shipped'
      } else if (destTimeframe === 'shippingSoon') {
        updateData.shipped = false
        updateData.weeks_to_ship = 1
        updateData.status = 'in_progress'
      } else if (destTimeframe === 'thisQuarter') {
        updateData.shipped = false
        updateData.weeks_to_ship = 6
        updateData.status = 'planned'
      } else if (destTimeframe === 'planned') {
        updateData.shipped = false
        updateData.weeks_to_ship = null
        updateData.status = 'planned'
      }
      
      // Update local state optimistically
      setPRDs(prev => prev.map(prd => 
        prd.id === featureId 
          ? { 
              ...prd, 
              shipped: updateData.shipped ?? prd.shipped,
              roadmap: { 
                ...prd.roadmap, 
                weeks_to_ship: updateData.weeks_to_ship ?? prd.roadmap?.weeks_to_ship,
                status: updateData.status ?? prd.roadmap?.status
              }
            }
          : prd
      ))
      
      // Save to backend
      try {
        await fetch(`/api/roadmap/prd/${featureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
      } catch (error) {
        console.error('Error updating feature timeframe:', error)
        fetchRoadmap() // Revert on error
      }
    }
  }
  
  const getTimeframeFeatures = (timeframe: string) => {
    switch (timeframe) {
      case 'shipped': return shipped
      case 'shippingSoon': return shippingSoon
      case 'thisQuarter': return thisQuarter
      case 'planned': return planned
      default: return []
    }
  }

  const renderFeatureCard = (feature: PRD, isDragging?: boolean) => (
    <div 
      className={`p-4 border border-gray-100 rounded-xl hover:shadow-lg hover:border-poppy/30 transition-all cursor-pointer bg-white/70 backdrop-blur-sm mb-3 group ${
        isDragging ? 'shadow-2xl rotate-3 scale-105' : ''
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-poppy transition-colors flex-shrink-0" />
            <h3 
              className="text-lg font-semibold text-primary leading-tight group-hover:text-poppy transition-colors flex-1"
              onClick={(e) => {
                e.stopPropagation()
                handleFeatureClick(feature.id)
              }}
            >
              {feature.title || `Feature #${feature.id}`}
            </h3>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-poppy transition-colors flex-shrink-0 ml-2" />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Weeks estimation - editable */}
          {editingWeeks[feature.id] ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={tempWeeks[feature.id] || ''}
                onChange={(e) => setTempWeeks(prev => ({ ...prev, [feature.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const weeks = parseFloat(tempWeeks[feature.id] || '0')
                    if (weeks > 0) handleUpdateWeeks(feature.id, weeks)
                  } else if (e.key === 'Escape') {
                    cancelEditingWeeks(feature.id)
                  }
                }}
                className="w-16 px-1 py-0.5 text-xs border border-poppy rounded focus:outline-none focus:ring-1 focus:ring-poppy"
                autoFocus
              />
              <span className="text-xs text-poppy">w</span>
              <button
                onClick={() => {
                  const weeks = parseFloat(tempWeeks[feature.id] || '0')
                  if (weeks > 0) handleUpdateWeeks(feature.id, weeks)
                }}
                className="text-xs text-green-600 hover:text-green-800"
              >
                ✓
              </button>
              <button
                onClick={() => cancelEditingWeeks(feature.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          ) : (
            getWeeksToShip(feature) && (
              <Badge 
                variant="outline" 
                className="border-poppy/30 text-poppy text-xs bg-poppy/5 cursor-pointer hover:bg-poppy/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  startEditingWeeks(feature.id, getWeeksToShip(feature) || undefined)
                }}
              >
                <Clock className="w-3 h-3 mr-1" />
                {getWeeksToShip(feature)}w to ship
                <Edit3 className="w-3 h-3 ml-1" />
              </Badge>
            )
          )}
          
          {/* Engineer assignments */}
          {(feature.assigned_engineers_count ?? 0) > 0 && (
            <EngineerAssignmentModal
              prdId={feature.id}
              prdTitle={feature.title || `Feature #${feature.id}`}
              onAssignmentsChange={fetchRoadmap}
              trigger={
                <Badge 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 text-xs bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Users className="w-3 h-3 mr-1" />
                  {feature.assigned_engineers_count} engineer{feature.assigned_engineers_count !== 1 ? 's' : ''}
                </Badge>
              }
            />
          )}
          
          {feature['v0-link'] && (
            <a 
              href={`/?mode=design&feature_id=${feature.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-block"
            >
              <Badge className="bg-sprout/20 text-sprout border-sprout/30 text-xs cursor-pointer hover:bg-sprout/30 transition-colors">
                <Palette className="w-3 h-3 mr-1" />
                Design
              </Badge>
            </a>
          )}
          {feature.slack_channels?.some(ch => ch.is_primary) && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              Slack
            </Badge>
          )}
          {feature.jira_tickets?.some(ticket => ticket.is_primary_epic) && (
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
              <Link className="w-3 h-3 mr-1" />
              Epic
            </Badge>
          )}
        </div>
        
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {feature.description || 'Click to view details and add feedback'}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>PRD</span>
            </div>
            {feature.roadmap?.target_quarter && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{feature.roadmap.target_quarter}</span>
              </div>
            )}
          </div>
          
          {/* Add assignment button if no engineers assigned */}
          {(!feature.assigned_engineers_count || feature.assigned_engineers_count === 0) && (
            <EngineerAssignmentModal
              prdId={feature.id}
              prdTitle={feature.title || `Feature #${feature.id}`}
              onAssignmentsChange={fetchRoadmap}
              trigger={
                <button 
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Users className="w-3 h-3" />
                  Assign Engineers
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  )

  const renderTimelineColumn = (title: string, description: string, features: PRD[], icon: React.ReactNode, bgColor: string, borderColor: string, droppableId: string) => (
    <div className="flex-1 min-w-0">
      <Card className="bg-white/80 backdrop-blur-sm border-gray-100 shadow-lg h-full hover:shadow-xl transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className={`p-2 ${bgColor} rounded-lg border ${borderColor}`}>
              {icon}
            </div>
            <span className="text-primary">{title}</span>
          </CardTitle>
          <p className="text-gray-600 text-sm">{description}</p>
          <div className="text-xs text-poppy/70 mt-1 font-medium">
            {features.length} feature{features.length !== 1 ? 's' : ''}
          </div>
        </CardHeader>
        <CardContent>
          <Droppable droppableId={droppableId}>
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-0 max-h-[600px] overflow-y-auto custom-scrollbar min-h-[200px] transition-colors ${
                  snapshot.isDraggingOver ? 'bg-poppy/5 rounded-lg' : ''
                }`}
              >
                {features.length > 0 ? (
                  features.map((feature, index) => (
                    <Draggable key={feature.id} draggableId={feature.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {renderFeatureCard(feature, snapshot.isDragging)}
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className={`p-3 ${bgColor} rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center border ${borderColor}`}>
                      {icon}
                    </div>
                    <p className="text-sm text-gray-600">No features in this timeframe</p>
                    <p className="text-xs text-gray-400 mt-1">Drag features here to update timeline</p>
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Roadmap Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-poppy mb-4">
          Product Roadmap
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Your central hub for product strategy and stakeholder communication
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Live updates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-poppy rounded-full"></div>
            <span>Stakeholder ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Export ready</span>
          </div>
        </div>
      </div>

      {/* PM Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-green-50/80 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Shipped</p>
                <p className="text-2xl font-bold text-green-900">{shipped.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50/80 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Shipping Soon</p>
                <p className="text-2xl font-bold text-orange-900">{shippingSoon.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50/80 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">This Quarter</p>
                <p className="text-2xl font-bold text-blue-900">{thisQuarter.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50/80 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Planned</p>
                <p className="text-2xl font-bold text-purple-900">{planned.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-primary/80 font-medium">Single source of truth for all stakeholders</p>
          </div>
          
          {/* User Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">Filter by:</span>
            </div>
            <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loadingUsers}>
              <SelectTrigger className="w-52 bg-white/90 border-gray-300 focus:ring-poppy focus:border-poppy">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <SelectValue placeholder="Select user..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-poppy mx-auto mb-2"></div>
                    Loading users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No users found
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-poppy/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-poppy">
                            {user.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="truncate">{user}</span>
                        {user === userEmail && (
                          <Badge variant="secondary" className="text-xs bg-sprout/20 text-sprout">You</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 bg-poppy/10 text-poppy font-semibold border border-poppy/20 hover:bg-poppy/20 hover:scale-102"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Roadmap</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200 hover:scale-102"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Timeline Columns - PM Focused */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {renderTimelineColumn(
            "Shipped",
            "Features delivered to users",
            shipped,
            <CheckCircle className="w-5 h-5 text-green-600" />,
            "bg-green-50",
            "border-green-200",
            "shipped"
          )}
          
          {renderTimelineColumn(
            "Shipping Soon", 
            "Ready within 2 weeks",
            shippingSoon,
            <Clock className="w-5 h-5 text-orange-600" />,
            "bg-orange-50",
            "border-orange-200",
            "shippingSoon"
          )}
          
          {renderTimelineColumn(
            "This Quarter",
            "Expected in next 2 months", 
            thisQuarter,
            <Calendar className="w-5 h-5 text-blue-600" />,
            "bg-blue-50",
            "border-blue-200",
            "thisQuarter"
          )}
          
          {renderTimelineColumn(
            "Planned",
            "Future roadmap items", 
            planned,
            <FileText className="w-5 h-5 text-purple-600" />,
            "bg-purple-50",
            "border-purple-200",
            "planned"
          )}
        </div>
      </DragDropContext>

      {/* Empty State */}
      {prds.length === 0 && (
        <div className="text-center py-16">
          <div className="p-6 bg-poppy/5 border border-poppy/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Calendar className="w-10 h-10 text-poppy" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">No features in roadmap</h3>
          <p className="text-gray-500 mb-4">Create your first feature to start tracking shipping timelines.</p>
          <button className="px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 bg-poppy/10 text-poppy font-semibold border border-poppy/20 hover:bg-poppy/20 hover:scale-102">
            <Sparkles className="w-4 h-4" />
            <span>Create First Feature</span>
          </button>
        </div>
      )}
    </div>
  )
}