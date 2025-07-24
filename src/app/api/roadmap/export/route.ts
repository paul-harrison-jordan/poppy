import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const userEmail = searchParams.get('user') || session.user.email
    
    // Only allow users to export their own data unless shared explicitly
    if (userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    // Fetch roadmap data
    const { data: prds, error: prdsError } = await supabase
      .from('prds')
      .select('*')
      .eq('user', userEmail)
      .order('priority_order', { ascending: true })

    if (prdsError) {
      console.error('Error fetching PRDs for export:', prdsError)
      return NextResponse.json({ error: 'Failed to fetch roadmap data' }, { status: 500 })
    }

    const roadmapData = (prds || []).map(prd => ({
      id: prd.id,
      title: prd.title || `Feature #${prd.id}`,
      description: prd.description || '',
      status: prd.status || 'planned',
      priority_order: prd.priority_order || 999,
      target_quarter: prd.target_quarter || '',
      estimated_effort_points: prd.estimated_effort_points || 0,
      business_value_score: prd.business_value_score || 0,
      technical_complexity_score: prd.technical_complexity_score || 0,
      roadmap_notes: prd.roadmap_notes || '',
      created_at: prd.created_at,
      updated_at: prd.updated_at
    }))

    // Handle different export formats
    switch (format.toLowerCase()) {
      case 'csv':
        return exportCSV(roadmapData, userEmail)
      case 'pdf':
        return exportPDF(roadmapData, userEmail)
      case 'presentation':
        return exportPresentation(roadmapData, userEmail)
      case 'json':
      default:
        return NextResponse.json({
          roadmap: roadmapData,
          metadata: {
            user: userEmail.split('@')[0],
            exported_at: new Date().toISOString(),
            total_features: roadmapData.length,
            format: 'json'
          }
        })
    }

  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function exportCSV(data: any[], userEmail: string) {
  const headers = [
    'ID', 'Title', 'Description', 'Status', 'Priority', 'Target Quarter',
    'Effort Points', 'Business Value', 'Technical Complexity', 'Notes', 'Created At'
  ]
  
  const csvContent = [
    headers.join(','),
    ...data.map(item => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      item.status,
      item.priority_order,
      item.target_quarter,
      item.estimated_effort_points,
      item.business_value_score,
      item.technical_complexity_score,
      `"${item.roadmap_notes.replace(/"/g, '""')}"`,
      item.created_at
    ].join(','))
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="roadmap-${userEmail.split('@')[0]}-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

function exportPDF(data: any[], userEmail: string) {
  // For now, return a JSON response with PDF generation instructions
  // In a real implementation, you'd use a library like Puppeteer or PDFKit
  return NextResponse.json({
    message: 'PDF export coming soon',
    format: 'pdf',
    data_preview: data.slice(0, 3),
    instructions: 'Use a PDF generation service or library to convert this data to PDF format'
  })
}

function exportPresentation(data: any[], userEmail: string) {
  // Create a presentation-ready format
  const presentationData = {
    title: `Product Roadmap - ${userEmail.split('@')[0]}`,
    date: new Date().toLocaleDateString(),
    summary: {
      total_features: data.length,
      by_status: data.reduce((acc: any, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {}),
      by_quarter: data.reduce((acc: any, item) => {
        if (item.target_quarter) {
          acc[item.target_quarter] = (acc[item.target_quarter] || 0) + 1
        }
        return acc
      }, {}),
      total_effort: data.reduce((sum, item) => sum + item.estimated_effort_points, 0),
      avg_business_value: data.length > 0 
        ? (data.reduce((sum, item) => sum + item.business_value_score, 0) / data.length).toFixed(1)
        : 0
    },
    features: data.map(item => ({
      title: item.title,
      status: item.status,
      priority: item.priority_order,
      quarter: item.target_quarter,
      value_score: item.business_value_score,
      effort: item.estimated_effort_points,
      description: item.description.length > 200 
        ? item.description.substring(0, 200) + '...' 
        : item.description
    }))
  }

  return NextResponse.json({
    format: 'presentation',
    data: presentationData,
    instructions: 'This format is optimized for creating slides and stakeholder presentations'
  })
} 