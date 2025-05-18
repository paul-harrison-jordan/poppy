"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { shouldScheduleMeeting } from '@/lib/meetingLogic'
import { Prd } from '@/types/my-work'
import DeadlineBadge from './DeadlineBadge'
import ReviewerAvatars from './ReviewerAvatars'
import TaskList from './TaskList'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MessageSquare, Clock, Lightbulb, Expand } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import PrdModal from './PrdModal'

interface CommentCount {
  user_id: string
  user_name: string
  count: number
}


export default function PrdCard({
  prd,
  loadSummary
}: {
  prd: Prd
  loadSummary: () => Promise<string | undefined>
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
  const router = useRouter()

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

  const getCommentCounts = (): CommentCount[] => {
    if (!prd.metadata?.comments) return [];
    
    const counts = prd.metadata.comments
      .filter(comment => !comment.resolved)
      .reduce((acc, comment) => {
        const existing = acc.find(c => c.user_id === comment.user_id);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            user_id: comment.user_id,
            user_name: comment.user_name,
            count: 1
          });
        }
        return acc;
      }, [] as CommentCount[]);

    return counts.sort((a, b) => b.count - a.count);
  };

  const daysSinceEdit = getDaysSinceLastEdit();
  const commentCounts = getCommentCounts();

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className="bg-white hover:shadow-lg transition-shadow duration-200"
          onClick={() => {
            const next = !isExpanded
            setIsExpanded(next)
            if (next) ensureSummary()
          }}
        >
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">{prd.title}</span>
              <div className="flex items-center gap-2">
                <DeadlineBadge dueDate={prd.due_date} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await ensureSummary()
                    setIsModalOpen(true)
                  }}
                  className="h-8 w-8"
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comments Section */}
            {commentCounts.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4 text-poppy" />
                <div className="flex items-center gap-1">
                  {commentCounts.map((count, index) => (
                    <span key={count.user_id} className="flex items-center">
                      {index > 0 && <span className="mx-1">•</span>}
                      <span className="font-medium">{count.user_name}</span>
                      <span className="ml-1 text-poppy">({count.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Last Edit Section */}
            {daysSinceEdit !== null && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-poppy" />
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {daysSinceEdit === 0 
                      ? "Edited today" 
                      : daysSinceEdit === 1 
                        ? "Edited yesterday" 
                        : `Edited ${daysSinceEdit} days ago`}
                  </span>
                  <span className="text-poppy">({daysSinceEdit})</span>
                </div>
              </div>
            )}

            {/* Open Questions Summary */}
            {isExpanded && summary && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Lightbulb className="w-4 h-4 text-poppy mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">Open Questions</p>
                  <p className="line-clamp-3">{summary}</p>
                </div>
              </div>
            )}

            {/* Reviewers and Tasks */}
            <div className="pt-2 border-t border-gray-100">
              <ReviewerAvatars reviewers={prd.metadata?.reviewers || []} />
              <TaskList tasks={prd.metadata?.tasks || []} />
              {needsMeeting && (
                <div className="mt-2 space-y-2">
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
                      <p className="text-sm text-gray-600">Available times:</p>
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.start}
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
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
                        className="w-full"
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
                          <svg className="animate-spin h-4 w-4 text-poppy" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-sm text-gray-600">Finding available times...</span>
                        </>
                      ) : schedulingStatus === 'error' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-poppy hover:text-poppy/90"
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
            </div>
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
