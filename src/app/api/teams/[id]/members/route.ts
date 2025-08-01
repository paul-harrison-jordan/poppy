import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/teams/[id]/members - Get all members for a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const teamId = parseInt(resolvedParams.id)
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Verify team belongs to user
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_email', session.user.email)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        *,
        engineer:engineers(id, engineer_name, engineer_email, title, skill_tags, capacity_hours_per_week, utilization_target)
      `)
      .eq('team_id', teamId)
      .eq('user_email', session.user.email)
      .eq('is_active', true)
      .order('role')
      .order('engineer:engineer_name')

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    return NextResponse.json({ members: members || [] })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams/[id]/members - Add a member to a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const teamId = parseInt(resolvedParams.id)
    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      engineer_id, 
      role,
      is_primary_role,
      joining_date,
      capacity_override,
      utilization_override
    } = body

    // Validate required fields
    if (!engineer_id || !role) {
      return NextResponse.json({ 
        error: 'Engineer ID and role are required' 
      }, { status: 400 })
    }

    // Validate role
    const validRoles = ['engineering_manager', 'designer', 'engineer', 'tech_lead']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Verify team belongs to user
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_email', session.user.email)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Verify engineer belongs to user
    const { data: engineer, error: engineerError } = await supabase
      .from('engineers')
      .select('id, engineer_name')
      .eq('id', engineer_id)
      .eq('user_email', session.user.email)
      .single()

    if (engineerError || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // If this will be their primary role, unset primary for other teams
    if (is_primary_role) {
      await supabase
        .from('team_members')
        .update({ is_primary_role: false })
        .eq('engineer_id', engineer_id)
        .eq('user_email', session.user.email)
    }

    // Add member to team
    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        engineer_id,
        user_email: session.user.email,
        role,
        is_primary_role: is_primary_role || false,
        joining_date: joining_date || null,
        capacity_override: capacity_override || null,
        utilization_override: utilization_override || null
      })
      .select(`
        *,
        engineer:engineers(id, engineer_name, engineer_email, title, skill_tags)
      `)
      .single()

    if (error) {
      console.error('Error adding team member:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Engineer is already a member of this team' 
        }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
    }

    return NextResponse.json(member)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}