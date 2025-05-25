import { Comment } from '@/types/my-work'

export interface CommentMetrics {
  totalComments: number
  unresolvedComments: number
  uniqueCommenters: number
  openThreads: number
  averageCommentsPerThread: number
  daysSinceLastComment: number
  commentTone: 'positive' | 'neutral' | 'negative' | 'mixed'
}

export interface SummaryAnalysis {
  hasQuestions: boolean
  questionCount: number
  hasBlockers: boolean
  hasDecisions: boolean
  hasFeedback: boolean
  urgencyLevel: 'high' | 'medium' | 'low'
  complexityLevel: 'high' | 'medium' | 'low'
}

const POSITIVE_WORDS = [
  'great', 'good', 'agree', 'thanks', 'helpful', 'excellent', 'perfect',
  'awesome', 'nice', 'solved', 'resolved', 'clear', 'understood'
]

const NEGATIVE_WORDS = [
  'bad', 'wrong', 'issue', 'problem', 'concern', 'blocked', 'stuck',
  'confused', 'unclear', 'missing', 'error', 'fail', 'broken'
]

const URGENCY_INDICATORS = {
  high: ['urgent', 'asap', 'critical', 'immediately', 'blocking', 'deadline'],
  medium: ['soon', 'priority', 'important', 'needed'],
  low: ['when possible', 'eventually', 'later']
}

const COMPLEXITY_INDICATORS = {
  high: ['complex', 'complicated', 'multiple', 'several', 'many', 'extensive'],
  medium: ['some', 'few', 'moderate'],
  low: ['simple', 'straightforward', 'basic', 'minor']
}

export const calculateCommentMetrics = (comments: Comment[]): CommentMetrics => {
  if (!comments.length) {
    return {
      totalComments: 0,
      unresolvedComments: 0,
      uniqueCommenters: 0,
      openThreads: 0,
      averageCommentsPerThread: 0,
      daysSinceLastComment: Infinity,
      commentTone: 'neutral'
    }
  }

  const mainComments = comments.filter(c => !c.is_reply)
  const replies = comments.filter(c => c.is_reply)
  const uniqueCommenters = new Set(comments.map(c => c.user_id)).size
  const unresolvedComments = comments.filter(c => !c.resolved).length
  
  // Calculate open threads (a thread is open if either the main comment or any of its replies are unresolved)
  const openThreads = mainComments.filter(mainComment => {
    const threadReplies = replies.filter(reply => reply.parent_id === mainComment.id)
    return !mainComment.resolved || threadReplies.some(reply => !reply.resolved)
  }).length

  // Calculate days since last comment
  const lastCommentDate = new Date(Math.max(...comments.map(c => new Date(c.created_at).getTime())))
  const daysSinceLastComment = Math.ceil((Date.now() - lastCommentDate.getTime()) / (1000 * 60 * 60 * 24))

  return {
    totalComments: comments.length,
    unresolvedComments,
    uniqueCommenters,
    openThreads,
    averageCommentsPerThread: mainComments.length ? comments.length / mainComments.length : 0,
    daysSinceLastComment,
    commentTone: analyzeCommentTone(comments)
  }
}

export const analyzeCommentTone = (comments: Comment[]): 'positive' | 'neutral' | 'negative' | 'mixed' => {
  if (!comments.length) return 'neutral'

  let positiveCount = 0
  let negativeCount = 0

  comments.forEach(comment => {
    const text = comment.content.toLowerCase()
    POSITIVE_WORDS.forEach(word => {
      if (text.includes(word)) positiveCount++
    })
    NEGATIVE_WORDS.forEach(word => {
      if (text.includes(word)) negativeCount++
    })
  })

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  if (positiveCount === 0 && negativeCount === 0) return 'neutral'
  return 'mixed'
}

export const determineUrgencyLevel = (text: string): 'high' | 'medium' | 'low' => {
  const lowerText = text.toLowerCase()
  
  if (URGENCY_INDICATORS.high.some(word => lowerText.includes(word))) return 'high'
  if (URGENCY_INDICATORS.medium.some(word => lowerText.includes(word))) return 'medium'
  if (URGENCY_INDICATORS.low.some(word => lowerText.includes(word))) return 'low'
  
  return 'medium' // default to medium if no indicators found
}

export const determineComplexityLevel = (text: string): 'high' | 'medium' | 'low' => {
  const lowerText = text.toLowerCase()
  
  if (COMPLEXITY_INDICATORS.high.some(word => lowerText.includes(word))) return 'high'
  if (COMPLEXITY_INDICATORS.medium.some(word => lowerText.includes(word))) return 'medium'
  if (COMPLEXITY_INDICATORS.low.some(word => lowerText.includes(word))) return 'low'
  
  return 'medium' // default to medium if no indicators found
}

