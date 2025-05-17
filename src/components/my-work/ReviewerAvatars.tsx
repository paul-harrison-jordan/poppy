"use client"

import { Reviewer } from '@/types/my-work'

export default function ReviewerAvatars({ reviewers }: { reviewers: Reviewer[] }) {
  return (
    <div className="flex space-x-2 mb-2">
      {reviewers.map((rev) => (
        <span
          key={rev.user_id}
          className="w-6 h-6 rounded-full bg-poppy text-white flex items-center justify-center text-xs"
        >
          {rev.user_id.slice(0, 2).toUpperCase()}
        </span>
      ))}
    </div>
  )
}
