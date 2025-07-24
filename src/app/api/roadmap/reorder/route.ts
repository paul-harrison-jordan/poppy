import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prdId, newOrder } = await request.json()
    const supabase = createServiceClient()
    
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('id')
      .eq('id', prdId)
      .eq('user', session.user.email)
      .single()

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
    }

    // Update priority order directly in PRDs table (single source of truth)
    const { data, error } = await supabase
      .from('prds')
      .update({
        priority_order: newOrder,
        last_updated_by: session.user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', prdId)
      .eq('user', session.user.email)
      .select()

    if (error) {
      console.error('Error updating priority order:', error)
      return NextResponse.json({ error: 'Failed to update priority order' }, { status: 500 })
    }

    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        activity_type: 'priority_changed',
        description: `Changed priority order to ${newOrder}`,
        old_value: null,
        new_value: newOrder.toString(),
        performed_by: session.user.email
      })

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}