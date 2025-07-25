'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RoadmapDashboard from '@/components/roadmap/RoadmapDashboard'
import CapacityPlanningView from '@/components/roadmap/CapacityPlanningView'
import { 
  Calendar, 
  Users
} from 'lucide-react'

export default function RoadmapPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('roadmap')
  
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

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
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
    </div>
  )
}