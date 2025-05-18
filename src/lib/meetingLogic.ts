import { Prd } from '@/types/my-work'

/**
 * Decide whether a meeting should be scheduled for a PRD based on
 * unresolved comments, time since last edit and summary text.
 */
export function shouldScheduleMeeting(prd: Prd): boolean {
  const unresolvedComments = prd.metadata?.comments?.filter(c => !c.resolved).length ?? 0
  const daysSinceEdit = prd.last_edited_at
    ? Math.ceil((Date.now() - new Date(prd.last_edited_at).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity

  const summary = prd.metadata?.open_questions_summary?.toLowerCase() || ''
  const summaryIndicatesConfusion = ['meeting', 'discuss', 'sync', 'blocked', 'alignment']
    .some(word => summary.includes(word))

  if (unresolvedComments > 10) return true
  if (unresolvedComments > 0 && daysSinceEdit > 14) return true
  if (summaryIndicatesConfusion) return true

  return false
}
