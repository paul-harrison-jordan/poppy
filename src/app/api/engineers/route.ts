import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/engineers - Get all engineers for the current user
export async function GET() {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    const { data: engineers, error } = await supabase
      .from('engineers')
      .select('*')
      .eq('user_email', session.user.email)
      .eq('is_active', true)
      .order('engineer_name')

    if (error) {
      console.error('Error fetching engineers:', error)
      return NextResponse.json({ error: 'Failed to fetch engineers' }, { status: 500 })
    }

    return NextResponse.json({ engineers: engineers || [] })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/engineers - Add a new engineer
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      engineer_email, 
      engineer_name, 
      title, 
      team, 
      skill_tags, 
      capacity_hours_per_week,
      utilization_target,
      hire_date,
      notes 
    } = body

    // Validate required fields
    if (!engineer_email || !engineer_name) {
      return NextResponse.json({ 
        error: 'Engineer email and name are required' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    const { data: engineer, error } = await supabase
      .from('engineers')
      .insert({
        user_email: session.user.email,
        engineer_email,
        engineer_name,
        title: title || null,
        team: team || null,
        skill_tags: skill_tags || [],
        capacity_hours_per_week: capacity_hours_per_week || 40,
        utilization_target: utilization_target || 0.80,
        hire_date: hire_date || null,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating engineer:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Engineer already exists in your team' 
        }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create engineer' }, { status: 500 })
    }

    return NextResponse.json(engineer)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}