"use client"

import { useState, useEffect } from 'react'
import { Prd } from '@/types/my-work'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, MessageSquare, Lightbulb } from 'lucide-react'

interface PrdModalProps {
  prd: Prd
  isOpen: boolean
  onClose: () => void
  summary?: string
  loadSummary: () => Promise<string | undefined>
}

export default function PrdModal({ prd, isOpen, onClose, summary: initialSummary, loadSummary }: PrdModalProps) {
  const [summary, setSummary] = useState<string | undefined>(initialSummary)

  useEffect(() => {
    if (isOpen && !summary) {
      loadSummary().then(res => {
        if (res) setSummary(res)
      })
    }
  }, [isOpen])
  const getCommentCounts = () => {
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
      }, [] as Array<{ user_id: string; user_name: string; count: number }>);

    return counts.sort((a, b) => b.count - a.count);
  };

  const commentCounts = getCommentCounts();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl font-semibold">{prd.title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => window.open(prd.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Open in Drive
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Metadata Section */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-sm">{prd.status}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="text-sm">{new Date(prd.created_at).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Last Edited</p>
              <p className="text-sm">
                {prd.last_edited_at 
                  ? new Date(prd.last_edited_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Comments Summary */}
          {summary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-poppy" />
                <h3 className="text-lg font-semibold">Open Questions Summary</h3>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-poppy" />
              <h3 className="text-lg font-semibold">Comments</h3>
            </div>
            
            {commentCounts.length > 0 ? (
              <div className="space-y-4">
                {prd.metadata?.comments
                  ?.filter(comment => !comment.resolved)
                  .map(comment => (
                    <div key={comment.id} className="p-4 bg-white border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{comment.user_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No unresolved comments</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 