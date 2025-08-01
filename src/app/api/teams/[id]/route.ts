import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/teams/[id] - Get a specific team with its members
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
    
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members:team_members!inner(
          *,
          engineer:engineers(id, engineer_name, engineer_email, title, skill_tags, capacity_hours_per_week, utilization_target)
        )
      `)
      .eq('id', teamId)
      .eq('user_email', session.user.email)
      .eq('is_active', true)
      .eq('team_members.is_active', true)
      .single()

    if (error) {
      console.error('Error fetching team:', error)
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
    }

    return NextResponse.json(team)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[id] - Update a team
export async function PUT(
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
      team_name, 
      team_description,
      default_capacity_hours_per_week,
      default_utilization_target
    } = body

    const supabase = createServiceClient()
    
    // Verify team belongs to user
    const { data: existingTeam, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_email', session.user.email)
      .single()

    if (teamError || !existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (team_name !== undefined) updateData.team_name = team_name
    if (team_description !== undefined) updateData.team_description = team_description
    if (default_capacity_hours_per_week !== undefined) updateData.default_capacity_hours_per_week = default_capacity_hours_per_week
    if (default_utilization_target !== undefined) updateData.default_utilization_target = default_utilization_target

    const { data: team, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .eq('user_email', session.user.email)
      .select()
      .single()

    if (error) {
      console.error('Error updating team:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Team name already exists' 
        }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
    }

    return NextResponse.json(team)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(
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
      .select('id, team_name')
      .eq('id', teamId)
      .eq('user_email', session.user.email)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Soft delete by setting is_active to false (this will also soft-delete members via trigger if needed)
    const { error } = await supabase
      .from('teams')
      .update({ is_active: false })
      .eq('id', teamId)
      .eq('user_email', session.user.email)

    if (error) {
      console.error('Error deleting team:', error)
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Team "${team.team_name}" deleted successfully` 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}