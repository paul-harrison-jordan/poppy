import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    
    if (isNaN(prdId)) {
      return NextResponse.json({ error: 'Invalid PRD ID' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: phases, error } = await supabase
      .from('prd_phases')
      .select('*')
      .eq('prd_id', prdId)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching phases:', error)
      return NextResponse.json({ error: 'Failed to fetch phases' }, { status: 500 })
    }

    return NextResponse.json({ phases: phases || [] })
  } catch (error) {
    console.error('Error in phases API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const prdId = parseInt(resolvedParams.id)
    
    if (isNaN(prdId)) {
      return NextResponse.json({ error: 'Invalid PRD ID' }, { status: 400 })
    }

    const body = await request.json()
    const { phases } = body

    if (!phases || !Array.isArray(phases)) {
      return NextResponse.json({ error: 'Invalid phases data' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Add prd_id to each phase and ensure required fields
    const phasesWithPrdId = phases.map(phase => {
      const { is_complete, ...phaseData } = phase
      // Acknowledge is_complete but don't use it for now
      void is_complete
      return {
        ...phaseData,
        prd_id: prdId,
        features: phase.features || [],
        complexity: phase.complexity || 'Medium'
      }
    })

    const { data, error } = await supabase
      .from('prd_phases')
      .insert(phasesWithPrdId)
      .select()

    if (error) {
      console.error('Error creating phases:', error)
      return NextResponse.json({ error: 'Failed to create phases' }, { status: 500 })
    }

    return NextResponse.json({ phases: data })
  } catch (error) {
    console.error('Error in phases POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}