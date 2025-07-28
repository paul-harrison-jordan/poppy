'use client'

import React, { useState, useCallback } from 'react'
import { useRoadmapPRDs, getPRDStatus, getWeeksToShip, type PRD } from '@/hooks/useRoadmapData'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Users,
  ArrowRight,
  Zap,
  Target,
  Activity,
  ChevronDown,
  ChevronRight,
  Eye,
  GitBranch,
  FileText,
  ExternalLink,
  GripVertical
} from 'lucide-react'

type ZoomLevel = 'quarter' | 'month' | 'sprint' | 'checklist'


type ActivityItem = {
  id: string
  type: 'prd_update' | 'status_change' | 'design_review' | 'slack_thread' | 'jira_update'
  content: string
  author: string
  timestamp: string
  url?: string
}

interface LivingRoadmapTimelineProps {
  userEmail: string
  onItemSelect: (id: number) => void
}

const zoomLevelConfig = {
  quarter: { 
    label: 'Quarterly View', 
    granularity: 'quarter',
    showMetadata: ['status', 'confidence', 'scopeDrift'],
    timeUnits: 4
  },
  month: { 
    label: 'Monthly View', 
    granularity: 'month',
    showMetadata: ['status', 'confidence', 'assignees', 'velocity'],
    timeUnits: 12
  },
  sprint: { 
    label: 'Sprint View', 
    granularity: 'sprint',
    showMetadata: ['status', 'assignees', 'blockers', 'activities'],
    timeUnits: 26
  },
  checklist: { 
    label: 'Shipping Checklist', 
    granularity: 'task',
    showMetadata: ['all'],
    timeUnits: 0
  }
}

const statusColors = {
  planned: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500' },
  in_progress: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', accent: 'bg-yellow-500' },
  in_review: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'bg-purple-500' },
  shipped: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', accent: 'bg-green-500' },
  on_hold: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'bg-gray-500' }
}

