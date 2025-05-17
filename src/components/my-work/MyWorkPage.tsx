"use client"

import { useEffect, useState } from 'react'
import { Prd } from '@/types/my-work'
import PrdCard from './PrdCard'

export default function MyWorkPage() {
  const [prds, setPrds] = useState<Prd[]>([])

  useEffect(() => {
    const fetchPrds = async () => {
      const res = await fetch('/api/my-work/list')
      if (res.ok) {
        const data = await res.json()
        setPrds(data.prds as Prd[])
      }
    }
    fetchPrds()
  }, [])

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {prds.map(prd => (
        <PrdCard key={prd.id} prd={prd} />
      ))}
      {prds.length === 0 && (
        <p className="text-center col-span-full text-muted-foreground">No PRDs yet</p>
      )}
    </div>
  )
}
