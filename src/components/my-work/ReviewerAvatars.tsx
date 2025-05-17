"use client"

import { useEffect, useState } from 'react'
import { Reviewer } from '@/types/my-work'

export default function ReviewerAvatars({ prdId }: { prdId: string }) {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])

  useEffect(() => {
    const fetchReviewers = async () => {
      const res = await fetch('/api/my-work/list')
      if (res.ok) {
        const data = await res.json()
        const all = (data.prds_reviewers || []) as Reviewer[]
        setReviewers(all.filter((r) => r.prd_id === prdId))
      }
    }
    fetchReviewers()
  }, [prdId])

  return (
    <div className="flex space-x-2 mb-2">
      {reviewers.map((rev) => (
        <span key={rev.user_id} className="w-6 h-6 rounded-full bg-poppy text-white flex items-center justify-center text-xs">
          {rev.user_id.slice(0, 2).toUpperCase()}
        </span>
      ))}
    </div>
  )
}
