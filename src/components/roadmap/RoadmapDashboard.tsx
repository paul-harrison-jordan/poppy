'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LivingRoadmapTimeline from './LivingRoadmapTimeline'
import { useRoadmapPRDs } from '@/hooks/useRoadmapData'
import { 
  Share2, 
  Download, 
  Calendar,
  Sparkles,
  Users,
  Filter,
  BarChart3
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

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-poppy/5 border-poppy/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-poppy">Total Features</p>
                <p className="text-2xl font-bold text-poppy">{prds.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-poppy" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50/80 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Active User</p>
                <p className="text-lg font-bold text-blue-900 truncate">{selectedUser.split('@')[0]}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
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

      {/* Living Timeline View */}
      <LivingRoadmapTimeline 
        userEmail={selectedUser} 
                    onItemSelect={() => {}}
      />

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