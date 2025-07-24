'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Target, 
  Clock, 
  Users, 
  Download,
  Share2,
  RefreshCw
} from 'lucide-react'

interface RoadmapItem {
  id: number
  title: string
  description: string
  roadmap: {
    priority_order: number
    status: string
    target_quarter?: string
    estimated_effort_points?: number
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
  }
  created_at: string
}

interface RoadmapMetadata {
  user: string
  last_updated: string
  total_features: number
  quarters_planned: string[]
  shared_at: string
}

interface SharedRoadmapViewProps {
  userEmail: string
}

const statusColors = {
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
  in_review: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200'
}

const statusLabels = {
  planned: 'Planned',
  in_progress: 'In Progress',
  in_review: 'In Review',
  shipped: 'Shipped',
  on_hold: 'On Hold'
}

export default function SharedRoadmapView({ userEmail }: SharedRoadmapViewProps) {
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([])
  const [metadata, setMetadata] = useState<RoadmapMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedRoadmap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail])

  const fetchSharedRoadmap = async () => {
    try {
      const response = await fetch(`/api/roadmap/share?user=${encodeURIComponent(userEmail)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch roadmap')
      }
      
      const data = await response.json()
      setRoadmap(data.roadmap || [])
      setMetadata(data.metadata)
    } catch (error) {
      console.error('Error fetching shared roadmap:', error)
      setError('Failed to load roadmap')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    // Could add toast notification here
  }

  const handleExport = () => {
    window.open(`/api/roadmap/export?format=csv&user=${encodeURIComponent(userEmail)}`, '_blank')
  }

  const getQuarterFeatures = (quarter: string) => {
    return roadmap.filter(item => item.roadmap.target_quarter === quarter)
  }

  const getStatusCounts = () => {
    return roadmap.reduce((acc, item) => {
      const status = item.roadmap.status
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const getHighPriorityFeatures = () => {
    return roadmap
      .filter(item => item.roadmap.priority_order <= 5)
      .sort((a, b) => a.roadmap.priority_order - b.roadmap.priority_order)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold">{error}</div>
          <p className="text-gray-600 mt-2">Please check the roadmap link and try again.</p>
        </div>
      </div>
    )
  }

  const statusCounts = getStatusCounts()
  const highPriorityFeatures = getHighPriorityFeatures()
  const totalEffort = roadmap.reduce((sum, item) => sum + (item.roadmap.estimated_effort_points || 0), 0)
  const avgBusinessValue = roadmap.length > 0 
    ? roadmap.reduce((sum, item) => sum + (item.roadmap.business_value_score || 0), 0) / roadmap.length
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                             {metadata?.user}&apos;s Product Roadmap
            </h1>
            <p className="text-xl text-gray-600 mt-2">
              Strategic product development timeline and priorities
            </p>
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Last updated {metadata?.last_updated ? new Date(metadata.last_updated).toLocaleDateString() : 'Recently'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Shared roadmap</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={handleShare} variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share Link
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Features</p>
                <p className="text-3xl font-bold text-blue-900">{metadata?.total_features || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <span>{metadata?.quarters_planned?.length || 0} quarters planned</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">In Progress</p>
                <p className="text-3xl font-bold text-green-900">{statusCounts.in_progress || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
              <span>{statusCounts.shipped || 0} shipped</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Effort</p>
                <p className="text-3xl font-bold text-purple-900">{totalEffort}</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-purple-600">
              <span>story points</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Avg Value Score</p>
                <p className="text-3xl font-bold text-orange-900">{avgBusinessValue.toFixed(1)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-orange-600">
              <span>out of 10</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Top Priority Features</CardTitle>
          <p className="text-gray-600">Our highest impact initiatives for the near term</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {highPriorityFeatures.map((feature) => (
              <div key={feature.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                        P{feature.roadmap.priority_order}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                      <Badge className={statusColors[feature.roadmap.status as keyof typeof statusColors]}>
                        {statusLabels[feature.roadmap.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{feature.description}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      {feature.roadmap.target_quarter && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Target: {feature.roadmap.target_quarter}</span>
                        </div>
                      )}
                      {feature.roadmap.business_value_score && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>Value: {feature.roadmap.business_value_score}/10</span>
                        </div>
                      )}
                      {feature.roadmap.estimated_effort_points && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>Effort: {feature.roadmap.estimated_effort_points} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quarterly Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Quarterly Timeline</CardTitle>
          <p className="text-gray-600">Feature delivery schedule by quarter</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {metadata?.quarters_planned?.map((quarter) => {
              const quarterFeatures = getQuarterFeatures(quarter)
              const quarterEffort = quarterFeatures.reduce((sum, f) => sum + (f.roadmap.estimated_effort_points || 0), 0)
              
              return (
                <Card key={quarter} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{quarter}</CardTitle>
                      <Badge variant="outline">{quarterFeatures.length} features</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {quarterEffort} story points
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quarterFeatures.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No features planned
                      </div>
                    ) : (
                      quarterFeatures.map((feature) => (
                        <div key={feature.id} className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {feature.title}
                          </h4>
                          <div className="flex items-center justify-between text-xs">
                            <Badge className={statusColors[feature.roadmap.status as keyof typeof statusColors]}>
                              {statusLabels[feature.roadmap.status as keyof typeof statusLabels]}
                            </Badge>
                            {feature.roadmap.business_value_score && (
                              <span className="text-gray-500">
                                Value: {feature.roadmap.business_value_score}/10
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>This roadmap was shared on {metadata?.shared_at ? new Date(metadata.shared_at).toLocaleDateString() : 'recently'}</p>
        <p className="mt-1">Built with ❤️ using ChatPRD</p>
      </div>
    </div>
  )
} 