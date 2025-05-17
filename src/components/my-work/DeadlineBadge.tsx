"use client"

import { differenceInCalendarDays, parseISO } from 'date-fns'

export default function DeadlineBadge({ dueDate }: { dueDate?: string | null }) {
  if (!dueDate) return null
  const days = differenceInCalendarDays(parseISO(dueDate), new Date())
  const text = days >= 0 ? `due in ${days}d` : `${Math.abs(days)}d late`
  return <span className="text-xs text-muted-foreground">{text}</span>
}