export const analyzeSummary = (summary: string): SummaryAnalysis => {
  if (!summary) {
    return {
      hasQuestions: false,
      questionCount: 0,
      hasBlockers: false,
      hasDecisions: false,
      hasFeedback: false,
      urgencyLevel: 'medium',
      complexityLevel: 'medium'
    }
  }

  return {
    hasQuestions: /[?]/.test(summary),
    questionCount: (summary.match(/[?]/g) || []).length,
    hasBlockers: /blocked|can't proceed|stuck|blocking/i.test(summary),
    hasDecisions: /decide|choose|select|decision/i.test(summary),
    hasFeedback: /feedback|review|comment|input/i.test(summary),
    urgencyLevel: determineUrgencyLevel(summary),
    complexityLevel: determineComplexityLevel(summary)
  }
}

const isNeedsReview = (metrics: CommentMetrics, summary: SummaryAnalysis): boolean => {
  return (
    // High comment activity with unresolved issues
    (metrics.unresolvedComments > 0 && metrics.totalComments >= 3) ||
    // Multiple open threads with recent activity
    (metrics.openThreads >= 2 && metrics.daysSinceLastComment <= 2) ||
    // Summary indicates pending decisions
    (summary.hasDecisions && summary.questionCount > 0) ||
    // High urgency in summary
    (summary.urgencyLevel === 'high' && metrics.totalComments > 0)
  )
}

const isBlocked = (metrics: CommentMetrics, summary: SummaryAnalysis): boolean => {
  return (
    // Explicit blockers mentioned
    summary.hasBlockers ||
    // High number of unresolved comments with negative tone
    (metrics.unresolvedComments >= 3 && metrics.commentTone === 'negative') ||
    // Multiple open threads with no recent activity
    (metrics.openThreads >= 2 && metrics.daysSinceLastComment > 5) ||
    // High complexity with multiple questions
    (summary.complexityLevel === 'high' && summary.questionCount >= 3)
  )
}

const isInProgress = (metrics: CommentMetrics, summary: SummaryAnalysis): boolean => {
  return (
    // Active discussion with positive/neutral tone
    (metrics.totalComments > 0 && 
     metrics.commentTone !== 'negative' && 
     metrics.daysSinceLastComment <= 3) ||
    // Questions being actively discussed
    (summary.hasQuestions && 
     metrics.totalComments > 0 && 
     metrics.daysSinceLastComment <= 2) ||
    // Medium complexity with ongoing feedback
    (summary.complexityLevel === 'medium' && 
     summary.hasFeedback && 
     metrics.totalComments > 0)
  )
}

const isReadyForReview = (metrics: CommentMetrics, summary: SummaryAnalysis): boolean => {
  return (
    // All comments resolved
    metrics.unresolvedComments === 0 &&
    // No open questions in summary
    summary.questionCount === 0 &&
    // No blockers mentioned
    !summary.hasBlockers &&
    // Positive or neutral tone
    metrics.commentTone !== 'negative' &&
    // Recent activity
    metrics.daysSinceLastComment <= 5
  )
}

const isAtRisk = (metrics: CommentMetrics, summary: SummaryAnalysis): boolean => {
  return (
    // High urgency with blockers
    (summary.urgencyLevel === 'high' && summary.hasBlockers) ||
    // Negative tone with multiple unresolved issues
    (metrics.commentTone === 'negative' && 
     metrics.unresolvedComments >= 2) ||
    // High complexity with no recent activity
    (summary.complexityLevel === 'high' && 
     metrics.daysSinceLastComment > 3) ||
    // Multiple open threads with negative tone
    (metrics.openThreads >= 2 && 
     metrics.commentTone === 'negative')
  )
}

const isActive = (metrics: CommentMetrics, summary: SummaryAnalysis): boolean => {
  return (
    // Has some activity but not enough to be in other categories
    metrics.totalComments > 0 &&
    // No unresolved issues
    metrics.unresolvedComments === 0 &&
    // No blockers
    !summary.hasBlockers &&
    // Not high urgency
    summary.urgencyLevel !== 'high' &&
    // Not high complexity
    summary.complexityLevel !== 'high' &&
    // Recent activity
    metrics.daysSinceLastComment <= 7
  )
}

export const determineCategory = (prd: { metadata?: { comments?: Comment[], open_questions_summary?: string } }): string => {
  const metrics = calculateCommentMetrics(prd.metadata?.comments || [])
  const summaryAnalysis = analyzeSummary(prd.metadata?.open_questions_summary || '')
  
  if (isAtRisk(metrics, summaryAnalysis)) return 'at-risk'
  if (isBlocked(metrics, summaryAnalysis)) return 'blocked'
  if (isNeedsReview(metrics, summaryAnalysis)) return 'needs-review'
  if (isReadyForReview(metrics, summaryAnalysis)) return 'ready-for-review'
  if (isInProgress(metrics, summaryAnalysis)) return 'in-progress'
  if (isActive(metrics, summaryAnalysis)) return 'active'
  
  return 'inactive' // default category for PRDs with no activity
} 