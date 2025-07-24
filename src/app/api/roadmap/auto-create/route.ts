import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prd_id,
      user_email,
      business_value_score,
      technical_complexity_score,
      estimated_effort_points,
      target_quarter,
      status,
      roadmap_notes,
      priority_order
    } = body

    // Verify the user owns this PRD
    if (user_email !== session.user.email) {
      return NextResponse.json({ error: 'Unauthorized - user mismatch' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    // Verify PRD exists and belongs to user
    const { data: prd, error: prdError } = await supabase
      .from('prds')
      .select('id, "user"')
      .eq('id', prd_id)
      .eq('user', session.user.email)
      .single()

    if (prdError || !prd) {
      return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
    }

    // Check if PRD already has roadmap data
    if (prd.status !== 'planned' || prd.business_value_score || prd.roadmap_notes) {
      return NextResponse.json({ 
        message: 'PRD already has roadmap data',
        prd_id: prd.id 
      })
    }

    // Update PRD with roadmap data (single source of truth)
    const { data: updatedPRD, error: updateError } = await supabase
      .from('prds')
      .update({
        business_value_score,
        technical_complexity_score,
        estimated_effort_points,
        target_quarter,
        status,
        roadmap_notes,
        priority_order,
        last_updated_by: session.user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', prd_id)
      .eq('user', session.user.email)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating PRD with roadmap data:', updateError)
      return NextResponse.json({ 
        error: 'Failed to create roadmap entry',
        details: updateError.message 
      }, { status: 500 })
    }

    // Log the activity
    await supabase
      .from('roadmap_activity_log')
      .insert({
        prd_id,
        user_email,
        activity_type: 'notes_updated',
        description: 'Automatically created roadmap entry with AI-powered defaults',
        performed_by: session.user.email,
        metadata: {
          source: 'ai_auto_creation',
          business_value_score,
          technical_complexity_score,
          estimated_effort_points
        }
      })

    return NextResponse.json({
      success: true,
      prd: updatedPRD,
      message: 'PRD updated with AI-powered roadmap defaults'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}