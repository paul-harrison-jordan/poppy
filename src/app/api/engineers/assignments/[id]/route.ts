import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// PATCH /api/engineers/assignments/[id] - Update assignment
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
    const assignmentId = parseInt(id)
    const body = await request.json()
    const supabase = createServiceClient()
    
    // Verify assignment exists and belongs to user
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('feature_engineer_assignments')
      .select('id, prd_id')
      .eq('id', assignmentId)
      .eq('user_email', session.user.email)
      .single()

    if (fetchError || !existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Update assignment
    const { data: assignment, error } = await supabase
      .from('feature_engineer_assignments')
      .update(body)
      .eq('id', assignmentId)
      .eq('user_email', session.user.email)
      .select(`
        *,
        engineer:engineers(id, engineer_name, engineer_email, title, team),
        prd:prds(id, title, description, status)
      `)
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: existingAssignment.prd_id,
        user_email: session.user.email,
        activity_type: 'assignment_updated',
        description: `Updated assignment for ${assignment.engineer?.engineer_name}`,
        performed_by: session.user.email
      })

    return NextResponse.json(assignment)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/engineers/assignments/[id] - Remove assignment
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
    const assignmentId = parseInt(id)
    const supabase = createServiceClient()
    
    // Get assignment details before deletion for logging
    const { data: assignment, error: fetchError } = await supabase
      .from('feature_engineer_assignments')
      .select(`
        prd_id,
        engineer:engineers(engineer_name)
      `)
      .eq('id', assignmentId)
      .eq('user_email', session.user.email)
      .single()

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Delete assignment
    const { error } = await supabase
      .from('feature_engineer_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('user_email', session.user.email)

    if (error) {
      console.error('Error deleting assignment:', error)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: assignment.prd_id,
        user_email: session.user.email,
        activity_type: 'assignment_removed',
        description: `Removed assignment for ${assignment.engineer?.engineer_name}`,
        performed_by: session.user.email
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}