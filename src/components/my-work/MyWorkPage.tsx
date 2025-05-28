"use client"

import { useEffect, useState, useCallback, useRef } from 'react'

import { Comment, Task, Reviewer } from '@/types/my-work'
import { determineCategory, analyzeSummary } from '@/lib/prdCategorization'

import PrdCard from './PrdCard'
import FilterBar, { FilterState } from './FilterBar'
import { usePRDStore, PRD } from '@/store/prdStore'

interface SavedPRD {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

// Helper to trigger agentic notification
function triggerAgenticNotification(prd: PRD) {
  const summary = prd.metadata?.open_questions_summary || '';
  const summaryAnalysis = analyzeSummary(summary);
  const openQuestions = summaryAnalysis.hasQuestions && summary
    ? summary.split(/[\n\r]+/).filter((line: string) => line.includes('?'))
    : [];
  window.dispatchEvent(new CustomEvent('poppy-agentic-message', {
    detail: {
      prdTitle: prd.title,
      openQuestions,
      prdId: prd.id
    }
  }));
}

export default function MyWorkPage() {
  const prds = usePRDStore((state) => state.prds)
  const setPRDs = usePRDStore((state) => state.setPRDs)
  const [filteredPrds, setFilteredPrds] = useState<PRD[]>([])
  const [loading, setLoading] = useState(true)
  const [, setTasks] = useState<Task[]>([])
  const [, setReviewers] = useState<Reviewer[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [, setFilters] = useState<FilterState>({
    minComments: 0,
    minCommentors: 0,
    maxDaysSinceEdit: 0
  })
  const prevCategoriesRef = useRef<Record<string, string>>({});

  const fetchComments = async (documentId: string) => {
    try {
      // Validate documentId format
      if (!documentId || documentId === '1' || !/^[A-Za-z0-9_-]{10,}$/.test(documentId)) {
        console.warn(`Invalid document ID format: ${documentId}`);
        return {
          comments: [],
          last_modified: null,
          title: null
        };
      }

      const response = await fetch(`/api/prd/comments?documentId=${documentId}`)
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          console.warn(`Document not found: ${documentId}`);
          // Remove the document from localStorage if it no longer exists
          const stored = localStorage.getItem('savedPRD');
          if (stored) {
            try {
              const savedPrds: SavedPRD[] = JSON.parse(stored);
              const updatedPrds = savedPrds.filter(p => p.id !== documentId);
              localStorage.setItem('savedPRD', JSON.stringify(updatedPrds));
            } catch (e) {
              console.error('Error updating localStorage:', e);
            }
          }
        } else {
          console.error(`Failed to fetch comments for ${documentId}:`, response.statusText);
        }
        return {
          comments: [],
          last_modified: null,
          title: null
        };
      }
      const data = await response.json()

      return {
        comments: data.comments,
        last_modified: data.last_modified,
        title: data.title
      }
    } catch (error) {
      console.error(`Error fetching data for ${documentId}:`, error)
      return {
        comments: [],
        last_modified: null,
        title: null
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
      } else if (response.status === 500) {
        // Handle Pinecone connection errors
        console.warn('Pinecone connection error - using cached summary if available');
        // Try to get the most recent cached summary for this PRD
        const allKeys = Object.keys(localStorage);
        const summaryKeys = allKeys.filter(key => key.startsWith(`summary:${prdId}:`));
        if (summaryKeys.length > 0) {
          // Sort by timestamp (newest first) and return the most recent
          const latestKey = summaryKeys.sort().pop();
          if (latestKey) {
            return localStorage.getItem(latestKey) || undefined;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching summary:', err)
      // Try to get cached summary on error
      const allKeys = Object.keys(localStorage);
      const summaryKeys = allKeys.filter(key => key.startsWith(`summary:${prdId}:`));
      if (summaryKeys.length > 0) {
        const latestKey = summaryKeys.sort().pop();
        if (latestKey) {
          return localStorage.getItem(latestKey) || undefined;
        }
      }
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
            try {
              const { comments, last_modified, title } = await fetchComments(prd.id)
              const summary = await fetchSummary(prd.id, comments, last_modified)
              
              // Check if we need to update the title
              const needsTitleUpdate = title && title !== prd.title
              
              // If title needs update, update it in localStorage
              if (needsTitleUpdate) {
                const updatedPrds = savedPrds.map(p => 
                  p.id === prd.id ? { ...p, title } : p
                )
                localStorage.setItem('savedPRD', JSON.stringify(updatedPrds))
              }

              return {
                id: prd.id,
                title: needsTitleUpdate ? title : prd.title,
                status: 'Draft' as const,
                created_at: prd.createdAt,
                last_edited_at: last_modified,
                owner_id: 'user',
                due_date: null,
                url: prd.url,
                metadata: {
                  comments,
                  edit_history: [],
                  open_questions_summary: summary
                }
              } as PRD
            } catch (error) {
              console.error(`Error processing PRD ${prd.id}:`, error);
              // Return a basic PRD object without comments if there's an error
              return {
                id: prd.id,
                title: prd.title,
                status: 'Draft' as const,
                created_at: prd.createdAt,
                last_edited_at: undefined,
                owner_id: 'user',
                due_date: null,
                url: prd.url,
                metadata: {
                  comments: [],
                  edit_history: [],
                  open_questions_summary: undefined
                }
              } as PRD
            }
          })
        )

        setPRDs(prdsWithComments)
        setFilteredPrds(prdsWithComments)
      } catch (error) {
        console.error('Error parsing saved PRDs:', error)
        setPRDs([])
        setFilteredPrds([])
      }
    } else {
      setPRDs([])
      setFilteredPrds([])
    }
    setLoading(false)
  }, [setPRDs])

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

  const applyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    const filtered = prds.filter(prd => {
      const category = determineCategory(prd)
      
      // If a specific category is selected, only show PRDs in that category
      if (activeCategory !== 'all' && category !== activeCategory) {
        return false
      }

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
  }, [prds, activeCategory])

  // Add effect to reapply filters when category changes
  useEffect(() => {
    applyFilters({
      minComments: 0,
      minCommentors: 0,
      maxDaysSinceEdit: 0
    })
  }, [activeCategory, applyFilters])

  // On load and PRD updates, check for at-risk PRDs and trigger notifications
  useEffect(() => {
    const newCategories = Object.fromEntries(prds.map(prd => [prd.id, determineCategory(prd)]));
    
    // Only process PRDs that have changed categories
    prds.forEach(prd => {
      const prev = prevCategoriesRef.current[prd.id];
      const curr = newCategories[prd.id];
      
      // Trigger notification if:
      // 1. This is the first time we're seeing this PRD (no prev category)
      // 2. The PRD just became at-risk (prev exists and wasn't at-risk, but now is)
      if (!prev || (prev !== 'at-risk' && curr === 'at-risk')) {
        triggerAgenticNotification(prd);
      }
    });

    // Update the ref with new categories
    prevCategoriesRef.current = newCategories;
  }, [prds]); // Only depend on prds changes

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
    window.addEventListener('savedBrandMessagingUpdated', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('savedPRDUpdated', handleCustomEvent)
      window.removeEventListener('savedBrandMessagingUpdated', handleCustomEvent)
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">My Work</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <FilterBar 
            onFilterChange={applyFilters} 
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            prds={prds}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrds.map(prd => (
            <PrdCard
              key={prd.id}
              prd={prd}
              category={determineCategory(prd)}
              loadSummary={() =>
                fetchSummary(prd.id, prd.metadata?.comments || [], prd.last_edited_at)
              }
            />
          ))}
          {filteredPrds.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
              <div className="w-24 h-24 mb-4 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {prds.length === 0 ? 'No PRDs yet' : 'No PRDs match the current filters'}
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                {prds.length === 0 
                  ? 'Create your first PRD to get started'
                  : 'Try adjusting your filters to see more results'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
