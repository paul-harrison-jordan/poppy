'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import FeatureDetailView from './FeatureDetailView'

interface Params {
  id: string
}

export default function FeatureDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { data: session, status } = useSession()
  const [featureId, setFeatureId] = React.useState<number | null>(null)
  
  React.useEffect(() => {
    params.then(resolvedParams => {
      const id = parseInt(resolvedParams.id)
      if (isNaN(id)) {
        notFound()
      }
      setFeatureId(id)
    })
  }, [params])
  
  // Handle loading states after all hooks are called
  if (status === 'loading' || featureId === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-primary animate-pulse font-sans">Loading...</div>
      </div>
    )
  }
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  return <FeatureDetailView featureId={featureId} currentUserEmail={session.user.email} />
} 