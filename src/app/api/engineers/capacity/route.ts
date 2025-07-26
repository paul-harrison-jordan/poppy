import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// GET /api/engineers/capacity - Get team capacity overview
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const weeks = parseInt(searchParams.get('weeks') || '12') // Default to 12 weeks

    const supabase = createServiceClient()
    
    // Get all active engineers
    const { data: engineers, error: engineersError } = await supabase
      .from('engineers')
      .select('*')
      .eq('user_email', session.user.email)
      .eq('is_active', true)
      .order('engineer_name')

    if (engineersError) {
      console.error('Error fetching engineers:', engineersError)
      return NextResponse.json({ error: 'Failed to fetch engineers' }, { status: 500 })
    }

    // Get all assignments for these engineers
    const { data: assignments, error: assignmentsError } = await supabase
      .from('feature_engineer_assignments')
      .select(`
        *,
        prd:prds(id, title, status, weeks_to_ship)
      `)
      .eq('user_email', session.user.email)
      .in('assignment_status', ['planned', 'active'])

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    // Calculate capacity metrics for each engineer
    const capacityData = engineers.map(engineer => {
      const engineerAssignments = assignments.filter(a => a.engineer_id === engineer.id)
      
      // Calculate total allocated weeks
      const totalAllocatedWeeks = engineerAssignments.reduce((sum, assignment) => {
        return sum + (assignment.estimated_weeks || 0)
      }, 0)

      // Calculate capacity based on utilization target and time period
      const weeklyCapacity = (engineer.capacity_hours_per_week / 40) * engineer.utilization_target
      const totalCapacityWeeks = weeklyCapacity * weeks

      // Calculate utilization percentage
      const utilizationPercentage = totalCapacityWeeks > 0 
        ? (totalAllocatedWeeks / totalCapacityWeeks) * 100 
        : 0

      return {
        engineer,
        assignments: engineerAssignments,
        metrics: {
          totalAllocatedWeeks,
          totalCapacityWeeks,
          utilizationPercentage,
          availableWeeks: Math.max(0, totalCapacityWeeks - totalAllocatedWeeks),
          isOverallocated: utilizationPercentage > 100,
          activeFeatures: engineerAssignments.length
        }
      }
    })

    // Calculate team-level metrics
    const teamMetrics = {
      totalEngineers: engineers.length,
      totalCapacityWeeks: capacityData.reduce((sum, e) => sum + e.metrics.totalCapacityWeeks, 0),
      totalAllocatedWeeks: capacityData.reduce((sum, e) => sum + e.metrics.totalAllocatedWeeks, 0),
      totalAvailableWeeks: capacityData.reduce((sum, e) => sum + e.metrics.availableWeeks, 0),
      overallocatedEngineers: capacityData.filter(e => e.metrics.isOverallocated).length,
      averageUtilization: capacityData.length > 0 
        ? capacityData.reduce((sum, e) => sum + e.metrics.utilizationPercentage, 0) / capacityData.length 
        : 0,
      teamUtilizationPercentage: 0  // Will be calculated below
    }

    teamMetrics.teamUtilizationPercentage = teamMetrics.totalCapacityWeeks > 0
      ? (teamMetrics.totalAllocatedWeeks / teamMetrics.totalCapacityWeeks) * 100
      : 0

    return NextResponse.json({
      capacityData,
      teamMetrics,
      period: {
        weeks,
        startDate,
        endDate
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/engineers/capacity/snapshot - Create capacity snapshot
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { snapshot_date, period_type = 'weekly' } = body

    if (!snapshot_date) {
      return NextResponse.json({ 
        error: 'Snapshot date is required' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Get current capacity data
    const capacityResponse = await fetch(
      `${request.nextUrl.origin}/api/engineers/capacity?weeks=1`,
      {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      }
    )

    if (!capacityResponse.ok) {
      return NextResponse.json({ error: 'Failed to get capacity data' }, { status: 500 })
    }

    const { capacityData } = await capacityResponse.json()

    // Create snapshots for each engineer
    const snapshots = []
    for (const engineerCapacity of capacityData) {
      const { engineer, metrics, assignments } = engineerCapacity

      const snapshot = {
        engineer_id: engineer.id,
        user_email: session.user.email,
        snapshot_date,
        period_type,
        total_capacity_hours: engineer.capacity_hours_per_week * engineer.utilization_target,
        allocated_hours: metrics.totalAllocatedWeeks * 40, // Convert weeks to hours
        active_features_count: assignments.length,
        completed_features_count: 0, // Would need additional logic to determine this
        snapshot_data: {
          assignments: assignments.map((a: { prd_id: number; prd?: { title: string }; estimated_weeks: number; percentage_allocation: number; role_on_feature?: string }) => ({
            prd_id: a.prd_id,
            prd_title: a.prd?.title,
            estimated_weeks: a.estimated_weeks,
            percentage_allocation: a.percentage_allocation,
            role_on_feature: a.role_on_feature
          })),
          metrics
        }
      }

      snapshots.push(snapshot)
    }

    // Insert snapshots
    const { data: insertedSnapshots, error } = await supabase
      .from('engineer_capacity_snapshots')
      .upsert(snapshots, { 
        onConflict: 'engineer_id,snapshot_date,period_type' 
      })
      .select()

    if (error) {
      console.error('Error creating snapshots:', error)
      return NextResponse.json({ error: 'Failed to create snapshots' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      snapshots: insertedSnapshots,
      count: insertedSnapshots?.length || 0 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}