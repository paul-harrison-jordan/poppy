import { NextRequest, NextResponse } from 'next/server';
import type { MorningBrief } from '@/types/agentMode';

export async function GET() {
  try {
    // In production, this would aggregate data from multiple sources
    const mockBrief: MorningBrief = {
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      squadUpdates: [
        {
          squadId: 'retention-squad-1',
          squadName: 'Retention Squad',
          update: 'Completed churn analysis. Identified 3 main drivers: poor onboarding (40%), limited feature adoption (35%), and lack of engagement (25%). Ready to present retention strategy proposals.',
          needsInput: true,
          confidence: 0.87,
          options: [
            'Focus on onboarding improvements first',
            'Tackle feature adoption through guided tours',
            'Implement customer success program'
          ],
          type: 'decision_needed'
        },
        {
          squadId: 'competitive-squad-1', 
          squadName: 'Competitive Intel Squad',
          update: 'Market analysis shows competitor X launched similar retention features. However, their implementation has 23% user complaints about complexity. Opportunity for differentiation through simplicity.',
          needsInput: false,
          confidence: 0.72,
          type: 'progress'
        },
        {
          squadId: 'growth-squad-1',
          squadName: 'Growth Squad', 
          update: 'Identified viral loop opportunity in user referrals. Current referral rate is 2.3%, industry benchmark is 8%. Proposing gamified referral system.',
          needsInput: false,
          confidence: 0.81,
          type: 'completed'
        }
      ],
      proposalsReady: [
        {
          id: 'proposal-retention-1',
          title: 'Smart Onboarding Sequence',
          tldr: 'Personalized 3-step onboarding that adapts to user role and company size, reducing time-to-value from 14 days to 3 days',
          impact: 'Est. 40% reduction in early churn, $2.1M ARR impact',
          effort: 'M (2-3 sprints)',
          readTime: '4 min',
          status: 'pending_decision',
          dueDate: 'Today'
        },
        {
          id: 'proposal-growth-1', 
          title: 'Viral Referral System',
          tldr: 'Gamified referral program with points, badges, and rewards to increase organic growth from current 2.3% to target 8%',
          impact: 'Est. 250% increase in organic signups, $1.8M ARR impact',
          effort: 'L (4-5 sprints)',
          readTime: '6 min',
          status: 'pending_decision'
        }
      ],
      opportunities: [
        {
          id: 'opp-mobile-1',
          headline: 'Mobile usage surge creates expansion opportunity',
          whyNow: '67% increase in mobile usage over last quarter, but mobile conversion is 40% lower than desktop',
          whatItMeans: 'Significant untapped revenue from mobile-first user experience',
          recommendation: 'Prioritize mobile app development or responsive redesign',
          effortVsImpact: 0.78,
          confidence: 0.83,
          createdAt: new Date().toISOString(),
          source: 'market_analysis'
        }
      ],
      decisionsNeeded: 2,
      strategicAlerts: [
        {
          id: 'alert-competitive-1',
          type: 'competitive_move',
          headline: 'Competitor X acquired key integration partner',
          summary: 'Major competitor acquired Zapier-like integration platform, potentially blocking our integration strategy',
          implication: 'Risk of being locked out of key integration ecosystem, could impact enterprise deals',
          recommendation: 'Accelerate native integration development or find alternative partnership',
          estimatedImpact: 'Potential $3M ARR risk if enterprise integration deals stall',
          effortRequired: 'Redirect Platform Squad for 6 weeks',
          urgency: 'high',
          createdAt: new Date().toISOString()
        }
      ]
    };

    return NextResponse.json({
      success: true,
      brief: mockBrief
    });

  } catch (error) {
    console.error('Error generating morning brief:', error);
    return NextResponse.json(
      { error: 'Failed to generate morning brief', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'proposal_decision':
        const { proposalId, decision } = data;
        
        // In production, this would update proposal status and trigger next steps
        console.log(`Proposal ${proposalId} decision: ${decision}`);
        
        let message = '';
        switch (decision) {
          case 'approve':
            message = 'Proposal approved. Engineering squad will be notified to begin implementation.';
            break;
          case 'iterate':
            message = 'Proposal sent back for iteration. Squad will refine based on your feedback.';
            break;
          case 'defer':
            message = 'Proposal deferred to next quarter planning cycle.';
            break;
          case 'reject':
            message = 'Proposal rejected. Squad will be redirected to alternative solutions.';
            break;
        }
        
        return NextResponse.json({
          success: true,
          message
        });

      case 'opportunity_action':
        const { opportunityId, opportunityAction } = data;
        
        console.log(`Opportunity ${opportunityId} action: ${opportunityAction}`);
        
        const opportunityMessage = opportunityAction === 'explore' 
          ? 'Exploration squad deployed to investigate opportunity further. Initial findings expected in 2 days.'
          : 'Opportunity dismissed and will not appear in future briefs.';
          
        return NextResponse.json({
          success: true,
          message: opportunityMessage
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing morning brief action:', error);
    return NextResponse.json(
      { error: 'Failed to process action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}