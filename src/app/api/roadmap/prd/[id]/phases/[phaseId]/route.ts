import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    const phaseId = parseInt(resolvedParams.phaseId)
    
    if (isNaN(prdId) || isNaN(phaseId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const supabase = await createClient()

    // Update the phase
    const { data, error } = await supabase
      .from('prd_phases')
      .update(body)
      .eq('id', phaseId)
      .eq('prd_id', prdId)
      .select()
      .single()

    if (error) {
      console.error('Error updating phase:', error)
      return NextResponse.json({ error: 'Failed to update phase' }, { status: 500 })
    }

    return NextResponse.json({ phase: data })
  } catch (error) {
    console.error('Error in phase PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    const phaseId = parseInt(resolvedParams.phaseId)
    
    if (isNaN(prdId) || isNaN(phaseId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete the phase
    const { error } = await supabase
      .from('prd_phases')
      .delete()
      .eq('id', phaseId)
      .eq('prd_id', prdId)

    if (error) {
      console.error('Error deleting phase:', error)
      return NextResponse.json({ error: 'Failed to delete phase' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in phase DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}