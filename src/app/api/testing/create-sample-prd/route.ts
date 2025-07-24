import { NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Testing endpoints only available in development' }, { status: 403 })
  }

  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    // Create a sample PRD with roadmap data
    const { data: prd, error } = await supabase
      .from('prds')
      .insert({
        'drive-link': 'https://docs.google.com/document/d/TESTING_MODE_PRD',
        'v0-link': null,
        user: session.user.email,
        title: 'Smart Workflow Automation PRD (Test)',
        description: 'Testing mode sample PRD for workflow automation system',
        status: 'planned',
        priority_order: 10,
        business_value_score: 8,
        technical_complexity_score: 6,
        estimated_effort_points: 13,
        target_quarter: 'Q2 2025',
        dependencies: ['Slack API integration', 'Team management system'],
        risks: ['API rate limits', 'User adoption challenges'],
        success_metrics: ['25% reduction in coordination time', '80% user adoption', 'NPS 8+'],
        roadmap_notes: 'High-impact feature for improving team productivity. Focus on seamless integration with existing tools.',
        last_updated_by: session.user.email
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test PRD:', error)
      return NextResponse.json({ error: 'Failed to create test PRD' }, { status: 500 })
    }

    // Log the activity
    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id: prd.id,
        user_email: session.user.email,
        activity_type: 'notes_updated',
        description: 'Created test PRD with sample roadmap data',
        performed_by: session.user.email,
        metadata: {
          source: 'testing_mode',
          auto_generated: true
        }
      })

    return NextResponse.json({
      success: true,
      prd: prd,
      message: 'Test PRD created successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}