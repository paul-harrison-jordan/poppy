'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StrategicDashboard from '@/components/StrategicDashboard';
import MorningBrief from '@/components/MorningBrief';
import { AgentSquadManager } from '@/services/AgentSquadManager';
import type { 
  StrategicDashboard as StrategicDashboardType, 
  MorningBrief as MorningBriefType
} from '@/types/agentMode';

export default function AgentModePage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'brief'>('brief');
  const [squadManager] = useState(() => new AgentSquadManager());
  const [dashboard, setDashboard] = useState<StrategicDashboardType | null>(null);
  const [morningBrief, setMorningBrief] = useState<MorningBriefType | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeAgentMode = useCallback(async () => {
    try {
      // Initialize dashboard data
      const dashboardData: StrategicDashboardType = {
        quarters: {
          'Q1 2024': {
            quarter: 'Q1 2024',
            theme: 'Improve Customer Retention',
            objectives: [
              {
                id: '1',
                description: 'Reduce churn by 15%',
                target: '15% reduction',
                progress: 67,
                status: 'in_progress'
              },
              {
                id: '2', 
                description: 'Increase NPS to 50',
                target: 'NPS 50+',
                progress: 45,
                status: 'in_progress'
              }
            ],
            agent_proposals: [],
            status: 'executing'
          }
        },
        productVision: {
          northStar: 'Become the operating system for modern marketing',
          currentProgress: 0.34,
          gaps: ['No mobile experience', 'Limited AI capabilities'],
          opportunities: [
            {
              id: '1',
              headline: 'Mobile-first redesign opportunity',
              whyNow: 'Mobile usage increased 60% this quarter',
              whatItMeans: 'Capture mobile-first users before competitors',
              recommendation: 'Prioritize mobile app development',
              effortVsImpact: 0.85,
              confidence: 0.78,
              createdAt: new Date().toISOString(),
              source: 'market_analysis'
            }
          ],
          lastUpdated: new Date().toISOString()
        },
        activeSquads: squadManager.getActiveSquads(),
        pendingDirectives: [],
        recentAlerts: []
      };

      // Generate morning brief from API
      const briefResponse = await fetch('/api/agent-mode/morning-brief');
      const briefData = await briefResponse.json();
      const brief = briefData.success ? briefData.brief : null;

      setDashboard(dashboardData);
      setMorningBrief(brief);
    } catch (error) {
      console.error('Failed to initialize agent mode:', error);
    } finally {
      setLoading(false);
    }
  }, [squadManager]);

  useEffect(() => {
    initializeAgentMode();
  }, [initializeAgentMode]);

  const handleDirectiveSubmit = async (directive: string, urgency: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      setLoading(true);
      
      // Call the API to deploy squad
      const response = await fetch('/api/agent-mode/deploy-squad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          directive,
          urgency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deploy squad');
      }

      const result = await response.json();
      console.log('Squad deployed:', result);

      // Update dashboard with new squad
      if (dashboard && result.success) {
        const newSquad = result.squad;
        setDashboard({
          ...dashboard,
          activeSquads: [...dashboard.activeSquads, newSquad]
        });

        // Show success notification with real data
        alert(`Squad deployed successfully!\n\nSquad: ${newSquad.name}\nMission: ${newSquad.mission}\nEstimated completion: ${newSquad.estimatedCompletion}\n\nAgents working: ${newSquad.agents.join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to process directive:', error);
      alert('Failed to deploy squad. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProposalDecision = async (proposalId: string, decision: 'approve' | 'iterate' | 'defer' | 'reject') => {
    try {
      const response = await fetch('/api/agent-mode/morning-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'proposal_decision',
          data: { proposalId, decision }
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        // Refresh morning brief to reflect changes
        const briefResponse = await fetch('/api/agent-mode/morning-brief');
        const briefData = await briefResponse.json();
        if (briefData.success) {
          setMorningBrief(briefData.brief);
        }
      }
    } catch (error) {
      console.error('Failed to process proposal decision:', error);
      alert('Failed to process decision. Please try again.');
    }
  };

  const handleSquadAction = async (squadId: string, action: 'pause' | 'accelerate' | 'redirect') => {
    try {
      const requestData: { action: string; data?: { newDirective: string } } = { action };
      
      if (action === 'redirect') {
        const newDirective = prompt('Enter new directive for this squad:');
        if (!newDirective) return;
        requestData.data = { newDirective };
      }

      const response = await fetch(`/api/agent-mode/squad-status/${squadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      if (result.success) {
        // Update dashboard with updated squad
        if (dashboard) {
          const updatedSquads = dashboard.activeSquads.map(squad => 
            squad.id === squadId ? result.squad : squad
          );
          setDashboard({
            ...dashboard,
            activeSquads: updatedSquads
          });
        }

        alert(result.message);
      }
    } catch (error) {
      console.error(`Failed to ${action} squad:`, error);
      alert(`Failed to ${action} squad. Please try again.`);
    }
  };

  const handleBriefSquadAction = async (squadId: string, action: 'review' | 'provide_input') => {
    if (action === 'provide_input') {
      const input = prompt('Provide input for the squad:');
      if (input) {
        try {
          const response = await fetch(`/api/agent-mode/squad-status/${squadId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'provide_input',
              data: { input }
            }),
          });

          const result = await response.json();
          if (result.success) {
            alert('Input provided to squad. They will incorporate your feedback.');
            // Refresh morning brief
            const briefResponse = await fetch('/api/agent-mode/morning-brief');
            const briefData = await briefResponse.json();
            if (briefData.success) {
              setMorningBrief(briefData.brief);
            }
          }
        } catch (error) {
          console.error('Failed to provide input:', error);
          alert('Failed to provide input. Please try again.');
        }
      }
    } else {
      // Navigate to squad details
      setActiveView('dashboard');
    }
  };

  const handleOpportunityAction = async (opportunityId: string, action: 'explore' | 'dismiss') => {
    try {
      const response = await fetch('/api/agent-mode/morning-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'opportunity_action',
          data: { opportunityId, opportunityAction: action }
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        // Refresh morning brief
        const briefResponse = await fetch('/api/agent-mode/morning-brief');
        const briefData = await briefResponse.json();
        if (briefData.success) {
          setMorningBrief(briefData.brief);
        }
      }
    } catch (error) {
      console.error('Failed to process opportunity action:', error);
      alert('Failed to process action. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 ml-64 pt-16 flex items-center justify-center">
        <div className="os-panel p-space-8 flex flex-col items-center gap-space-4">
          <div className="loading-spinner loading-spinner--lg"></div>
          <div className="text-center">
            <span className="text-poppy-primary font-semibold">Initializing Agent Mode</span>
            <p className="text-warm-neutral text-sm mt-1">Setting up your strategic command center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 pt-16">
      <div className="p-space-6">
        {/* Navigation */}
        <div className="flex gap-space-4 mb-space-6">
          <button
            onClick={() => setActiveView('brief')}
            className={`px-space-4 py-space-2 rounded-lg font-medium transition-colors ${
              activeView === 'brief' 
                ? 'bg-poppy-primary text-white' 
                : 'text-poppy-primary hover:bg-poppy-primary/10'
            }`}
          >
            Morning Brief
          </button>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-space-4 py-space-2 rounded-lg font-medium transition-colors ${
              activeView === 'dashboard' 
                ? 'bg-poppy-primary text-white' 
                : 'text-poppy-primary hover:bg-poppy-primary/10'
            }`}
          >
            Strategic Dashboard
          </button>
        </div>

        {/* Content */}
        {activeView === 'brief' && morningBrief && (
          <MorningBrief
            brief={morningBrief}
            onProposalAction={handleProposalDecision}
            onSquadAction={handleBriefSquadAction}
            onOpportunityAction={handleOpportunityAction}
          />
        )}

        {activeView === 'dashboard' && dashboard && (
          <StrategicDashboard
            dashboard={dashboard}
            onDirectiveSubmit={handleDirectiveSubmit}
            onProposalDecision={handleProposalDecision}
            onSquadAction={handleSquadAction}
          />
        )}
      </div>
    </div>
  );
}