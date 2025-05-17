"use client"

import { useEffect, useState } from 'react'
import { Prd } from '@/types/my-work'
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
  const [filters, setFilters] = useState<FilterState>({
    minComments: 0,
    minCommentors: 0,
    maxDaysSinceEdit: 0
  })

  const fetchComments = async (documentId: string) => {
    try {
      const response = await fetch(`/api/prd/comments?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()
      
      // Fetch summary if there are unresolved comments
      let summary = undefined
      if (data.comments.some((comment: any) => !comment.resolved)) {
        const summaryResponse = await fetch('/api/prd/summarize-comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comments: data.comments, teamTerms: localStorage.getItem('teamTerms'), context: localStorage.getItem('personalContext') })
        })
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          summary = summaryData.summary
        }
      }

      return {
        comments: data.comments,
        last_modified: data.last_modified,
        summary
      }
    } catch (error) {
      console.error(`Error fetching data for ${documentId}:`, error)
      return {
        comments: [],
        last_modified: null,
        summary: undefined
      }
    }
  }

  const loadPrds = async () => {
    const stored = localStorage.getItem('savedPRD')
    if (stored) {
      try {
        const savedPrds: SavedPRD[] = JSON.parse(stored)
        
        // Fetch comments for each PRD
        const prdsWithComments = await Promise.all(
          savedPrds.map(async (prd) => {
            const { comments, last_modified, summary } = await fetchComments(prd.id)
            return {
              id: prd.id,
              title: prd.title,
              status: 'Draft' as const,
              created_at: prd.createdAt,
              last_edited_at: last_modified,
              owner_id: 'user',
              due_date: null,
              metadata: {
                comments,
                edit_history: [],
                open_questions_summary: summary
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
  }

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
  }, [])

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
          <PrdCard key={prd.id} prd={prd} />
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
