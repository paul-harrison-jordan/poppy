import { Suspense } from 'react'
import FeatureHub from '@/components/shared/FeatureHub'
import { Metadata } from 'next'

interface FeaturePageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    public?: string
  }>
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
  const { id } = await params
  // In a real app, you'd fetch the feature data here
  return {
    title: `Feature Hub - ${id}`,
    description: 'Single pane of truth for feature development and stakeholder communication',
    openGraph: {
      title: `Feature Hub - ${id}`,
      description: 'Live feature development dashboard with real-time updates',
      type: 'website',
    },
  }
}

export default async function FeaturePage({ params, searchParams }: FeaturePageProps) {
  const { id } = await params
  const { public: isPublicParam } = await searchParams
  const isPublic = isPublicParam === 'true'

  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poppy"></div>
        </div>
      }
    >
      <FeatureHub featureId={id} isPublic={isPublic} />
    </Suspense>
  )
}