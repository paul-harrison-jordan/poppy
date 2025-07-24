'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PRD {
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
    roadmap_notes?: string
  }
}

interface RoadmapViewProps {
  userEmail: string
  onPRDSelect: (prdId: number) => void
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800', 
  in_review: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  on_hold: 'bg-gray-100 text-gray-800'
}

const statusIcons = {
  planned: Calendar,
  in_progress: AlertCircle,
  in_review: AlertCircle,
  shipped: CheckCircle2,
  on_hold: AlertCircle
}

export default function RoadmapView({ onPRDSelect }: RoadmapViewProps) {
  const [prds, setPRDs] = useState<PRD[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetchPRDs()
  }, [])

  const fetchPRDs = async () => {
    try {
      const response = await fetch('/api/roadmap/prds')
      if (response.ok) {
        const data = await response.json()
        setPRDs(data.sort((a: PRD, b: PRD) => {
          const aOrder = a.roadmap?.priority_order ?? 999
          const bOrder = b.roadmap?.priority_order ?? 999
          return aOrder - bOrder
        }))
      }
    } catch (error) {
      console.error('Error fetching PRDs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: {
    destination?: { index: number } | null;
    source: { index: number };
  }) => {
    if (!result.destination || !isEditing) return

    const items = Array.from(prds)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedPRDs = items.map((prd, index) => ({
      ...prd,
      roadmap: {
        ...prd.roadmap,
        priority_order: index
      }
    }))

    setPRDs(updatedPRDs)

    try {
      await fetch('/api/roadmap/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prdId: reorderedItem.id, 
          newOrder: result.destination.index 
        })
      })
    } catch (error) {
      console.error('Error updating PRD order:', error)
      fetchPRDs()
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
    return <div className="flex justify-center py-8">Loading your roadmap...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Product Roadmap</h2>
        <Button 
          variant={isEditing ? "default" : "outline"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Done Editing' : 'Edit Priority Order'}
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="roadmap">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {prds.map((prd, index) => {
                const StatusIcon = statusIcons[prd.roadmap?.status as keyof typeof statusIcons] || Calendar
                
                return (
                  <Draggable 
                    key={prd.id} 
                    draggableId={prd.id.toString()} 
                    index={index}
                    isDragDisabled={!isEditing}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`cursor-pointer transition-shadow hover:shadow-md ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        } ${isEditing ? 'border-blue-200' : ''}`}
                        onClick={() => !isEditing && onPRDSelect(prd.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {isEditing && (
                                <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </div>
                              )}
                              {extractPRDTitle(prd['drive-link'])}
                            </CardTitle>
                            {!isEditing && <ChevronRight className="w-5 h-5 text-gray-400" />}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={statusColors[prd.roadmap?.status as keyof typeof statusColors] || statusColors.planned}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {prd.roadmap?.status || 'planned'}
                            </Badge>
                            
                            {prd.roadmap?.target_quarter && (
                              <Badge variant="outline">
                                {prd.roadmap.target_quarter}
                              </Badge>
                            )}
                            
                            {prd.roadmap?.estimated_effort_points && (
                              <Badge variant="outline">
                                {prd.roadmap.estimated_effort_points} pts
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          {prd.roadmap?.roadmap_notes && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {prd.roadmap.roadmap_notes}
                            </p>
                          )}
                          
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
                            <span>Created {new Date(prd.created_at).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2 sm:gap-4">
                              {prd.roadmap?.business_value_score && (
                                <span>Value: {prd.roadmap.business_value_score}/10</span>
                              )}
                              {prd.roadmap?.technical_complexity_score && (
                                <span>Complexity: {prd.roadmap.technical_complexity_score}/10</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {prds.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No PRDs found. Create your first PRD to get started with your roadmap.</p>
        </div>
      )}
    </div>
  )
}