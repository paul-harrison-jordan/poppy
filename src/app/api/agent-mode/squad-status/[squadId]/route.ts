import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo - in production this would be a database
const squadStorage = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  try {
    const { squadId } = await params;
    
    if (!squadId) {
      return NextResponse.json(
        { error: 'Squad ID is required' },
        { status: 400 }
      );
    }

    // Get squad from storage or return mock data
    let squad = squadStorage.get(squadId);
    
    if (!squad) {
      // Create mock squad status for demo
      squad = {
        id: squadId,
        name: 'Retention Squad',
        agents: ['ChurnAnalyzer', 'UserJourneyMapper', 'FeatureUsageAnalyzer'],
        mission: 'Analyze customer retention challenges',
        status: 'Analysis complete - proposals ready',
        progress: 100,
        deliverables: ['Churn analysis report', 'User journey mapping', 'Retention strategy proposals'],
        needsInput: true,
        estimatedCompletion: 'Completed',
        results: [
          {
            agent: 'ChurnAnalyzer',
            result: {
              churnRate: '12%',
              primaryReasons: ['Poor onboarding experience', 'Limited feature adoption', 'Lack of customer success engagement'],
              segments: {
                'SMB': '15% churn',
                'Mid-market': '8% churn', 
                'Enterprise': '5% churn'
              }
            },
            confidence: 0.85,
            timestamp: new Date().toISOString()
          },
          {
            agent: 'UserJourneyMapper',
            result: {
              criticalDropOffPoints: [
                'Day 3: Post-signup activation',
                'Day 14: First value realization',
                'Month 3: Feature discovery'
              ],
              recommendations: [
                'Implement guided onboarding flow',
                'Add progress indicators',
                'Create feature discovery prompts'
              ]
            },
            confidence: 0.78,
            timestamp: new Date().toISOString()
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      squadStorage.set(squadId, squad);
    }

    return NextResponse.json({
      success: true,
      squad
    });

  } catch (error) {
    console.error('Error getting squad status:', error);
    return NextResponse.json(
      { error: 'Failed to get squad status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  try {
    const { squadId } = await params;
    const { action, data } = await request.json();
    
    if (!squadId) {
      return NextResponse.json(
        { error: 'Squad ID is required' },
        { status: 400 }
      );
    }

    const squad = squadStorage.get(squadId);
    if (!squad) {
      return NextResponse.json(
        { error: 'Squad not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'pause':
        squad.status = 'Paused - awaiting PM direction';
        squad.progress = Math.max(0, squad.progress - 10);
        break;
        
      case 'accelerate':
        squad.status = 'Accelerated - additional resources deployed';
        squad.progress = Math.min(100, squad.progress + 20);
        const completion = new Date();
        completion.setHours(completion.getHours() + 2);
        squad.estimatedCompletion = completion.toLocaleDateString('en-US', { 
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit'
        });
        break;
        
      case 'redirect':
        squad.mission = data.newDirective || squad.mission;
        squad.status = 'Redirected - analyzing new directive';
        squad.progress = Math.max(25, squad.progress - 30);
        squad.needsInput = false;
        break;
        
      case 'provide_input':
        squad.status = 'Input received - incorporating feedback';
        squad.needsInput = false;
        squad.progress = Math.min(100, squad.progress + 15);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    squad.lastUpdated = new Date().toISOString();
    squadStorage.set(squadId, squad);

    return NextResponse.json({
      success: true,
      squad,
      message: `Squad ${action} successful`
    });

  } catch (error) {
    console.error('Error updating squad:', error);
    return NextResponse.json(
      { error: 'Failed to update squad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}