export default function LivingRoadmapTimeline({ userEmail, onItemSelect }: LivingRoadmapTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  const [editingWeeks, setEditingWeeks] = useState<{ [key: number]: boolean }>({})
  const [tempWeeks, setTempWeeks] = useState<{ [key: number]: string }>({})
  const [editingSlack, setEditingSlack] = useState<{ [key: number]: boolean }>({})
  const [tempSlack, setTempSlack] = useState<{ [key: number]: string }>({})
  const [editingJira, setEditingJira] = useState<{ [key: number]: boolean }>({})
  const [tempJira, setTempJira] = useState<{ [key: number]: string }>({})



  // Use shared hook for fetching PRDs
  const { prds, loading, refetch: fetchPRDs } = useRoadmapPRDs(userEmail)

  // Handle drag and drop for reordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(prds)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update priority orders
    const updatedPRDs = items.map((prd, index) => ({
      ...prd,
      roadmap: {
        ...prd.roadmap,
        priority_order: index
      }
    }))

    // Refetch data after reordering
    fetchPRDs()

    // Save to backend - use individual PATCH calls like RoadmapDashboard
    try {
      const updates = updatedPRDs.map((prd, index) => ({
        id: prd.id,
        priority_order: index
      }))

      await Promise.all(updates.map(update => 
        fetch(`/api/roadmap/prd/${update.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority_order: update.priority_order })
        })
      ))
    } catch (error) {
      console.error('Error updating order:', error)
      // Revert on error
      fetchPRDs()
    }
  }

  const toggleItemExpansion = (itemId: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Helper functions for inline editing
  const updateWeeks = async (prdId: number, weeks: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks_to_ship: weeks })
      })
      
      if (response.ok) {
        // Refresh data after update
        fetchPRDs()
        setEditingWeeks(prev => ({ ...prev, [prdId]: false }))
        setTempWeeks(prev => ({ ...prev, [prdId]: '' }))
      }
    } catch (error) {
      console.error('Error updating weeks:', error)
    }
  }

  const addSlackChannel = async (prdId: number, channelName: string) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prdId}/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_name: channelName })
      })
      
      if (response.ok) {
        const newChannel = await response.json()
        // Refresh data after adding slack channel
        fetchPRDs()
        setEditingSlack(prev => ({ ...prev, [prdId]: false }))
        setTempSlack(prev => ({ ...prev, [prdId]: '' }))
      }
    } catch (error) {
      console.error('Error adding slack channel:', error)
    }
  }

  const addJiraTicket = async (prdId: number, ticketKey: string) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prdId}/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_key: ticketKey })
      })
      
      if (response.ok) {
        const newTicket = await response.json()
        // Refresh data after adding jira ticket
        fetchPRDs()
        setEditingJira(prev => ({ ...prev, [prdId]: false }))
        setTempJira(prev => ({ ...prev, [prdId]: '' }))
      }
    } catch (error) {
      console.error('Error adding jira ticket:', error)
    }
  }

  // Convert PRD to timeline status

  // Calculate confidence based on available data
  const getConfidence = (prd: PRD): number => {
    let confidence = 75 // Base confidence
    
    // Increase confidence if we have key data
    if (prd.roadmap?.business_value_score) confidence += 5
    if (prd.roadmap?.technical_complexity_score) confidence += 5
    if (prd.jira_tickets && prd.jira_tickets.length > 0) confidence += 10
    if (prd.assigned_engineers_count && prd.assigned_engineers_count > 0) confidence += 10
    if (prd['v0-link']) confidence += 5
    
    // Decrease if missing critical info
    if (!prd.roadmap?.weeks_to_ship && !prd.total_estimated_weeks) confidence -= 15
    if (!prd.description) confidence -= 10
    
    return Math.max(20, Math.min(95, confidence))
  }

  // Memoized AI insights computation
  const getAIInsight = useCallback((prd: PRD) => {
    const weeksToShip = getWeeksToShip(prd)
    const businessValue = prd.roadmap?.business_value_score || 0
    const techComplexity = prd.roadmap?.technical_complexity_score || 0
    const confidence = getConfidence(prd)
    
    // Check for scope expansion (high complexity vs business value)
    if (techComplexity > businessValue + 3) {
      return {
        type: 'warning',
        icon: TrendingUp,
        message: `High complexity vs value - consider scope reduction`,
        color: 'text-orange-600 bg-orange-50 border-orange-200'
      }
    } 
    
    // Check for shipping readiness
    if (weeksToShip && weeksToShip <= 2 && !prd.jira_tickets?.length) {
      return {
        type: 'risk',
        icon: AlertTriangle,
        message: `Shipping soon but no Jira tickets - needs engineering planning`,
        color: 'text-red-600 bg-red-50 border-red-200'
      }
    }
    
    // Check for high confidence + readiness
    if (confidence > 85 && prd.jira_tickets?.length && prd.assigned_engineers_count) {
      return {
        type: 'positive',
        icon: CheckCircle2,
        message: `High confidence with strong execution plan`,
        color: 'text-green-600 bg-green-50 border-green-200'
      }
    }
    
    // Low confidence warning
    if (confidence < 60) {
      return {
        type: 'risk',
        icon: AlertTriangle,
        message: `Low confidence (${confidence}%) - missing key details`,
        color: 'text-red-600 bg-red-50 border-red-200'
      }
    }
    
    return null
  }, [])

  // Memoized activity generation to avoid creating new Date objects on every render
  const generateActivities = useCallback((prd: PRD): ActivityItem[] => {
    const activities: ActivityItem[] = []
    const now = Date.now()
    
    // PRD creation activity
    activities.push({
      id: `prd-${prd.id}`,
      type: 'prd_update',
      content: 'PRD created and added to roadmap',
      author: prd.user,
      timestamp: prd.created_at
    })
    
    // Jira ticket activities
    prd.jira_tickets?.forEach((ticket, index) => {
      activities.push({
        id: `jira-${ticket.id}`,
        type: 'jira_update',
        content: `${ticket.ticket_type || 'Epic'} created: ${ticket.ticket_key}`,
        author: 'Engineering Team',
        timestamp: new Date(now - (7 - index) * 24 * 60 * 60 * 1000).toISOString(),
        url: ticket.ticket_url
      })
    })
    
    // Slack channel activities
    prd.slack_channels?.forEach((channel, index) => {
      activities.push({
        id: `slack-${channel.id}`,
        type: 'slack_thread',
        content: `Discussion started in ${channel.channel_name}`,
        author: 'Team',
        timestamp: new Date(now - (5 - index) * 24 * 60 * 60 * 1000).toISOString(),
        url: channel.channel_url
      })
    })
    
    // V0 design activity
    if (prd['v0-link']) {
      activities.push({
        id: `v0-${prd.id}`,
        type: 'design_review',
        content: 'Interactive prototype created with v0',
        author: 'Design Team',
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        url: prd['v0-link']
      })
    }
    
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [])

  // Memoize timeline item data to prevent recalculations
  const getTimelineItemData = useCallback((prd: PRD) => {
    const status = getPRDStatus(prd)
    const colors = statusColors[status as keyof typeof statusColors] || statusColors.planned
    const insight = getAIInsight(prd)
    const confidence = getConfidence(prd)
    const activities = generateActivities(prd)
    const weeksToShip = getWeeksToShip(prd)

    // Calculate timeline progress once
    const createdDate = new Date(prd.created_at)
    const targetDate = weeksToShip 
      ? new Date(createdDate.getTime() + weeksToShip * 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days if no estimate
    
    return { status, colors, insight, confidence, activities, weeksToShip, targetDate, createdDate }
  }, [getAIInsight, generateActivities])

  const renderTimelineItem = (prd: PRD, index: number, provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
    const isExpanded = expandedItems.has(prd.id)
    const { status, colors, insight, confidence, activities, weeksToShip, targetDate, createdDate } = getTimelineItemData(prd)

    return (
      <motion.div
        ref={provided.innerRef}
        {...provided.draggableProps}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`relative ${snapshot.isDragging ? 'rotate-3 scale-105' : ''} transition-transform`}
      >
            {/* Timeline connector */}
            {index < prds.length - 1 && !snapshot.isDragging && (
              <div className="absolute left-6 top-20 w-0.5 h-8 bg-gray-200 z-0" />
            )}

            <Card className={`mb-4 transition-all duration-300 hover:shadow-lg border-l-4 ${
              selectedItem === prd.id ? 'ring-2 ring-poppy/20 shadow-lg' : ''
            } ${colors.border} ${snapshot.isDragging ? 'shadow-2xl bg-white' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  {/* Drag handle and status indicator */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0 mt-1">
                    <div 
                      {...provided.dragHandleProps}
                      className="cursor-grab active:cursor-grabbing p-3 rounded-lg hover:bg-poppy/10 border border-transparent hover:border-poppy/20 transition-all touch-none group"
                      style={{ touchAction: 'none' }}
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-poppy transition-colors" />
                    </div>
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${colors.accent} relative z-10`} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedItem(prd.id)
                              onItemSelect(prd.id)
                            }}
                            className="text-left hover:text-poppy transition-colors flex-1"
                          >
                            <CardTitle className="text-lg font-semibold">
                              {prd.title || `Feature #${prd.id}`}
                            </CardTitle>
                          </button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/roadmap/feature/${prd.id}`
                            }}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-poppy"
                            title="Open full feature page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        <Badge className={`${colors.bg} ${colors.text} ${colors.border} border text-xs`}>
                          {status.replace('_', ' ')}
                        </Badge>
                        {/* Editable weeks */}
                        {editingWeeks[prd.id] ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={tempWeeks[prd.id] || ''}
                              onChange={(e) => setTempWeeks(prev => ({ ...prev, [prd.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const weeks = parseFloat(tempWeeks[prd.id] || '0')
                                  if (weeks > 0) updateWeeks(prd.id, weeks)
                                } else if (e.key === 'Escape') {
                                  setEditingWeeks(prev => ({ ...prev, [prd.id]: false }))
                                  setTempWeeks(prev => ({ ...prev, [prd.id]: '' }))
                                }
                              }}
                              className="w-16 px-2 py-1 text-xs border border-poppy rounded focus:outline-none focus:ring-1 focus:ring-poppy"
                              autoFocus
                            />
                            <span className="text-xs text-poppy">w</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                const weeks = parseFloat(tempWeeks[prd.id] || '0')
                                if (weeks > 0) updateWeeks(prd.id, weeks)
                              }}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingWeeks(prev => ({ ...prev, [prd.id]: false }))
                                setTempWeeks(prev => ({ ...prev, [prd.id]: '' }))
                              }}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          weeksToShip && (
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingWeeks(prev => ({ ...prev, [prd.id]: true }))
                                setTempWeeks(prev => ({ ...prev, [prd.id]: weeksToShip.toString() }))
                              }}
                            >
                              {weeksToShip}w
                            </Badge>
                          )
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Confidence indicator */}
                        <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${
                          confidence >= 80 ? 'bg-green-50 text-green-700' :
                          confidence >= 60 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          <Target className="w-3 h-3" />
                          <span className="font-medium">{confidence}%</span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleItemExpansion(prd.id)
                          }}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-poppy hover:bg-poppy/10"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {prd.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {prd.description}
                      </p>
                    )}

                    {/* AI Insight */}
                    {insight && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-2 p-3 rounded-lg border ${insight.color}`}
                      >
                        <insight.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{insight.message}</span>
                      </motion.div>
                    )}

                    {/* Timeline bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {new Date(prd.created_at).toLocaleDateString()}</span>
                        <span>Target {targetDate.toLocaleDateString()}</span>
                      </div>
                      <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className={`absolute left-0 top-0 h-full ${colors.accent} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ 
                            width: prd.shipped ? '100%' : `${Math.min(90, Math.max(10, 
                              (Date.now() - createdDate.getTime()) / (targetDate.getTime() - createdDate.getTime()) * 100
                            ))}%` 
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Quick metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {prd.assigned_engineers_count ? (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{prd.assigned_engineers_count} engineers</span>
                        </div>
                      ) : null}
                      
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>{activities.length} updates</span>
                      </div>
                      
                      {prd.roadmap?.business_value_score && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>Value: {prd.roadmap.business_value_score}/10</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Activity feed */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Recent Activity
                      </h4>
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                              {activity.type === 'design_review' && <Eye className="w-4 h-4 text-purple-600" />}
                              {activity.type === 'slack_thread' && <MessageSquare className="w-4 h-4 text-blue-600" />}
                              {activity.type === 'jira_update' && <GitBranch className="w-4 h-4 text-green-600" />}
                              {activity.type === 'prd_update' && <FileText className="w-4 h-4 text-blue-600" />}
                              {activity.type === 'status_change' && <Activity className="w-4 h-4 text-orange-600" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{activity.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {activity.author} • {new Date(activity.timestamp).toLocaleDateString()}
                              </p>
                              {activity.url && (
                                <a 
                                  href={activity.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata and links */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Details & Links
                      </h4>
                      
                      {/* Quick metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-600 font-medium">Business Value</div>
                          <div className="text-xl font-bold text-blue-900">
                            {prd.roadmap?.business_value_score || '--'}/10
                          </div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-sm text-orange-600 font-medium">Complexity</div>
                          <div className="text-xl font-bold text-orange-900">
                            {prd.roadmap?.technical_complexity_score || '--'}/10
                          </div>
                        </div>
                      </div>

                      {/* Links */}
                      <div className="space-y-2">
                        <a href={prd['drive-link']} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                          <ArrowRight className="w-4 h-4" />
                          View PRD
                        </a>
                        
                        {prd['v0-link'] && (
                          <a href={prd['v0-link']} target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800">
                            <ArrowRight className="w-4 h-4" />
                            v0 Design
                          </a>
                        )}
                        
                        {/* Jira tickets with add functionality */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Jira Tickets</span>
                            {!editingJira[prd.id] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingJira(prev => ({ ...prev, [prd.id]: true }))
                                  setTempJira(prev => ({ ...prev, [prd.id]: '' }))
                                }}
                                className="h-6 text-xs text-blue-600 hover:text-blue-800"
                              >
                                + Add Ticket
                              </Button>
                            )}
                          </div>
                          
                          {prd.jira_tickets?.map((ticket) => (
                            <a key={ticket.id} href={ticket.ticket_url} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800">
                              <ArrowRight className="w-4 h-4" />
                              {ticket.ticket_key}
                            </a>
                          ))}
                          
                          {editingJira[prd.id] && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="e.g. PROJ-123"
                                value={tempJira[prd.id] || ''}
                                onChange={(e) => setTempJira(prev => ({ ...prev, [prd.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && tempJira[prd.id]?.trim()) {
                                    addJiraTicket(prd.id, tempJira[prd.id].trim())
                                  } else if (e.key === 'Escape') {
                                    setEditingJira(prev => ({ ...prev, [prd.id]: false }))
                                    setTempJira(prev => ({ ...prev, [prd.id]: '' }))
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-poppy focus:border-poppy"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (tempJira[prd.id]?.trim()) {
                                    addJiraTicket(prd.id, tempJira[prd.id].trim())
                                  }
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingJira(prev => ({ ...prev, [prd.id]: false }))
                                  setTempJira(prev => ({ ...prev, [prd.id]: '' }))
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                              >
                                ✕
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Slack channels with add functionality */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Slack Channels</span>
                            {!editingSlack[prd.id] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingSlack(prev => ({ ...prev, [prd.id]: true }))
                                  setTempSlack(prev => ({ ...prev, [prd.id]: '' }))
                                }}
                                className="h-6 text-xs text-blue-600 hover:text-blue-800"
                              >
                                + Add Channel
                              </Button>
                            )}
                          </div>
                          
                          {prd.slack_channels?.map((channel) => (
                            <a key={channel.id} 
                               href={channel.channel_url || `https://slack.com/channels/${channel.channel_name}`} 
                               target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                              <ArrowRight className="w-4 h-4" />
                              #{channel.channel_name}
                            </a>
                          ))}
                          
                          {editingSlack[prd.id] && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">#</span>
                              <input
                                type="text"
                                placeholder="channel-name"
                                value={tempSlack[prd.id] || ''}
                                onChange={(e) => setTempSlack(prev => ({ ...prev, [prd.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && tempSlack[prd.id]?.trim()) {
                                    addSlackChannel(prd.id, tempSlack[prd.id].trim())
                                  } else if (e.key === 'Escape') {
                                    setEditingSlack(prev => ({ ...prev, [prd.id]: false }))
                                    setTempSlack(prev => ({ ...prev, [prd.id]: '' }))
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-poppy focus:border-poppy"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (tempSlack[prd.id]?.trim()) {
                                    addSlackChannel(prd.id, tempSlack[prd.id].trim())
                                  }
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingSlack(prev => ({ ...prev, [prd.id]: false }))
                                  setTempSlack(prev => ({ ...prev, [prd.id]: '' }))
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                              >
                                ✕
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Zoom level controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Living Roadmap</h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.keys(zoomLevelConfig) as ZoomLevel[]).map((level) => (
              <Button
                key={level}
                variant={zoomLevel === level ? "default" : "ghost"}
                size="sm"
                onClick={() => setZoomLevel(level)}
                className={`text-xs ${
                  zoomLevel === level 
                    ? 'bg-poppy text-white hover:bg-poppy/90' 
                    : 'text-gray-600 hover:text-poppy hover:bg-poppy/10'
                }`}
              >
                {zoomLevelConfig[level].label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {prds.length} active features • Live updates enabled
        </div>
      </div>

      {/* Timeline */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="timeline" type="TIMELINE_ITEM">
          {(provided, snapshot) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-4 min-h-[200px] ${
                snapshot.isDraggingOver ? 'bg-poppy/5 rounded-lg p-2' : ''
              }`}
            >
              {prds.map((prd, index) => (
                <Draggable 
                  key={prd.id} 
                  draggableId={prd.id.toString()} 
                  index={index}
                >
                  {(provided, snapshot) => renderTimelineItem(prd, index, provided, snapshot)}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}