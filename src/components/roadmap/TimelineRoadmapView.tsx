'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Target, 
  TrendingUp,
  Share2,
  Download,
  ArrowUpDown,
  ChevronRight,
  Calendar,
  BarChart3
} from 'lucide-react'

interface PRD {
  id: number
  title?: string
  description?: string
  'drive-link': string
  'v0-link'?: string
  user: string
  shipped: boolean
  created_at: string
  roadmap?: {
    priority_order?: number
    status?: string
    target_quarter?: string
    estimated_effort_points?: number
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
    dependencies?: string[]
  }
}

interface TimelineRoadmapViewProps {
  userEmail: string
  onPRDSelect: (prdId: number) => void
  stakeholderView?: 'pm' | 'engineering' | 'marketing' | 'sales' | 'executive'
  defaultView?: 'priority' | 'months' | 'quarters'
}

type ViewMode = 'quarters' | 'months' | 'priority'

const statusColors = {
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
  in_review: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
}

const priorityColors = {
  1: 'bg-red-50 border-red-200',
  2: 'bg-orange-50 border-orange-200', 
  3: 'bg-yellow-50 border-yellow-200',
  4: 'bg-blue-50 border-blue-200',
  5: 'bg-gray-50 border-gray-200'
}

export default function TimelineRoadmapView({ userEmail, onPRDSelect, stakeholderView = 'pm', defaultView = 'quarters' }: TimelineRoadmapViewProps) {
  const [prds, setPRDs] = useState<PRD[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView as ViewMode)


  // Generate quarters for the next 2 years
  const generateQuarters = () => {
    const quarters = []
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year <= currentYear + 1; year++) {
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${year}`)
      }
    }
    return quarters
  }

  const quarters = generateQuarters()

  useEffect(() => {
    fetchPRDs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPRDs = async () => {
    try {
      const response = await fetch('/api/roadmap/prds')
      if (response.ok) {
        const data = await response.json()
        const filteredData = getFilteredPRDs(data)
        setPRDs(filteredData.sort((a: PRD, b: PRD) => 
          (a.roadmap?.priority_order || 999) - (b.roadmap?.priority_order || 999)
        ))
      }
    } catch (error) {
      console.error('Error fetching PRDs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination } = result
    
    // Handle different drop scenarios
    if (viewMode === 'priority') {
      // Priority reordering (existing functionality)
      const items = Array.from(prds)
      const [reorderedItem] = items.splice(source.index, 1)
      items.splice(destination.index, 0, reorderedItem)

      // Update priority orders
      const updatedItems = items.map((item, index) => ({
        ...item,
        roadmap: { ...item.roadmap, priority_order: index + 1 }
      }))

      setPRDs(updatedItems)

      // Save to backend
      try {
        await fetch(`/api/roadmap/prd/${reorderedItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority_order: destination.index + 1 })
        })
      } catch (error) {
        console.error('Error updating priority:', error)
      }
    } else if (viewMode === 'quarters') {
      // Quarter column drag and drop
      const sourceQuarter = source.droppableId.replace('quarter-', '')
      const destQuarter = destination.droppableId.replace('quarter-', '')
      
      if (sourceQuarter !== destQuarter) {
        // Moving between quarters
        const draggedPRD = prds.find(prd => prd.id.toString() === result.draggableId)
        if (draggedPRD) {
          const updatedPRDs = prds.map(prd => 
            prd.id === draggedPRD.id 
              ? { ...prd, roadmap: { ...prd.roadmap, target_quarter: destQuarter } }
              : prd
          )
          setPRDs(updatedPRDs)
          
          // Save to backend
          try {
            await fetch(`/api/roadmap/prd/${draggedPRD.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target_quarter: destQuarter })
            })
          } catch (error) {
            console.error('Error updating quarter:', error)
          }
        }
      }
    }
  }

  const getQuarterPRDs = (quarter: string) => {
    return prds.filter(prd => prd.roadmap?.target_quarter === quarter)
  }

  const getPriorityTier = (priority: number) => {
    if (priority <= 2) return 1 // P0/P1
    if (priority <= 5) return 2 // P2-P5
    if (priority <= 10) return 3 // P6-P10
    if (priority <= 20) return 4 // P11-P20
    return 5 // P21+
  }

  // Filter features based on stakeholder view
  const getFilteredPRDs = (allPRDs: PRD[]) => {
    switch (stakeholderView) {
      case 'engineering':
        // Focus on technical complexity, effort, and implementation details
        return allPRDs.filter(prd => 
          prd.roadmap?.status === 'planned' || prd.roadmap?.status === 'in_progress'
        )
      case 'marketing':
        // Focus on customer-facing features and go-to-market timing
        return allPRDs.filter(prd => 
          prd.roadmap?.business_value_score && prd.roadmap.business_value_score >= 6
        )
      case 'sales':
        // Focus on revenue-impacting features and competitive advantages
        return allPRDs.filter(prd => 
          prd.roadmap?.business_value_score && prd.roadmap.business_value_score >= 7
        )
      case 'executive':
        // Focus on strategic initiatives and high-impact features
        return allPRDs.filter(prd => 
          prd.roadmap?.business_value_score && prd.roadmap.business_value_score >= 8 ||
          (prd.roadmap?.priority_order && prd.roadmap.priority_order <= 5)
        )
      default:
        return allPRDs
    }
  }

  const shareLinkToClipboard = () => {
    const url = `${window.location.origin}/roadmap?shared=${userEmail}`
    navigator.clipboard.writeText(url)
    // Could add a toast notification here
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Roadmap</h2>
          <p className="text-gray-600">Manage feature prioritization and delivery timeline</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setViewMode('priority')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                viewMode === 'priority' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArrowUpDown className="w-4 h-4 mr-1 inline" />
              Priority
            </button>
            <button
              onClick={() => setViewMode('months')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'months' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4 mr-1 inline" />
              Monthly
            </button>
            <button
              onClick={() => setViewMode('quarters')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                viewMode === 'quarters' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-1 inline" />
              Quarterly
            </button>
          </div>

          {/* Action buttons */}
          <Button onClick={shareLinkToClipboard} variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Conditional View Rendering */}
      {viewMode === 'priority' ? (
        // Priority Stack Ranking View
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Feature Priority Stack Rank</h3>
              <div className="text-sm text-gray-600">
                Drag to reorder • Higher = More important
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="priority-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {prds.map((prd, index) => (
                      <Draggable key={prd.id} draggableId={prd.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              snapshot.isDragging 
                                ? 'shadow-lg bg-blue-50 border-blue-300' 
                                : `${priorityColors[getPriorityTier(index + 1)]} hover:shadow-md`
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="text-lg font-bold text-gray-500">
                                    #{index + 1}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    index < 2 ? 'bg-red-100 text-red-800' :
                                    index < 5 ? 'bg-orange-100 text-orange-800' :
                                    index < 10 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    P{index}
                                  </div>
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {prd.title || `PRD #${prd.id}`}
                                  </h4>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {prd.description || prd.roadmap?.roadmap_notes || 'No description available'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  {prd.roadmap?.business_value_score && (
                                    <div className="flex items-center gap-1">
                                      <Target className="w-4 h-4" />
                                      <span>Value: {prd.roadmap.business_value_score}/10</span>
                                    </div>
                                  )}
                                  
                                  {prd.roadmap?.estimated_effort_points && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      <span>{prd.roadmap.estimated_effort_points} pts</span>
                                    </div>
                                  )}

                                  {prd.roadmap?.target_quarter && (
                                    <Badge variant="outline" className="ml-2">
                                      {prd.roadmap.target_quarter}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={statusColors[prd.roadmap?.status as keyof typeof statusColors] || statusColors.planned}
                                >
                                  {prd.roadmap?.status || 'planned'}
                                </Badge>
                                
                                <Button 
                                  onClick={() => onPRDSelect(prd.id)}
                                  variant="ghost" 
                                  size="sm"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      ) : viewMode === 'quarters' ? (
        // Clean Timeline View
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {quarters.map((quarter) => {
              const quarterPRDs = getQuarterPRDs(quarter)

              return (
                <Card key={quarter} className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-800">{quarter}</CardTitle>
                      <Badge variant="outline" className="text-xs">{quarterPRDs.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId={`quarter-${quarter}`}>
                      {(provided, snapshot) => (
                        <div 
                          {...provided.droppableProps} 
                          ref={provided.innerRef}
                          className={`space-y-3 min-h-[200px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
                          }`}
                        >
                          {quarterPRDs.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                              No features planned
                            </div>
                          ) : (
                            quarterPRDs.map((prd, index) => (
                              <Draggable key={prd.id} draggableId={prd.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => onPRDSelect(prd.id)}
                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                      snapshot.isDragging 
                                        ? 'shadow-lg bg-white border-blue-300 rotate-2' 
                                        : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-medium text-sm line-clamp-2">
                                        {prd.title || `PRD #${prd.id}`}
                                      </h4>
                                      <Badge 
                                        className={statusColors[prd.roadmap?.status as keyof typeof statusColors] || statusColors.planned}
                                      >
                                        {prd.roadmap?.status || 'planned'}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <span>P{prd.roadmap?.priority_order || '?'}</span>
                                        {prd.roadmap?.estimated_effort_points && (
                                          <span>{prd.roadmap.estimated_effort_points}pts</span>
                                        )}
                                      </div>
                                      {prd.roadmap?.business_value_score && (
                                        <div className="flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3" />
                                          <span>{prd.roadmap.business_value_score}/10</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">View mode not supported</p>
        </div>
      )}
    </div>
  )
}