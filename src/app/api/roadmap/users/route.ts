import { NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET() {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    // Get distinct users who have created PRDs
    const { data: users, error } = await supabase
      .from('prds')
      .select('user')
      .not('user', 'is', null)

    if (error) {
      console.error('Error fetching PRD users:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch users', 
        details: error.message 
      }, { status: 500 })
    }

    // Extract unique users and sort them
    const uniqueUsers = [...new Set(users?.map(u => u.user) || [])]
      .filter(Boolean)
      .sort()

    return NextResponse.json({ users: uniqueUsers })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 