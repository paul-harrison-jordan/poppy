import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prdId = parseInt(params.id)
    const body = await request.json()
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

    const { data, error } = await supabase
      .from('prd_jira_tickets')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        added_by: session.user.email,
        ...body
      })
      .select()

    if (error) {
      console.error('Error adding Jira ticket:', error)
      return NextResponse.json({ error: 'Failed to add Jira ticket' }, { status: 500 })
    }

    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        activity_type: 'jira_added',
        description: `Added Jira ticket: ${body.ticket_key}`,
        performed_by: session.user.email
      })

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}