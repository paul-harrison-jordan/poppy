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
      .from('prd_stakeholder_signoffs')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        requested_by: session.user.email,
        status: 'pending',
        ...body
      })
      .select()

    if (error) {
      console.error('Error adding stakeholder signoff:', error)
      return NextResponse.json({ error: 'Failed to add stakeholder signoff' }, { status: 500 })
    }

    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        activity_type: 'signoff_requested',
        description: `Requested ${body.signoff_type} from ${body.stakeholder_name}`,
        performed_by: session.user.email
      })

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}