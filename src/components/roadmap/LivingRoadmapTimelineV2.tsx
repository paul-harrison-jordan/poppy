'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRoadmapPRDs, getPRDStatus, type PRD } from '@/hooks/useRoadmapData'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Users,
  FileText,
  Palette,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle
} from 'lucide-react'

interface Phase {
  id: number
  name: string
  description: string
  customer_value?: string
  is_complete?: boolean
  priority: number
}

interface Engineer {
  id: number
  name: string
  email: string
  role?: string
}

interface LivingRoadmapTimelineProps {
  userEmail: string
  onItemSelect: (id: number) => void
}

const statusColors = {
  planned: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500' },
  in_progress: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', accent: 'bg-yellow-500' },
  in_review: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'bg-purple-500' },
  shipped: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', accent: 'bg-green-500' },
  on_hold: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'bg-gray-500' }
}

export default function LivingRoadmapTimelineV2({ userEmail }: LivingRoadmapTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [prdPhases, setPrdPhases] = useState<{ [key: number]: Phase[] }>({})
  const [prdEngineers] = useState<{ [key: number]: Engineer[] }>({})
  
  // Use shared hook for fetching PRDs
  const { prds, loading } = useRoadmapPRDs(userEmail)

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

  // Fetch engineers for a PRD - commented out until endpoint is available
  const fetchEngineersForPRD = useCallback(async (prdId: number) => {
    // TODO: Implement engineers endpoint
    // For now, we'll use the assigned_engineers_count from the PRD data
    void prdId // Acknowledge parameter but don't use it yet
    return
  }, [])

  // Fetch phases and engineers for all PRDs when they load
  useEffect(() => {
    prds.forEach(prd => {
      if (!prdPhases[prd.id]) {
        fetchPhasesForPRD(prd.id)
      }
      if (!prdEngineers[prd.id]) {
        fetchEngineersForPRD(prd.id)
      }
    })
  }, [prds, prdPhases, prdEngineers, fetchPhasesForPRD, fetchEngineersForPRD])

  // Calculate real progress based on actual data
  const getProgress = useCallback((prd: PRD) => {
    const phases = prdPhases[prd.id] || []
    
    // Check what we have completed
    const hasPRD = true // We always have a PRD if it's in the list
    const hasDesign = !!prd['v0-link']
    const phasesCompleted = phases.filter(p => p.is_complete).length
    const totalPhases = phases.length
    
    // Calculate progress percentage
    const progressItems = [
      { name: 'PRD Created', complete: hasPRD },
      { name: 'Design Prototype', complete: hasDesign },
    ]
    
    if (totalPhases > 0) {
      progressItems.push({
        name: `Phases (${phasesCompleted}/${totalPhases})`,
        complete: phasesCompleted === totalPhases && totalPhases > 0
      })
    }
    
    const completedItems = progressItems.filter(item => item.complete).length
    const percentage = Math.round((completedItems / Math.max(progressItems.length, 3)) * 100)
    
    return {
      percentage,
      hasPRD,
      hasDesign,
      phasesCompleted,
      totalPhases,
      progressItems
    }
  }, [prdPhases])

  const toggleItemExpansion = (itemId: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const renderTimelineItem = (prd: PRD, index: number) => {
    const isExpanded = expandedItems.has(prd.id)
    const status = getPRDStatus(prd)
    const colors = statusColors[status as keyof typeof statusColors] || statusColors.planned
    const progress = getProgress(prd)
    const phases = prdPhases[prd.id] || []
    // const engineers = prdEngineers[prd.id] || []

    return (
      <motion.div
        key={prd.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="relative mb-6"
      >
        {/* Timeline connector */}
        {index < prds.length - 1 && (
          <div className="absolute left-6 top-20 w-0.5 h-full bg-gray-200 z-0" />
        )}

        <Card className={`transition-all duration-300 hover:shadow-lg border-l-4 ${colors.border}`}>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div className="relative mt-1">
                <div className={`w-3 h-3 rounded-full ${colors.accent} relative z-10`} />
              </div>

              <div className="flex-1 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg font-semibold">
                        {prd.title || `Feature #${prd.id}`}
                      </CardTitle>
                      <Badge className={`${colors.bg} ${colors.text} ${colors.border} border text-xs`}>
                        {status.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.location.href = `/roadmap/feature/${prd.id}`}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-poppy"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Description */}
                    {prd.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {prd.description}
                      </p>
                    )}

                    {/* Progress section */}
                    <div className="space-y-3">
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <Progress value={progress.percentage} className="flex-1 h-2" />
                        <span className="text-sm font-medium text-gray-600">
                          {progress.percentage}%
                        </span>
                      </div>

                      {/* Key elements status */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          {progress.hasPRD ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-700">PRD</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {progress.hasDesign ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <Palette className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-700">Design</span>
                        </div>
                        
                        {phases.length > 0 && (
                          <div className="flex items-center gap-2">
                            {progress.phasesCompleted === progress.totalPhases && progress.totalPhases > 0 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                            <Layers className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-700">
                              Phases ({progress.phasesCompleted}/{progress.totalPhases})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Engineers assigned */}
                      {(prd.assigned_engineers_count || 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">
                            {prd.assigned_engineers_count} engineer{prd.assigned_engineers_count !== 1 ? 's' : ''} assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleItemExpansion(prd.id)}
                    className="ml-4"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Expanded content */}
          {isExpanded && (
            <CardContent className="pt-0">
              <div className="ml-7 space-y-4">
                {/* Phases breakdown */}
                {phases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Release Phases</h4>
                    <div className="space-y-2">
                      {phases.map((phase, idx) => (
                        <div key={phase.id} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5">
                            {phase.is_complete ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-700">
                              Phase {idx + 1}: {phase.name}
                            </div>
                            {phase.description && (
                              <p className="text-gray-600 mt-1">{phase.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="flex gap-4 pt-2">
                  <a
                    href={prd['drive-link']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-poppy hover:text-poppy/80"
                  >
                    <FileText className="w-4 h-4" />
                    View PRD
                  </a>
                  {prd['v0-link'] && (
                    <a
                      href={prd['v0-link']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-poppy hover:text-poppy/80"
                    >
                      <Palette className="w-4 h-4" />
                      View Design
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          )}
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
    <div className="relative">
      {prds.map((prd, index) => renderTimelineItem(prd, index))}
      
      {prds.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No features in the roadmap yet
        </div>
      )}
    </div>
  )
}