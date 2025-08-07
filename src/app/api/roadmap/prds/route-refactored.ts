import { NextRequest } from 'next/server'
import { withAuthentication } from '@/lib/services/supabaseService'

interface PRD {
  id: string;
  'drive-link': string;
  'v0-link': string;
  user: string;
  title: string;
  description: string;
  status?: string;
  shipped?: boolean;
  priority_order?: number;
  target_quarter?: string;
  estimated_effort_points?: number;
  business_value_score?: number;
  technical_complexity_score?: number;
  dependencies?: Record<string, unknown>;
  risks?: Record<string, unknown>[];
  success_metrics?: Record<string, unknown>[];
  roadmap_notes?: string;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface CreatePRDData {
  title: string;
  driveLink: string;
  description?: string;
}

export async function GET(request: NextRequest) {
  return withAuthentication(async (service) => {
    const { searchParams } = new URL(request.url);
    const filterUser = searchParams.get('user');
    
    // Use filter user if provided, otherwise use authenticated user
    const targetUser = filterUser || service.getUserEmail()!;
    
    // Get PRDs with complex ordering
    const prdsResult = await service.findMany<PRD>(
      'prds',
      [{ column: 'user', operator: 'eq', value: targetUser }],
      {
        select: '*',
        orderBy: [
          { column: 'priority_order', ascending: true },
          { column: 'created_at', ascending: false }
        ]
      }
    );

    if (prdsResult.error) {
      console.error('Error fetching PRDs:', prdsResult.error);
      return {
        error: 'Failed to fetch PRDs',
        status: 500
      };
    }

    const prds = prdsResult.data || [];
    console.log(`Found ${prds.length} PRDs for user: ${targetUser}`);

    if (prds.length === 0) {
      return { data: [], status: 200 };
    }

    // Get related data using raw queries for complex joins
    const prdIds = prds.map(prd => prd.id);
    
    const [
      slackChannelsResult,
      jiraTicketsResult,
      customerFeedbackResult,
      stakeholderSignoffsResult,
      roadmapDataResult
    ] = await Promise.all([
      service.findMany('prd_slack_channels', [
        { column: 'prd_id', operator: 'in', value: prdIds }
      ]),
      service.findMany('prd_jira_tickets', [
        { column: 'prd_id', operator: 'in', value: prdIds }
      ]),
      service.findMany('prd_customer_feedback', [
        { column: 'prd_id', operator: 'in', value: prdIds }
      ]),
      service.findMany('prd_stakeholder_signoffs', [
        { column: 'prd_id', operator: 'in', value: prdIds }
      ]),
      service.findMany('prd_roadmap_data', [
        { column: 'prd_id', operator: 'in', value: prdIds }
      ])
    ]);

    // Transform data to match expected roadmap format
    const roadmapPRDs = prds.map(prd => {
      const legacyRoadmapData = roadmapDataResult.data?.find(rd => rd.prd_id === prd.id);
      
      return {
        id: prd.id,
        'drive-link': prd['drive-link'],
        'v0-link': prd['v0-link'],
        user: prd.user,
        title: prd.title,
        description: prd.description,
        shipped: prd.shipped || prd.status === 'shipped',
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
        slack_channels: slackChannelsResult.data?.filter(sc => sc.prd_id === prd.id) || [],
        jira_tickets: jiraTicketsResult.data?.filter(jt => jt.prd_id === prd.id) || [],
        customer_feedback: customerFeedbackResult.data?.filter(cf => cf.prd_id === prd.id) || [],
        stakeholder_signoffs: stakeholderSignoffsResult.data?.filter(ss => ss.prd_id === prd.id) || []
      };
    });

    return { data: roadmapPRDs, status: 200 };
  });
}

export async function POST(request: NextRequest) {
  return withAuthentication(async (service) => {
    const { title, driveLink, description }: CreatePRDData = await request.json();

    if (!title || !driveLink) {
      return { error: 'Title and driveLink are required', status: 400 };
    }

    const userEmail = service.getUserEmail()!;

    const createData: Partial<PRD> = {
      'drive-link': driveLink,
      'user': userEmail,
      'title': title,
      'description': description || '',
      'status': 'planned',
      'priority_order': 0,
      'last_updated_by': userEmail
    };

    const result = await service.create<PRD>('prds', createData);

    if (result.error) {
      console.error('Error creating PRD:', result.error);
      return { error: 'Failed to create PRD', status: 500 };
    }

    console.log('PRD created successfully:', result.data?.id);
    
    return { 
      data: { 
        success: true, 
        id: result.data?.id,
        prd: result.data
      }, 
      status: 201 
    };
  });
}