import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/engineers/[id] - Get specific engineer
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
    const engineerId = parseInt(id)
    const supabase = createServiceClient()
    
    const { data: engineer, error } = await supabase
      .from('engineers')
      .select('*')
      .eq('id', engineerId)
      .eq('user_email', session.user.email)
      .single()

    if (error || !engineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    return NextResponse.json(engineer)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/engineers/[id] - Update engineer
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
    const engineerId = parseInt(id)
    const body = await request.json()
    const supabase = createServiceClient()
    
    // Verify engineer exists and belongs to user
    const { data: existingEngineer, error: fetchError } = await supabase
      .from('engineers')
      .select('id')
      .eq('id', engineerId)
      .eq('user_email', session.user.email)
      .single()

    if (fetchError || !existingEngineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Update engineer
    const { data: engineer, error } = await supabase
      .from('engineers')
      .update(body)
      .eq('id', engineerId)
      .eq('user_email', session.user.email)
      .select()
      .single()

    if (error) {
      console.error('Error updating engineer:', error)
      return NextResponse.json({ error: 'Failed to update engineer' }, { status: 500 })
    }

    return NextResponse.json(engineer)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/engineers/[id] - Deactivate engineer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const engineerId = parseInt(id)
    const supabase = createServiceClient()
    
    // Verify engineer exists and belongs to user
    const { data: existingEngineer, error: fetchError } = await supabase
      .from('engineers')
      .select('id')
      .eq('id', engineerId)
      .eq('user_email', session.user.email)
      .single()

    if (fetchError || !existingEngineer) {
      return NextResponse.json({ error: 'Engineer not found' }, { status: 404 })
    }

    // Soft delete by setting is_active to false
    const { data: engineer, error } = await supabase
      .from('engineers')
      .update({ is_active: false })
      .eq('id', engineerId)
      .eq('user_email', session.user.email)
      .select()
      .single()

    if (error) {
      console.error('Error deactivating engineer:', error)
      return NextResponse.json({ error: 'Failed to deactivate engineer' }, { status: 500 })
    }

    return NextResponse.json({ success: true, engineer })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}