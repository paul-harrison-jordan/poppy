import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import SharedRoadmapView from './SharedRoadmapView'

interface SearchParams {
  user?: string
}

export default async function SharedRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const userEmail = params.user
  
  if (!userEmail) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading roadmap...</div>}>
        <SharedRoadmapView userEmail={userEmail} />
      </Suspense>
    </div>
  )
} 