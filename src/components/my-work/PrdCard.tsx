"use client"

import { useState } from 'react'
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

  const ensureSummary = async (): Promise<string | undefined> => {
    if (summary) return summary
    const s = await loadSummary()
    if (s) setSummary(s)
    return s
  }

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
              <ReviewerAvatars prdId={prd.id} />
              <TaskList prdId={prd.id} />
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
