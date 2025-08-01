import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/teams - Get all teams for the current user
export async function GET() {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members:team_members(
          *,
          engineer:engineers(id, engineer_name, engineer_email, title, skill_tags)
        )
      `)
      .eq('user_email', session.user.email)
      .eq('is_active', true)
      .order('team_name')

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    return NextResponse.json({ teams: teams || [] })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      team_name, 
      team_description,
      default_capacity_hours_per_week,
      default_utilization_target
    } = body

    // Validate required fields
    if (!team_name) {
      return NextResponse.json({ 
        error: 'Team name is required' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        user_email: session.user.email,
        team_name,
        team_description: team_description || null,
        default_capacity_hours_per_week: default_capacity_hours_per_week || 40,
        default_utilization_target: default_utilization_target || 0.80
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Team name already exists' 
        }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    return NextResponse.json(team)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}