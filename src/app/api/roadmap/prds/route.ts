import { NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(request: Request) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filterUser = searchParams.get('user')

    const supabase = createServiceClient()
    
    // Use filter user if provided, otherwise use authenticated user
    const targetUser = filterUser || session.user.email
    
    // First, fetch PRDs (single source of truth) - filtered by user responsible for PRD
    const { data: prds, error: prdsError } = await supabase
      .from('prds')
      .select('*')
      .eq('user', targetUser)
      .order('priority_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (prdsError) {
      console.error('Error fetching PRDs:', prdsError)
      console.error('User email:', session.user.email)
      return NextResponse.json({ 
        error: 'Failed to fetch PRDs', 
        details: prdsError.message,
        userEmail: targetUser 
      }, { status: 500 })
    }

    console.log(`Found ${prds?.length || 0} PRDs for user: ${targetUser}`)

    if (!prds || prds.length === 0) {
      return NextResponse.json([])
    }

    // Get related data separately for now (until schema is updated)
    const prdIds = prds.map(prd => prd.id)
    
    // Fetch related data separately to avoid relationship errors
    const [
      { data: slackChannels },
      { data: jiraTickets },
      { data: customerFeedback },
      { data: stakeholderSignoffs },
      { data: roadmapData } // For backward compatibility
    ] = await Promise.all([
      supabase.from('prd_slack_channels').select('*').in('prd_id', prdIds),
      supabase.from('prd_jira_tickets').select('*').in('prd_id', prdIds),
      supabase.from('prd_customer_feedback').select('*').in('prd_id', prdIds),
      supabase.from('prd_stakeholder_signoffs').select('*').in('prd_id', prdIds),
      supabase.from('prd_roadmap_data').select('*').in('prd_id', prdIds)
    ])

    // Transform data to match expected roadmap format
    const roadmapPRDs = prds.map(prd => {
      // Check if roadmap data exists in new location (prds table) or old location (prd_roadmap_data)
      const legacyRoadmapData = roadmapData?.find(rd => rd.prd_id === prd.id)
      
      return {
        id: prd.id,
        'drive-link': prd['drive-link'],
        'v0-link': prd['v0-link'],
        user: prd.user,
        title: prd.title,
        description: prd.description,
        shipped: prd.shipped || prd.status === 'shipped', // Handle both old and new
        created_at: prd.created_at,
        updated_at: prd.updated_at,
        
        // Roadmap data - prefer new location, fallback to legacy
        roadmap: {
          priority_order: prd.priority_order ?? legacyRoadmapData?.priority_order ?? 0,
          status: prd.status ?? legacyRoadmapData?.status ?? 'planned',
          target_quarter: prd.target_quarter ?? legacyRoadmapData?.target_quarter,
          estimated_effort_points: prd.estimated_effort_points ?? legacyRoadmapData?.estimated_effort_points,
          business_value_score: prd.business_value_score ?? legacyRoadmapData?.business_value_score,
          technical_complexity_score: prd.technical_complexity_score ?? legacyRoadmapData?.technical_complexity_score,
          dependencies: prd.dependencies ?? legacyRoadmapData?.dependencies,
          risks: prd.risks ?? legacyRoadmapData?.risks ?? [],
          success_metrics: prd.success_metrics ?? legacyRoadmapData?.success_metrics ?? [],
          roadmap_notes: prd.roadmap_notes ?? legacyRoadmapData?.roadmap_notes,
          last_updated_by: prd.last_updated_by ?? legacyRoadmapData?.last_updated_by
        },
        
        // Related data
        slack_channels: slackChannels?.filter(sc => sc.prd_id === prd.id) || [],
        jira_tickets: jiraTickets?.filter(jt => jt.prd_id === prd.id) || [],
        customer_feedback: customerFeedback?.filter(cf => cf.prd_id === prd.id) || [],
        stakeholder_signoffs: stakeholderSignoffs?.filter(ss => ss.prd_id === prd.id) || []
      }
    })

    return NextResponse.json(roadmapPRDs)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, driveLink, description } = await request.json()

    if (!title || !driveLink) {
      return NextResponse.json({ error: 'Title and driveLink are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    const { data: prd, error } = await supabase
      .from('prds')
      .insert({
        'drive-link': driveLink,
        'user': session.user.email,
        'title': title,
        'description': description || '',
        'status': 'planned',
        'priority_order': 0,
        'last_updated_by': session.user.email
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating PRD:', error)
      return NextResponse.json({ 
        error: 'Failed to create PRD', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('PRD created successfully:', prd.id)
    
    return NextResponse.json({ 
      success: true, 
      id: prd.id,
      prd: prd
    })

  } catch (error) {
    console.error('POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}