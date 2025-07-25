import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/engineers/assignments - Get all feature assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const prdId = searchParams.get('prd_id')
    const engineerId = searchParams.get('engineer_id')

    const supabase = createServiceClient()
    
    let query = supabase
      .from('feature_engineer_assignments')
      .select(`
        *,
        engineer:engineers(id, engineer_name, engineer_email, title, team),
        prd:prds(id, title, description, status)
      `)
      .eq('user_email', session.user.email)

    if (prdId) {
      query = query.eq('prd_id', parseInt(prdId))
    }

    if (engineerId) {
      query = query.eq('engineer_id', parseInt(engineerId))
    }

    const { data: assignments, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments: assignments || [] })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/engineers/assignments - Create new assignment
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      prd_id, 
      engineer_id, 
      estimated_weeks,
      percentage_allocation,
      start_date,
      end_date,
      role_on_feature,
      assignment_notes 
    } = body

    // Validate required fields
    if (!prd_id || !engineer_id || !estimated_weeks) {
      return NextResponse.json({ 
        error: 'PRD ID, Engineer ID, and estimated weeks are required' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Verify PRD belongs to user
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('id')
      .eq('id', prd_id)
      .eq('user', session.user.email)
      .single()

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
    }

    // Verify engineer belongs to user
    const { data: engineer, error: engineerError } = await supabase
      .from('engineers')
      .select('id')
      .eq('id', engineer_id)
      .eq('user_email', session.user.email)
      .single()

    if (engineerError || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('feature_engineer_assignments')
      .insert({
        prd_id,
        engineer_id,
        user_email: session.user.email,
        estimated_weeks: parseFloat(estimated_weeks),
        percentage_allocation: percentage_allocation || 100,
        start_date: start_date || null,
        end_date: end_date || null,
        role_on_feature: role_on_feature || null,
        assignment_notes: assignment_notes || null,
        assigned_by: session.user.email
      })
      .select(`
        *,
        engineer:engineers(id, engineer_name, engineer_email, title, team),
        prd:prds(id, title, description, status)
      `)
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Engineer is already assigned to this feature' 
        }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id,
        user_email: session.user.email,
        activity_type: 'engineer_assigned',
        description: `Assigned ${assignment.engineer?.engineer_name} to feature`,
        new_value: `${estimated_weeks} weeks`,
        performed_by: session.user.email
      })

    return NextResponse.json(assignment)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}