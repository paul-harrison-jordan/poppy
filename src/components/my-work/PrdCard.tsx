"use client"

import { useState, useEffect, useCallback } from 'react'
import { shouldScheduleMeeting } from '@/lib/meetingLogic'
import { Prd } from '@/types/my-work'
import DeadlineBadge from './DeadlineBadge'
import ReviewerAvatars from './ReviewerAvatars'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MessageSquare, Lightbulb, Expand, ExternalLink, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import PrdModal from './PrdModal'


export default function PrdCard({
  prd,
  loadSummary,
  category
}: {
  prd: Prd
  loadSummary: () => Promise<string | undefined>
  category: string
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [summary, setSummary] = useState<string | undefined>(
    prd.metadata?.open_questions_summary
  )
  const [needsMeeting, setNeedsMeeting] = useState(false)
  const [schedulingStatus, setSchedulingStatus] = useState<'idle' | 'finding-times' | 'creating-event' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([])
  const [scheduledMeeting, setScheduledMeeting] = useState<{ start: string; end: string } | null>(null)

  const ensureSummary = useCallback(async (): Promise<string | undefined> => {
    if (summary) return summary
    const s = await loadSummary()
    if (s) setSummary(s)
    return s
  }, [summary, loadSummary])

  const findAvailableTimes = useCallback(async () => {
    try {
      setSchedulingStatus('finding-times')
      setErrorMessage('')

      // Get unique commenter emails
      const attendeeEmails = [...new Set(prd.metadata?.comments?.map(c => c.user_id) || [])]
      
      // Find available meeting times
      const availabilityResponse = await fetch('/api/google-calendar/find-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: attendeeEmails,
          duration: 30, // 30 minute meeting
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next 7 days
        }),
      })

      if (!availabilityResponse.ok) {
        const errorData = await availabilityResponse.json();
        throw new Error(
          errorData.errorDetails || 
          errorData.error || 
          'Failed to find available meeting times'
        );
      }

      const { availableSlots: slots } = await availabilityResponse.json()
      
      if (!slots?.length) {
        setErrorMessage('No available meeting times found in the next 7 days')
        setSchedulingStatus('error')
        return
      }

      // Take at most 3 slots
      setAvailableSlots(slots.slice(0, 3))
      setSchedulingStatus('idle')
    } catch (error) {
      console.error('Error finding meeting times:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to find meeting times')
      setSchedulingStatus('error')
    }
  }, [prd.metadata?.comments])

  useEffect(() => {
    if (!summary) {
      void ensureSummary()
    }
  }, [summary, ensureSummary])

  useEffect(() => {
    if (summary !== undefined) {
      void (async () => {
        const result = await shouldScheduleMeeting(prd)
        setNeedsMeeting(result)
        if (result) {
          // Automatically find available times when a meeting is needed
          await findAvailableTimes()
        }
      })()
    }
  }, [summary, prd, findAvailableTimes])

  const getDaysSinceLastEdit = () => {
    if (!prd.last_edited_at) return null;
    const lastEdit = new Date(prd.last_edited_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastEdit.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysSinceEdit = getDaysSinceLastEdit();

  const handleScheduleMeeting = async (slot: { start: string; end: string }) => {
    try {
      setSchedulingStatus('creating-event')
      setErrorMessage('')

      // Get unique commenter emails
      const attendeeEmails = [...new Set(prd.metadata?.comments?.map(c => c.user_id) || [])]
      
      // Create the calendar event
      const response = await fetch('/api/google-calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `PRD Discussion: ${prd.title}`,
          attendees: attendeeEmails,
          start: slot.start,
          end: slot.end,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create calendar event')
      }
      
      setSchedulingStatus('success')
      setAvailableSlots([])
      setScheduledMeeting(slot)
    } catch (error) {
      console.error('Error scheduling meeting:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to schedule meeting')
      setSchedulingStatus('error')
    }
  }

  const getCommentStats = () => {
    if (!prd.metadata?.comments) return { total: 0, unresolved: 0, uniqueCommenters: 0, threads: 0, openThreads: 0 }
    
    const comments = prd.metadata.comments
    const mainComments = comments.filter(c => !c.is_reply)
    const replies = comments.filter(c => c.is_reply)
    
    // Count unique commenters
    const uniqueCommenters = new Set(comments.map(c => c.user_id)).size
    
    // Count open threads (a thread is open if either the main comment or any of its replies are unresolved)
    const openThreads = mainComments.filter(mainComment => {
      const threadReplies = replies.filter(reply => reply.parent_id === mainComment.id)
      return !mainComment.resolved || threadReplies.some(reply => !reply.resolved)
    }).length
    
    // Count total unresolved comments
    const unresolved = comments.filter(c => !c.resolved).length
    
    return {
      total: comments.length,
      unresolved,
      uniqueCommenters,
      threads: mainComments.length,
      openThreads
    }
  }

  const getSpiciestThread = () => {
    if (!prd.metadata?.comments) {
      console.log('No comments found in metadata')
      return null
    }
    
    const comments = prd.metadata.comments
    console.log('Total comments:', comments.length)
    
    const mainComments = comments.filter(c => !c.is_reply)
    const replies = comments.filter(c => c.is_reply)
    console.log('Main comments:', mainComments.length)
    console.log('Replies:', replies.length)
    
    // Find the thread with the most comments
    const threadStats = mainComments.map(mainComment => {
      const threadReplies = replies.filter(reply => reply.parent_id === mainComment.id)
      const allThreadComments = [mainComment, ...threadReplies]
      const contributors = new Set(allThreadComments.map(c => c.user_id))
      
      return {
        mainComment,
        replyCount: threadReplies.length,
        totalComments: allThreadComments.length,
        contributors: contributors.size,
        lastComment: allThreadComments.reduce((latest, current) => 
          new Date(current.created_at) > new Date(latest.created_at) ? current : latest
        )
      }
    })
    
    // Sort by total comments and get the thread with the most comments
    const spiciestThread = threadStats
      .sort((a, b) => b.totalComments - a.totalComments)[0]
    
    console.log('Thread stats:', threadStats)
    console.log('Spiciest thread:', spiciestThread)
    
    return spiciestThread
  }

  const commentStats = getCommentStats()
  const spiciestThread = getSpiciestThread()

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'at-risk':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'blocked':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'needs-review':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'ready-for-review':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'inactive':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'at-risk':
        return 'At Risk'
      case 'blocked':
        return 'Blocked'
      case 'needs-review':
        return 'Needs Review'
      case 'ready-for-review':
        return 'Ready for Review'
      case 'in-progress':
        return 'In Progress'
      case 'active':
        return 'Active'
      case 'inactive':
        return 'Inactive'
      default:
        return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <Card
          className="bg-white border border-gray-200 hover:border-poppy-100 hover:shadow-lg hover:shadow-poppy-50/50 transition-all duration-200"
          onClick={() => {
            const next = !isExpanded
            setIsExpanded(next)
            if (next) ensureSummary()
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                    {prd.title}
                  </CardTitle>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getCategoryColor(category)}`}>
                    {getCategoryLabel(category)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <DeadlineBadge dueDate={prd.due_date} />
                  <span className="text-sm text-gray-500">
                    {daysSinceEdit === 0 
                      ? "Edited today" 
                      : daysSinceEdit === 1 
                        ? "Edited yesterday" 
                        : `Edited ${daysSinceEdit} days ago`}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async (e) => {
                  e.stopPropagation()
                  await ensureSummary()
                  setIsModalOpen(true)
                }}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-poppy-600 transition-all duration-300 ease-out"
                style={{ 
                  width: `${Math.min(100, ((commentStats.total - commentStats.unresolved) / commentStats.total) * 100)}%` 
                }}
              />
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between p-2 bg-gray-50/50 rounded-md">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-poppy-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {commentStats.openThreads} open threads
                    </span>
                    <span className="text-xs text-gray-500">
                      {commentStats.unresolved} unresolved comments
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-poppy-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {commentStats.uniqueCommenters} commenters
                  </span>
                </div>
              </div>
              <ReviewerAvatars reviewers={prd.metadata?.reviewers || []} />
            </div>

            {/* Spiciest Thread Preview */}
            {spiciestThread && (
              <div className="p-2 bg-gray-50/50 rounded-md border border-gray-100">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        Most active thread
                      </span>
                      <span className="text-xs text-gray-500">
                        {spiciestThread.totalComments} comments • {spiciestThread.contributors} contributors
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {spiciestThread.mainComment.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{spiciestThread.mainComment.user_name}</span>
                        <span>•</span>
                        <span>{new Date(spiciestThread.mainComment.created_at).toLocaleDateString()}</span>
                        {!spiciestThread.mainComment.resolved && (
                          <>
                            <span>•</span>
                            <span className="text-poppy-600">Unresolved</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="space-y-2">
              {needsMeeting && (
                <div className="space-y-2">
                  {scheduledMeeting ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                      <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-700">
                        Meeting scheduled for {new Date(scheduledMeeting.start).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })}
                      </span>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">Schedule a meeting:</p>
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.start}
                          size="sm"
                          variant="outline"
                          className="w-full justify-start border-poppy-100 hover:border-poppy-200 hover:bg-poppy-50/50"
                          disabled={schedulingStatus === 'creating-event'}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleScheduleMeeting(slot)
                          }}
                        >
                          {new Date(slot.start).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                          })}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-gray-500 hover:text-gray-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAvailableSlots([])
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {schedulingStatus === 'finding-times' ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-poppy-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-sm text-gray-600">Finding available times...</span>
                        </>
                      ) : schedulingStatus === 'error' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-poppy-600 hover:text-poppy-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            findAvailableTimes()
                          }}
                        >
                          Retry finding times
                        </Button>
                      ) : null}
                    </div>
                  )}
                  {errorMessage && (
                    <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-poppy-100 hover:border-poppy-200 hover:bg-poppy-50/50"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(prd.url, '_blank')
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Drive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-poppy-100 hover:border-poppy-200 hover:bg-poppy-50/50"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsModalOpen(true)
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Comments
                </Button>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && summary && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Lightbulb className="w-4 h-4 text-poppy-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">Open Questions</p>
                    <p className="line-clamp-3">{summary}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <PrdModal
        prd={prd}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summary={summary}
        loadSummary={ensureSummary}
      />
    </>
  )
}

