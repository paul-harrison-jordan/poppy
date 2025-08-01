import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// POST /api/teams/performance - Record performance metrics for completed work
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      team_member_id,
      prd_id,
      estimated_weeks,
      actual_weeks,
      complexity_rating,
      quality_rating,
      primary_technologies = [],
      skill_improvement_areas = [],
      started_at,
      completed_at
    } = body

    // Validate required fields
    if (!team_member_id || !prd_id) {
      return NextResponse.json({ 
        error: 'Team member ID and PRD ID are required' 
      }, { status: 400 })
    }

    // Validate ratings
    if (complexity_rating && (complexity_rating < 1 || complexity_rating > 5)) {
      return NextResponse.json({ 
        error: 'Complexity rating must be between 1 and 5' 
      }, { status: 400 })
    }

    if (quality_rating && (quality_rating < 1 || quality_rating > 5)) {
      return NextResponse.json({ 
        error: 'Quality rating must be between 1 and 5' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Verify team member belongs to user
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('id, engineer:engineers(engineer_name)')
      .eq('id', team_member_id)
      .eq('user_email', session.user.email)
      .single()

    if (memberError || !teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Verify PRD belongs to user
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('id, title')
      .eq('id', prd_id)
      .eq('user', session.user.email)
      .single()

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
    }

    // Create performance record
    const { data: performance, error } = await supabase
      .from('team_performance_metrics')
      .insert({
        team_member_id,
        prd_id,
        user_email: session.user.email,
        estimated_weeks: estimated_weeks ? parseFloat(estimated_weeks) : null,
        actual_weeks: actual_weeks ? parseFloat(actual_weeks) : null,
        complexity_rating: complexity_rating || null,
        quality_rating: quality_rating || null,
        primary_technologies,
        skill_improvement_areas,
        started_at: started_at || null,
        completed_at: completed_at || null
      })
      .select(`
        *,
        team_member:team_members(
          engineer:engineers(engineer_name)
        ),
        prd:prds(title)
      `)
      .single()

    if (error) {
      console.error('Error creating performance record:', error)
      return NextResponse.json({ error: 'Failed to create performance record' }, { status: 500 })
    }

    return NextResponse.json(performance)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/teams/performance - Get performance metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamMemberId = searchParams.get('team_member_id')
    const prdId = searchParams.get('prd_id')
    const limit = searchParams.get('limit') || '50'

    const supabase = createServiceClient()
    
    let query = supabase
      .from('team_performance_metrics')
      .select(`
        *,
        team_member:team_members(
          id,
          role,
          engineer:engineers(id, engineer_name, engineer_email, title)
        ),
        prd:prds(id, title, description, status)
      `)
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (teamMemberId) {
      query = query.eq('team_member_id', parseInt(teamMemberId))
    }

    if (prdId) {
      query = query.eq('prd_id', parseInt(prdId))
    }

    const { data: performance, error } = await query

    if (error) {
      console.error('Error fetching performance metrics:', error)
      return NextResponse.json({ error: 'Failed to fetch performance metrics' }, { status: 500 })
    }

    return NextResponse.json({ performance: performance || [] })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}