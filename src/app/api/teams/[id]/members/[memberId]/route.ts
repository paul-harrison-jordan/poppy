import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// PUT /api/teams/[id]/members/[memberId] - Update a team member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const teamId = parseInt(resolvedParams.id)
    const memberId = parseInt(resolvedParams.memberId)
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid team or member ID' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      role,
      is_primary_role,
      joining_date,
      capacity_override,
      utilization_override
    } = body

    // Validate role if provided
    if (role) {
      const validRoles = ['engineering_manager', 'designer', 'engineer', 'tech_lead']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ 
          error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
        }, { status: 400 })
      }
    }

    const supabase = createServiceClient()
    
    // Verify member belongs to user and team
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('engineer_id')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .eq('user_email', session.user.email)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // If setting as primary role, unset primary for other teams
    if (is_primary_role) {
      await supabase
        .from('team_members')
        .update({ is_primary_role: false })
        .eq('engineer_id', member.engineer_id)
        .eq('user_email', session.user.email)
        .neq('id', memberId)
    }

    // Update member
    const updateData: Record<string, unknown> = {}
    if (role !== undefined) updateData.role = role
    if (is_primary_role !== undefined) updateData.is_primary_role = is_primary_role
    if (joining_date !== undefined) updateData.joining_date = joining_date
    if (capacity_override !== undefined) updateData.capacity_override = capacity_override
    if (utilization_override !== undefined) updateData.utilization_override = utilization_override

    const { data: updatedMember, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)
      .eq('user_email', session.user.email)
      .select(`
        *,
        engineer:engineers(id, engineer_name, engineer_email, title, skill_tags)
      `)
      .single()

    if (error) {
      console.error('Error updating team member:', error)
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
    }

    return NextResponse.json(updatedMember)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/members/[memberId] - Remove a member from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const teamId = parseInt(resolvedParams.id)
    const memberId = parseInt(resolvedParams.memberId)
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid team or member ID' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Verify member belongs to user and team
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('id, engineer:engineers(engineer_name)')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .eq('user_email', session.user.email)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', memberId)
      .eq('user_email', session.user.email)

    if (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${(member.engineer as unknown as { engineer_name: string })?.engineer_name || 'Member'} removed from team successfully` 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}