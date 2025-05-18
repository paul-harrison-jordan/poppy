"use client"

import { useEffect, useState, useCallback } from 'react'

import { Prd, Comment, Task, Reviewer } from '@/types/my-work'

import PrdCard from './PrdCard'
import FilterBar, { FilterState } from './FilterBar'

interface SavedPRD {
  id: string
  title: string
  url: string
  createdAt: string
}

export default function MyWorkPage() {
  const [prds, setPrds] = useState<Prd[]>([])
  const [filteredPrds, setFilteredPrds] = useState<Prd[]>([])
  const [loading, setLoading] = useState(true)
  const [, setTasks] = useState<Task[]>([])
  const [, setReviewers] = useState<Reviewer[]>([])
  const [, setFilters] = useState<FilterState>({
    minComments: 0,
    minCommentors: 0,
    maxDaysSinceEdit: 0
  })

  const fetchComments = async (documentId: string) => {
    try {
      const response = await fetch(`/api/prd/comments?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()

      return {
        comments: data.comments,
        last_modified: data.last_modified
      }
    } catch (error) {
      console.error(`Error fetching data for ${documentId}:`, error)
      return {
        comments: [],
        last_modified: null
      }
    }
  }

  const fetchSummary = async (
    prdId: string,
    comments: Comment[],
    lastModified?: string | null
  ) => {
    if (!lastModified) return undefined
    const cacheKey = `summary:${prdId}:${lastModified}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch('/api/prd/summarize-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prdId,
          lastModified,
          comments,
          teamTerms: localStorage.getItem('teamTerms'),
          context: localStorage.getItem('personalContext')
        })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem(cacheKey, data.summary)
        return data.summary as string
      }
    } catch (err) {
      console.error('Error fetching summary:', err)
    }
    return undefined
  }

  const loadPrds = useCallback(async () => {
    const stored = localStorage.getItem('savedPRD')
    if (stored) {
      try {
        const savedPrds: SavedPRD[] = JSON.parse(stored)
        
        // Fetch comments for each PRD
        const prdsWithComments = await Promise.all(
          savedPrds.map(async (prd) => {
            const { comments, last_modified } = await fetchComments(prd.id)
            return {
              id: prd.id,
              title: prd.title,
              status: 'Draft' as const,
              created_at: prd.createdAt,
              last_edited_at: last_modified,
              owner_id: 'user',
              due_date: null,
              url: prd.url,
              metadata: {
                comments,
                edit_history: [],
                open_questions_summary: undefined
              }
            }
          })
        )

        setPrds(prdsWithComments)
        setFilteredPrds(prdsWithComments)
      } catch (error) {
        console.error('Error parsing saved PRDs:', error)
        setPrds([])
        setFilteredPrds([])
      }
    } else {
      setPrds([])
      setFilteredPrds([])
    }
    setLoading(false)
  }, [])

  const fetchMyWorkData = useCallback(async () => {
    try {
      const res = await fetch('/api/my-work/list')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.prds_tasks || [])
        setReviewers(data.prds_reviewers || [])
      }
    } catch (err) {
      console.error('Error fetching tasks and reviewers', err)
    }
  }, [])

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters)
    const filtered = prds.filter(prd => {
      const commentCount = prd.metadata?.comments?.length || 0
      const uniqueCommentors = new Set(prd.metadata?.comments?.map(c => c.user_id)).size
      const daysSinceEdit = prd.last_edited_at 
        ? Math.ceil((new Date().getTime() - new Date(prd.last_edited_at).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity

      return (
        commentCount >= newFilters.minComments &&
        uniqueCommentors >= newFilters.minCommentors &&
        (newFilters.maxDaysSinceEdit === 0 || daysSinceEdit <= newFilters.maxDaysSinceEdit)
      )
    })
    setFilteredPrds(filtered)
  }

  useEffect(() => {
    loadPrds()
    fetchMyWorkData()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'savedPRD') {
        loadPrds()
      }
    }

    // Listen for custom events
    const handleCustomEvent = () => {
      loadPrds()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('savedPRDUpdated', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('savedPRDUpdated', handleCustomEvent)
    }
  }, [loadPrds, fetchMyWorkData])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading PRDs...</div>
      </div>
    )
  }

  return (
    <div>
      <FilterBar onFilterChange={applyFilters} />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPrds.map(prd => (
          <PrdCard
            key={prd.id}
            prd={prd}

            loadSummary={() =>
              fetchSummary(prd.id, prd.metadata?.comments || [], prd.last_edited_at)
            }

          />
        ))}
        {filteredPrds.length === 0 && (
          <p className="text-center col-span-full text-muted-foreground">
            {prds.length === 0 ? 'No PRDs yet' : 'No PRDs match the current filters'}
          </p>
        )}
      </div>
    </div>
  )
}
