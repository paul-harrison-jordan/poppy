import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    const channelId = parseInt(resolvedParams.channelId)
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('prd_slack_channels')
      .delete()
      .eq('id', channelId)
      .eq('prd_id', prdId)
      .eq('user_email', session.user.email)

    if (error) {
      console.error('Error deleting Slack channel:', error)
      return NextResponse.json({ error: 'Failed to delete Slack channel' }, { status: 500 })
    }

    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prdId,
        user_email: session.user.email,
        activity_type: 'slack_added',
        description: 'Removed Slack channel',
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
  { params }: { params: Promise<{ id: string; channelId: string }> }
) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    const channelId = parseInt(resolvedParams.channelId)
    const body = await request.json()
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('prd_slack_channels')
      .update(body)
      .eq('id', channelId)
      .eq('prd_id', prdId)
      .eq('user_email', session.user.email)
      .select()

    if (error) {
      console.error('Error updating Slack channel:', error)
      return NextResponse.json({ error: 'Failed to update Slack channel' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}