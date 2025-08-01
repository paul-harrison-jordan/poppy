import { useState, useEffect, useCallback } from 'react'

export interface PRD {
  id: number
  title?: string
  description?: string
  'drive-link': string
  'v0-link'?: string
  'v0-chat-id'?: string
  user: string
  shipped: boolean
  created_at: string
  roadmap?: {
    priority_order?: number
    status?: string
    target_quarter?: string
    estimated_effort_points?: number
    weeks_to_ship?: number
    business_value_score?: number
    technical_complexity_score?: number
    roadmap_notes?: string
    release_date?: string
    estimated_weeks?: number
    assigned_engineer?: string
  }
  assigned_engineers_count?: number
  total_estimated_weeks?: number
  slack_channels?: Array<{
    id: number
    channel_name: string
    channel_url?: string
    is_primary: boolean
  }>
  jira_tickets?: Array<{
    id: number
    ticket_key: string
    ticket_url: string
    ticket_type?: string
    is_primary_epic: boolean
  }>
  customer_feedback?: Array<{
    id: number
    customer_name: string
    feedback_text: string
    feedback_type: string
    created_at: string
  }>
}

// Shared hook for fetching PRD list
export function useRoadmapPRDs(userEmail?: string) {
  const [prds, setPRDs] = useState<PRD[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPRDs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = userEmail 
        ? `/api/roadmap/prds?user=${encodeURIComponent(userEmail)}` 
        : '/api/roadmap/prds'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPRDs(data.sort((a: PRD, b: PRD) => 
          (a.roadmap?.priority_order || 999) - (b.roadmap?.priority_order || 999)
        ))
      } else {
        setError(`Failed to fetch roadmap: ${response.status}`)
      }
    } catch (error) {
      setError('Error fetching roadmap data')
      console.error('Error fetching roadmap:', error)
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  useEffect(() => {
    fetchPRDs()
  }, [fetchPRDs])

  return { prds, loading, error, refetch: fetchPRDs }
}

// Shared hook for fetching single PRD
export function usePRDDetail(prdId: number) {
  const [prd, setPRD] = useState<PRD | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPRD = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/roadmap/prd/${prdId}`)
      if (response.ok) {
        const data = await response.json()
        setPRD(data)
      } else {
        setError(`Failed to fetch PRD: ${response.status}`)
      }
    } catch (error) {
      setError('Error fetching PRD data')
      console.error('Error fetching PRD detail:', error)
    } finally {
      setLoading(false)
    }
  }, [prdId])

  useEffect(() => {
    fetchPRD()
  }, [fetchPRD])

  return { prd, loading, error, refetch: fetchPRD }
}

// Shared helper functions
export const getWeeksToShip = (prd: PRD): number | null => {
  // Prioritize engineer assignment total as the source of truth
  if (prd.total_estimated_weeks && prd.total_estimated_weeks > 0) {
    return prd.total_estimated_weeks
  }
  // Fall back to manual weeks estimation
  if (prd.roadmap?.weeks_to_ship) return prd.roadmap.weeks_to_ship
  // Legacy: story points conversion (deprecated)
  if (prd.roadmap?.estimated_effort_points) {
    return Math.ceil(prd.roadmap.estimated_effort_points * 0.5)
  }
  return null
}

export const getPRDStatus = (prd: PRD): string => {
  if (prd.shipped) return 'shipped'
  return prd.roadmap?.status || 'planned'
}