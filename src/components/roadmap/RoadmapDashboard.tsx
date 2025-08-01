'use client'

import { useState, useEffect } from 'react'
// import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SimpleRoadmapTimeline from './SimpleRoadmapTimeline'
import { useRoadmapPRDs } from '@/hooks/useRoadmapData'
import { 
  Share2, 
  Download, 
  Calendar,
  Users,
  BarChart3,
  CheckCircle2,
  Clock
} from 'lucide-react'

interface RoadmapDashboardProps {
  userEmail: string
}


export default function RoadmapDashboard({ userEmail }: RoadmapDashboardProps) {
  const [availableUsers, setAvailableUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string>(userEmail)
  const [loadingUsers, setLoadingUsers] = useState(true)

  
  // Use shared hook for fetching PRDs
  const { prds, loading, refetch: fetchRoadmap } = useRoadmapPRDs(selectedUser)

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

  useEffect(() => {
    fetchAvailableUsers()
  }, [])

  // Listen for PRD updates to refresh roadmap
  useEffect(() => {
    const handlePRDUpdate = () => {
      fetchRoadmap()
    }

    window.addEventListener('savedPRDUpdated', handlePRDUpdate)
    window.addEventListener('prdCountUpdated', handlePRDUpdate)

    return () => {
      window.removeEventListener('savedPRDUpdated', handlePRDUpdate)
      window.removeEventListener('prdCountUpdated', handlePRDUpdate)
    }
  }, [fetchRoadmap])





  const handleShare = async () => {
    const url = `${window.location.origin}/roadmap/shared?user=${encodeURIComponent(selectedUser)}`
    await navigator.clipboard.writeText(url)
    // Could add a toast notification here
  }

  const handleExport = () => {
    window.open(`/api/roadmap/export?format=csv&user=${encodeURIComponent(selectedUser)}`, '_blank')
  }




  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner loading-spinner--lg"></div>
          <span className="text-warm-neutral text-sm">Loading roadmap data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Simplified Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Roadmap</h1>
            <p className="text-gray-600 mt-1">
              {selectedUser === userEmail ? 'Your features' : `${selectedUser.split('@')[0]}'s features`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedUser} onValueChange={setSelectedUser} disabled={loadingUsers}>
              <SelectTrigger className="w-52">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <SelectValue placeholder="Select PM..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <div className="p-4 text-center text-gray-500">Loading team...</div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No team members found</div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      <div className="flex items-center gap-2">
                        <span>{user}</span>
                        {user === userEmail && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Features</p>
              <p className="text-2xl font-bold text-gray-900">{prds.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {prds.filter(p => !p.shipped && p.roadmap?.assigned_engineer && p.roadmap?.assigned_engineer !== 'unassigned').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Shipped</p>
              <p className="text-2xl font-bold text-gray-900">{prds.filter(p => p.shipped).length}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Quarter</p>
              <p className="text-2xl font-bold text-gray-900">
                {prds.filter(p => {
                  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`
                  return p.roadmap?.target_quarter === currentQuarter
                }).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>


      {/* Upcoming Features Highlight */}
      {prds.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Shipping Soon</h2>
            <span className="text-sm text-gray-500">Next 30 days</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {prds
              .filter(prd => {
                if (!prd.roadmap?.release_date) return false
                const releaseDate = new Date(prd.roadmap.release_date)
                const today = new Date()
                const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
                return releaseDate >= today && releaseDate <= thirtyDaysFromNow
              })
              .slice(0, 3)
              .map(prd => (
                <div key={prd.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {prd.title || `Feature #${prd.id}`}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {new Date(prd.roadmap?.release_date || '').toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {prd.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {prd.roadmap?.assigned_engineer && prd.roadmap?.assigned_engineer !== 'unassigned' ? 
                        prd.roadmap.assigned_engineer.split('@')[0] : 
                        'Unassigned'
                      }
                    </span>
                    <Badge 
                      variant={prd.roadmap?.status === 'In Progress' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {prd.roadmap?.status || 'Planning'}
                    </Badge>
                  </div>
                </div>
              ))}
            {prds.filter(prd => {
              if (!prd.roadmap?.release_date) return false
              const releaseDate = new Date(prd.roadmap.release_date)
              const today = new Date()
              const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
              return releaseDate >= today && releaseDate <= thirtyDaysFromNow
            }).length === 0 && (
              <div className="col-span-3 text-center py-8 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No features scheduled for the next 30 days</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Feature Pipeline */}
      <SimpleRoadmapTimeline 
        userEmail={selectedUser} 
      />

      {/* Empty State */}
      {prds.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No features yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first feature to start building your product roadmap.
          </p>
        </div>
      )}
    </div>
  )
}