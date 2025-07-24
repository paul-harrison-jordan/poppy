'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import RoadmapDashboard from '@/components/roadmap/RoadmapDashboard'

export default function RoadmapPage() {
  const { data: session, status } = useSession()
  
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
      <RoadmapDashboard userEmail={session.user.email} />
    </div>
  )
}