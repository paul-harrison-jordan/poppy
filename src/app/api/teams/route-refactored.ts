import { NextRequest } from 'next/server'
import { withAuthentication } from '@/lib/services/supabaseService'

interface Team {
  id: string;
  user_email: string;
  team_name: string;
  team_description?: string;
  default_capacity_hours_per_week: number;
  default_utilization_target: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTeamData {
  team_name: string;
  team_description?: string;
  default_capacity_hours_per_week?: number;
  default_utilization_target?: number;
}

// GET /api/teams - Get all teams for the current user
export async function GET() {
  return withAuthentication(async (service) => {
    // Use the convenience method for user-scoped queries
    const result = await service.findManyForUser<Team>(
      'teams',
      'user_email', // user column name
      [{ column: 'is_active', operator: 'eq', value: true }], // additional filters
      {
        select: `
          *,
          team_members:team_members(
            *,
            engineer:engineers(id, engineer_name, engineer_email, title, skill_tags)
          )
        `,
        orderBy: [{ column: 'team_name', ascending: true }]
      }
    );

    if (result.error) {
      console.error('Error fetching teams:', result.error);
      return { error: 'Failed to fetch teams', status: 500 };
    }

    return { data: { teams: result.data || [] }, status: 200 };
  });
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  return withAuthentication(async (service) => {
    const body: CreateTeamData = await request.json();
    const { 
      team_name, 
      team_description,
      default_capacity_hours_per_week,
      default_utilization_target
    } = body;

    // Validate required fields
    if (!team_name) {
      return { error: 'Team name is required', status: 400 };
    }

    const userEmail = service.getUserEmail()!;

    const createData: Partial<Team> = {
      user_email: userEmail,
      team_name,
      team_description: team_description || undefined,
      default_capacity_hours_per_week: default_capacity_hours_per_week || 40,
      default_utilization_target: default_utilization_target || 0.80,
      is_active: true
    };

    const result = await service.create<Team>('teams', createData);

    if (result.error) {
      console.error('Error creating team:', result.error);
      
      // Handle unique constraint violations
      if (result.error.includes('23505') || result.error.includes('duplicate')) {
        return { error: 'Team name already exists', status: 409 };
      }
      
      return { error: 'Failed to create team', status: 500 };
    }

    return { data: result.data, status: 201 };
  });
}