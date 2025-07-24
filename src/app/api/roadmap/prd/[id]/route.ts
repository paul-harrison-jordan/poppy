import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const prdId = parseInt(id)
    const supabase = createServiceClient()
    
    // Fetch PRD first
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('*')
      .eq('id', prdId)
      .eq('user', session.user.email)
      .single()

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
    }

    // Fetch related data separately to avoid relationship errors
    const [
      { data: slackChannels },
      { data: jiraTickets },
      { data: customerFeedback },
      { data: stakeholderSignoffs },
      { data: roadmapData } // For backward compatibility
    ] = await Promise.all([
      supabase.from('prd_slack_channels').select('*').eq('prd_id', prdId),
      supabase.from('prd_jira_tickets').select('*').eq('prd_id', prdId),
      supabase.from('prd_customer_feedback').select('*').eq('prd_id', prdId),
      supabase.from('prd_stakeholder_signoffs').select('*').eq('prd_id', prdId),
      supabase.from('prd_roadmap_data').select('*').eq('prd_id', prdId).single()
    ])

    // Use legacy roadmap data if new fields aren't populated yet
    const legacyRoadmapData = roadmapData

    // Transform to expected format
    const prdWithDetails = {
      id: prd.id,
      'drive-link': prd['drive-link'],
      'v0-link': prd['v0-link'],
      user: prd.user,
      title: prd.title,
      description: prd.description,
      shipped: prd.shipped || prd.status === 'shipped', // Handle both old and new
      created_at: prd.created_at,
      updated_at: prd.updated_at,
      
      // Roadmap data - prefer new location, fallback to legacy
      roadmap: {
        priority_order: prd.priority_order ?? legacyRoadmapData?.priority_order ?? 0,
        status: prd.status ?? legacyRoadmapData?.status ?? 'planned',
        target_quarter: prd.target_quarter ?? legacyRoadmapData?.target_quarter,
        estimated_effort_points: prd.estimated_effort_points ?? legacyRoadmapData?.estimated_effort_points,
        business_value_score: prd.business_value_score ?? legacyRoadmapData?.business_value_score,
        technical_complexity_score: prd.technical_complexity_score ?? legacyRoadmapData?.technical_complexity_score,
        dependencies: prd.dependencies ?? legacyRoadmapData?.dependencies,
        risks: prd.risks ?? legacyRoadmapData?.risks ?? [],
        success_metrics: prd.success_metrics ?? legacyRoadmapData?.success_metrics ?? [],
        roadmap_notes: prd.roadmap_notes ?? legacyRoadmapData?.roadmap_notes,
        last_updated_by: prd.last_updated_by ?? legacyRoadmapData?.last_updated_by
      },
      
      // Related data
      slack_channels: slackChannels || [],
      jira_tickets: jiraTickets || [],
      customer_feedback: customerFeedback || [],
      stakeholder_signoffs: stakeholderSignoffs || []
    }

    return NextResponse.json(prdWithDetails)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const prdId = parseInt(id)
    const body = await request.json()
    const supabase = createServiceClient()
    
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('id')
      .eq('id', prdId)
      .eq('user', session.user.email)
      .single()

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
    }

    // Update the PRD directly (single source of truth)
    const updateData = {
      ...body,
      last_updated_by: session.user.email,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('prds')
      .update(updateData)
      .eq('id', prdId)
      .eq('user', session.user.email)
      .select()

    if (error) {
      console.error('Error updating PRD:', error)
      return NextResponse.json({ error: 'Failed to update PRD' }, { status: 500 })
    }

    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        activity_type: 'notes_updated',
        description: 'Updated roadmap details',
        performed_by: session.user.email
      })

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}