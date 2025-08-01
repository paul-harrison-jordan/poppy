'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RoadmapDashboard from '@/components/roadmap/RoadmapDashboard'
import CapacityPlanningView from '@/components/roadmap/CapacityPlanningView'
import CreateFeatureModal from '@/components/CreateFeatureModal'
import { 
  Calendar, 
  Users,
  Plus
} from 'lucide-react'

export default function RoadmapPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('roadmap')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
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

  const handleFeatureCreated = () => {
    // Refresh data if needed
    setShowCreateModal(false)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-poppy-primary">Product Roadmap</h1>
          <p className="text-warm-neutral mt-1">Plan and track your product features</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Feature
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-96">
          <TabsTrigger value="roadmap" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Feature Roadmap
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Capacity Planning
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roadmap" className="space-y-0">
          <RoadmapDashboard userEmail={session.user.email} />
        </TabsContent>
        
        <TabsContent value="capacity" className="space-y-0">
          <CapacityPlanningView userEmail={session.user.email} />
        </TabsContent>
      </Tabs>

      {/* Create Feature Modal */}
      <CreateFeatureModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFeatureCreated={handleFeatureCreated}
      />
    </div>
  )
}