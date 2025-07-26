import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signoffId: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    const signoffId = parseInt(resolvedParams.signoffId)
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('prd_stakeholder_signoffs')
      .delete()
      .eq('id', signoffId)
      .eq('prd_id', prdId)
      .eq('user_email', session.user.email)

    if (error) {
      console.error('Error deleting stakeholder signoff:', error)
      return NextResponse.json({ error: 'Failed to delete stakeholder signoff' }, { status: 500 })
    }

    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        activity_type: 'signoff_requested',
        description: 'Removed stakeholder signoff request',
        performed_by: session.user.email
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signoffId: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    const signoffId = parseInt(resolvedParams.signoffId)
    const body = await request.json()
    const supabase = createServiceClient()
    
    const { data: signoff, error: signoffError } = await supabase
      .from('prd_stakeholder_signoffs')
      .select('*')
      .eq('id', signoffId)
      .eq('prd_id', prdId)
      .single()

    if (signoffError || !signoff) {
      return NextResponse.json({ error: 'Signoff not found' }, { status: 404 })
    }

    const canUpdate = signoff.user_email === session.user.email || 
                     signoff.stakeholder_email === session.user.email

    if (!canUpdate) {
      return NextResponse.json({ error: 'Unauthorized to update this signoff' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('prd_stakeholder_signoffs')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', signoffId)
      .select()

    if (error) {
      console.error('Error updating stakeholder signoff:', error)
      return NextResponse.json({ error: 'Failed to update stakeholder signoff' }, { status: 500 })
    }

    if (body.status && body.status !== 'pending') {
      await supabase
        .from('roadmap_activity_log')
        .insert({
          prd_id: prdId,
          user_email: signoff.user_email,
          activity_type: 'signoff_completed',
          description: `${signoff.signoff_type} ${body.status} by ${signoff.stakeholder_name}`,
          performed_by: session.user.email
        })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}