'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRoadmapPRDs, type PRD } from '@/hooks/useRoadmapData'
import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Palette,
  Layers,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  GripVertical,
  User,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Phase {
  id: number
  name: string
  description: string
  customer_value?: string
  is_complete?: boolean
  priority: number
}

interface SimpleRoadmapTimelineProps {
  userEmail: string
}

export default function SimpleRoadmapTimeline({ userEmail }: SimpleRoadmapTimelineProps) {
  const [prdPhases, setPrdPhases] = useState<{ [key: number]: Phase[] }>({})
  // Dragging state for potential future use
  // const [isDragging, setIsDragging] = useState(false)
  
  // Use shared hook for fetching PRDs
  const { prds, loading, refetch } = useRoadmapPRDs(userEmail)

  // Calculate estimated ship date
  const getEstimatedShipDate = (targetQuarter?: string, effortPoints?: number) => {
    if (!targetQuarter) return null
    
    // Parse quarter (e.g., "Q2 2024")
    const match = targetQuarter.match(/Q(\d)\s+(\d{4})/)
    if (!match) return null
    
    const quarter = parseInt(match[1])
    const year = parseInt(match[2])
    
    // Base month for each quarter
    const quarterMonths = { 1: 0, 2: 3, 3: 6, 4: 9 }
    const baseMonth = quarterMonths[quarter as keyof typeof quarterMonths]
    
    // Add weeks based on effort points (1 point = ~1 week)
    const weeksToAdd = effortPoints || 0
    const date = new Date(year, baseMonth, 1)
    date.setDate(date.getDate() + (weeksToAdd * 7))
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Fetch phases for a PRD
  const fetchPhasesForPRD = useCallback(async (prdId: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prdId}/phases`)
      if (response.ok) {
        const data = await response.json()
        setPrdPhases(prev => ({ ...prev, [prdId]: data.phases || [] }))
      }
    } catch (error) {
      console.error('Error fetching phases:', error)
    }
  }, [])

  // Fetch phases for all PRDs when they load
  useEffect(() => {
    prds.forEach(prd => {
      if (!prdPhases[prd.id]) {
        fetchPhasesForPRD(prd.id)
      }
    })
  }, [prds, prdPhases, fetchPhasesForPRD])

  // Calculate progress based on actual data
  const getFeatureProgress = useCallback((prd: PRD) => {
    const phases = prdPhases[prd.id] || []
    
    const hasPRD = !!prd['drive-link']
    const hasDesign = !!prd['v0-link']
    const hasPhases = phases.length > 0
    const completedPhases = phases.filter(p => p.is_complete === true).length
    
    // Calculate completion percentage
    let completedComponents = 0
    let totalComponents = 0
    
    // PRD component
    if (hasPRD) completedComponents++
    totalComponents++
    
    // Design component
    if (hasDesign) completedComponents++
    totalComponents++
    
    // Phases component
    if (hasPhases) {
      totalComponents++
      if (completedPhases === phases.length && phases.length > 0) {
        completedComponents++
      }
    }
    
    const percentage = totalComponents > 0 ? Math.round((completedComponents / totalComponents) * 100) : 0
    
    const phasesCompleted = hasPhases && completedPhases === phases.length && phases.length > 0
    
    return {
      percentage,
      hasPRD,
      hasDesign,
      hasPhases,
      phasesCompleted,
      phases,
      completedPhases,
      totalPhases: phases.length
    }
  }, [prdPhases])

  // Handle drag and drop reordering
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false)
    
    if (!result.destination) {
      return
    }

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) {
      return
    }

    // Create sorted list based on current priority_order
    const sortedPrds = [...prds].sort((a, b) => (a.roadmap?.priority_order || 0) - (b.roadmap?.priority_order || 0))
    
    // Get the item being moved
    const movedItem = sortedPrds[sourceIndex]
    
    // Remove from original position and insert at new position
    const reorderedItems = [...sortedPrds]
    reorderedItems.splice(sourceIndex, 1)
    reorderedItems.splice(destinationIndex, 0, movedItem)

    // Update priority_order for all affected items
    try {
      const updates = reorderedItems.map((prd, index) => ({
        prdId: prd.id,
        newOrder: index
      }))

      // Send batch update to API
      await Promise.all(
        updates.map(update =>
          fetch('/api/roadmap/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          })
        )
      )

      // Refetch data to reflect changes
      refetch()
    } catch (error) {
      console.error('Failed to reorder items:', error)
    }
  }, [prds, refetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="loading-spinner loading-spinner--lg"></div>
      </div>
    )
  }

  if (prds.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Layers className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">No features in roadmap yet</p>
      </div>
    )
  }

  // Sort PRDs by priority_order for consistent display
  const sortedPrds = [...prds].sort((a, b) => (a.roadmap?.priority_order || 0) - (b.roadmap?.priority_order || 0))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-poppy-primary">Feature Pipeline</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Drag to reorder priorities</span>
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
      
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="roadmap-timeline">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg p-4' : ''}`}
            >
              {sortedPrds.map((prd, index) => {
                const progress = getFeatureProgress(prd)
                
                return (
                  <Draggable key={prd.id} draggableId={prd.id.toString()} index={index}>
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`bg-white border rounded-lg transition-all ${
                          snapshot.isDragging ? 'shadow-xl z-50 opacity-90' : 'hover:shadow-md'
                        } ${index === 0 ? 'border-l-4 border-l-poppy-primary border-gray-200' : 'border-gray-200'}`}
                        style={{
                          transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                          cursor: snapshot.isDragging ? 'grabbing' : 'grab'
                        }}
                      >
                        <div className="flex">
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center justify-center w-8 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors rounded-l-lg"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <Link href={`/roadmap/feature/${prd.id}`} className="flex-1 p-4 hover:bg-gray-50 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">
                      {prd.title || `Feature #${prd.id}`}
                    </h3>
                  {prd['drive-link'] && (
                    <a
                      href={prd['drive-link']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-poppy-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  </div>
                  {prd.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {prd.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {prd.user?.split('@')[0] || 'Unknown'}
                    </span>
                    {prd.roadmap?.target_quarter && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {prd.roadmap.target_quarter}
                      </span>
                    )}
                    {prd.roadmap?.estimated_effort_points && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {prd.roadmap.estimated_effort_points} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Status indicators */}
              <div className="flex items-center gap-2 ml-4">
                <div className={`p-1 rounded ${progress.hasPRD ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className={`p-1 rounded ${progress.hasDesign ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Palette className="w-4 h-4" />
                </div>
                <div className={`p-1 rounded ${progress.phasesCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Layers className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Progress bar and metrics */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress.percentage}% complete</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              
              {/* Business metrics */}
              {(prd.roadmap?.business_value_score || prd.roadmap?.technical_complexity_score) && (
                <div className="flex items-center gap-4 mt-2">
                  {prd.roadmap?.business_value_score && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Business Value:</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < (prd.roadmap?.business_value_score || 0) ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {prd.roadmap?.technical_complexity_score && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Complexity:</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < (prd.roadmap?.technical_complexity_score || 0) ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phases breakdown (if exists) */}
            {progress.hasPhases && progress.phases.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span className="font-medium">Release Phases</span>
                  <span>{progress.completedPhases}/{progress.totalPhases} completed</span>
                </div>
                <div className="space-y-1">
                  {progress.phases.slice(0, 3).map((phase) => (
                    <div key={phase.id} className="flex items-center gap-2 text-sm">
                      {phase.is_complete === true ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={phase.is_complete === true ? 'text-green-700' : 'text-gray-600'}>
                        {phase.name}
                      </span>
                    </div>
                  ))}
                  {progress.phases.length > 3 && (
                    <div className="text-xs text-gray-500 ml-6">
                      +{progress.phases.length - 3} more phases
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {progress.hasPRD && <span className="text-green-600">✓ PRD</span>}
                {progress.hasDesign && <span className="text-green-600">✓ Design</span>}
                {progress.hasPhases && <span className="text-green-600">✓ {progress.totalPhases} Phases</span>}
              </div>
              <div className="flex items-center gap-4 text-xs">
                {prd.roadmap?.status && (
                  <Badge 
                    variant="outline" 
                    className={prd.roadmap.status === 'In Development' ? 'border-blue-500 text-blue-600' : 'border-gray-400 text-gray-600'}
                  >
                    {prd.roadmap.status}
                  </Badge>
                )}
                {getEstimatedShipDate(prd.roadmap?.target_quarter, prd.roadmap?.estimated_effort_points) && (
                  <span className="text-gray-500">
                    Est. {getEstimatedShipDate(prd.roadmap?.target_quarter, prd.roadmap?.estimated_effort_points)}
                  </span>
                )}
              </div>
            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}