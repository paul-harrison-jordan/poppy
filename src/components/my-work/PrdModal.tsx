"use client"

import { useState, useEffect } from 'react'
import { Prd } from '@/types/my-work'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, MessageSquare, Lightbulb, Search } from 'lucide-react'

interface PrdModalProps {
  prd: Prd
  isOpen: boolean
  onClose: () => void
  summary?: string
  loadSummary: () => Promise<string | undefined>
}

export default function PrdModal({ prd, isOpen, onClose, summary: initialSummary, loadSummary }: PrdModalProps) {
  const [summary, ] = useState<string | undefined>(initialSummary)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewResults, setReviewResults] = useState<{
    relevantDatabases: string[];
    analysis: string;
    searchResults: Array<{
      database: string;
      averageScore: number;
      topMatches: Array<{
        score: number;
        metadata: {
          text?: string;
          [key: string]: unknown;
        };
      }>;
    }>;
  } | null>(null)

  useEffect(() => {
    if (isOpen && !summary) {
      loadSummary()
    }
  }, [isOpen, summary, loadSummary])

  const handleReviewDocument = async () => {
    try {
      setIsReviewing(true)

      // Extract document ID from URL
      const docId = prd.url?.split('/d/')[1]?.split('/')[0]
      if (!docId) {
        throw new Error('Invalid document URL')
      }

      // Fetch document content
      const contentResponse = await fetch('/api/get-document-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: docId })
      })

      if (!contentResponse.ok) {
        throw new Error('Failed to fetch document content')
      }

      const { content } = await contentResponse.json()

      // Analyze document
      const analysisResponse = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentBody: content
        })
      })

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze document')
      }

      const results = await analysisResponse.json()
      setReviewResults(results)
    } catch (error) {
      console.error('Error reviewing document:', error)
    } finally {
      setIsReviewing(false)
    }
  }

  const getCommentUrl = (commentId: string) => {
    if (!prd.url) return ''
    
    // Extract the document ID from the URL
    const docId = prd.url.split('/d/')[1]?.split('/')[0]
    if (!docId) return prd.url

    // Construct the URL with the correct format for comment linking
    return `https://docs.google.com/document/d/${docId}/edit?disco=${commentId}`
  }

  const getCommentThreads = () => {
    if (!prd.metadata?.comments) return []
    
    const comments = prd.metadata.comments
    const mainComments = comments.filter(c => !c.is_reply)
    const replies = comments.filter(c => c.is_reply)
    
    return mainComments.map(mainComment => {
      const threadReplies = replies
        .filter(reply => reply.parent_id === mainComment.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      return {
        mainComment,
        replies: threadReplies
      }
    }).sort((a, b) => new Date(b.mainComment.created_at).getTime() - new Date(a.mainComment.created_at).getTime())
  }

  const commentThreads = getCommentThreads()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl font-semibold">{prd.title}</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleReviewDocument}
                disabled={isReviewing}
              >
                <Search className="w-4 h-4" />
                {isReviewing ? 'Reviewing...' : 'Review Document'}
              </Button>
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
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Review Results */}
          {reviewResults && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-poppy" />
                <h3 className="text-lg font-semibold">Document Review</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Relevant Databases:</p>
                <div className="flex flex-wrap gap-2">
                  {reviewResults.relevantDatabases.map(db => (
                    <span key={db} className="px-2 py-1 bg-poppy/10 text-poppy rounded-full text-sm">
                      {db}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Analysis:</p>
                <p className="text-sm text-gray-600">{reviewResults.analysis}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Top Matches:</p>
                <div className="space-y-2">
                  {reviewResults.searchResults.map(result => (
                    <div key={result.database} className="p-2 bg-white rounded border">
                      <p className="text-sm font-medium">{result.database}</p>
                      <p className="text-xs text-gray-500">Average Score: {(result.averageScore * 100).toFixed(1)}%</p>
                      {result.topMatches.map((match, index) => (
                        <div key={index} className="mt-1 text-xs text-gray-600">
                          <p>Score: {(match.score * 100).toFixed(1)}%</p>
                          {match.metadata?.text && (
                            <p className="mt-1 line-clamp-2">{match.metadata.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
            
            {commentThreads.length > 0 ? (
              <div className="space-y-6">
                {commentThreads.map(thread => (
                  <div key={thread.mainComment.id} className="space-y-2">
                    {/* Main Comment */}
                    <div className="p-4 bg-white border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{thread.mainComment.user_name}</p>
                          {!thread.mainComment.resolved && (
                            <span className="px-2 py-0.5 text-xs font-medium text-poppy bg-poppy/10 rounded-full">
                              Unresolved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">
                            {new Date(thread.mainComment.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => window.open(getCommentUrl(thread.mainComment.id), '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap">{thread.mainComment.content}</p>
                    </div>

                    {/* Replies */}
                    {thread.replies.length > 0 && (
                      <div className="ml-8 space-y-2">
                        {thread.replies.map(reply => (
                          <div key={reply.id} className="p-3 bg-gray-50 border rounded-lg">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{reply.user_name}</p>
                                <span className="text-xs text-gray-500">(reply)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-2"
                                  onClick={() => window.open(getCommentUrl(reply.id), '_blank')}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No comments</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 