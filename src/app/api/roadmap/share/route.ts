import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userEmail = searchParams.get('user')
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Fetch PRDs for the specified user (public view, no auth required)
    const { data: prds, error: prdsError } = await supabase
      .from('prds')
      .select(`
        id,
        title,
        description,
        created_at,
        status,
        priority_order,
        target_quarter,
        estimated_effort_points,
        business_value_score,
        technical_complexity_score,
        roadmap_notes
      `)
      .eq('user', userEmail)
      .order('priority_order', { ascending: true })

    if (prdsError) {
      console.error('Error fetching shared PRDs:', prdsError)
      return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 })
    }

    // Transform to public roadmap format (no sensitive links)
    const publicRoadmap = (prds || []).map(prd => ({
      id: prd.id,
      title: prd.title || `Feature #${prd.id}`,
      description: prd.description || 'No description available',
      roadmap: {
        priority_order: prd.priority_order || 999,
        status: prd.status || 'planned',
        target_quarter: prd.target_quarter,
        estimated_effort_points: prd.estimated_effort_points,
        business_value_score: prd.business_value_score,
        technical_complexity_score: prd.technical_complexity_score,
        roadmap_notes: prd.roadmap_notes
      },
      created_at: prd.created_at
    }))

    // Add metadata about the roadmap
    const metadata = {
      user: userEmail.split('@')[0], // Just the username part
      last_updated: prds?.[0]?.created_at || new Date().toISOString(),
      total_features: publicRoadmap.length,
      quarters_planned: [...new Set(publicRoadmap.map(p => p.roadmap.target_quarter).filter(Boolean))],
      shared_at: new Date().toISOString()
    }

    return NextResponse.json({
      roadmap: publicRoadmap,
      metadata
    })

  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}