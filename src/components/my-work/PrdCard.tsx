"use client"

import { Prd } from '@/types/my-work'
import DeadlineBadge from './DeadlineBadge'
import ReviewerAvatars from './ReviewerAvatars'
import TaskList from './TaskList'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function PrdCard({ prd }: { prd: Prd }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{prd.title}</span>
          <DeadlineBadge dueDate={prd.due_date} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReviewerAvatars prdId={prd.id} />
        <TaskList prdId={prd.id} />
      </CardContent>
    </Card>
  )
}
