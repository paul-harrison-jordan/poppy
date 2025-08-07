'use client';

import React, { useState } from 'react';
import { 
  Target, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  PauseCircle,
  Eye,
  Lightbulb,
  Zap
} from 'lucide-react';
import type { 
  StrategicDashboard as StrategicDashboardType
} from '@/types/agentMode';

interface StrategicDashboardProps {
  dashboard: StrategicDashboardType;
  onDirectiveSubmit: (directive: string, urgency: 'low' | 'medium' | 'high' | 'critical') => void;
  onProposalDecision: (proposalId: string, decision: 'approve' | 'iterate' | 'defer' | 'reject') => void;
  onSquadAction: (squadId: string, action: 'pause' | 'accelerate' | 'redirect') => void;
}

export default function StrategicDashboard({ 
  dashboard, 
  onDirectiveSubmit, 
  onSquadAction 
}: StrategicDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'squads' | 'vision' | 'proposals'>('overview');
  const [directiveInput, setDirectiveInput] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-sprout-success bg-sprout-success/10';
      case 'in_progress': case 'executing': return 'text-poppy-primary bg-poppy-primary/10';
      case 'at_risk': return 'text-orange-600 bg-orange-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-warm-neutral bg-warm-neutral/10';
    }
  };

  // Utility function for potential future use
  // const getUrgencyColor = (urgency: string) => {
  //   switch (urgency) {
  //     case 'critical': return 'text-red-600 bg-red-100 border-red-200';
  //     case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
  //     case 'medium': return 'text-poppy-primary bg-poppy-primary/10 border-poppy-primary/20';
  //     case 'low': return 'text-warm-neutral bg-warm-neutral/10 border-warm-neutral/20';
  //     default: return 'text-warm-neutral bg-warm-neutral/10 border-warm-neutral/20';
  //   }
  // };

  const renderQuarterlyOverview = () => {
    const currentQuarter = Object.entries(dashboard.quarters)[0]?.[1];
    if (!currentQuarter) return null;

    return (
      <div className="space-y-6">
        {/* Current Quarter Focus */}
        <div className="os-panel p-space-6">
          <div className="flex items-center justify-between mb-space-4">
            <h3 className="text-xl font-bold text-poppy-primary">Current Quarter Focus</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentQuarter.status)}`}>
              {currentQuarter.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mb-space-4">
            <h4 className="text-lg font-semibold mb-space-2">{currentQuarter.theme}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
              {currentQuarter.objectives.map((objective, idx) => (
                <div key={idx} className="border border-border rounded-lg p-space-4">
                  <div className="flex items-center justify-between mb-space-2">
                    <span className="font-medium">{objective.description}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(objective.status)}`}>
                      {objective.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-warm-neutral/20 rounded-full h-2">
                    <div 
                      className="bg-poppy-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${objective.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vision Progress */}
        <div className="os-panel p-space-6">
          <div className="flex items-center gap-space-3 mb-space-4">
            <Target className="w-6 h-6 text-poppy-primary" />
            <h3 className="text-xl font-bold text-poppy-primary">Vision Progress</h3>
          </div>
          <div className="mb-space-4">
            <p className="text-lg font-medium mb-space-2">{dashboard.productVision.northStar}</p>
            <div className="flex items-center gap-space-4 mb-space-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Progress</span>
                  <span className="font-medium">{Math.round(dashboard.productVision.currentProgress * 100)}%</span>
                </div>
                <div className="w-full bg-warm-neutral/20 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-poppy-primary to-sprout-success h-3 rounded-full transition-all duration-500"
                    style={{ width: `${dashboard.productVision.currentProgress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
            <div>
              <h4 className="font-semibold mb-space-2 text-red-600">Current Gaps</h4>
              <ul className="space-y-1">
                {dashboard.productVision.gaps.map((gap, idx) => (
                  <li key={idx} className="text-sm text-warm-neutral flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-space-2 text-sprout-success">Opportunities</h4>
              <ul className="space-y-1">
                {dashboard.productVision.opportunities.slice(0, 3).map((opp, idx) => (
                  <li key={idx} className="text-sm text-warm-neutral flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-sprout-success" />
                    {opp.headline}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Active Squads Summary */}
        <div className="os-panel p-space-6">
          <div className="flex items-center gap-space-3 mb-space-4">
            <Users className="w-6 h-6 text-poppy-primary" />
            <h3 className="text-xl font-bold text-poppy-primary">Active Agent Squads</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-4">
            {dashboard.activeSquads.map((squad) => (
              <div key={squad.id} className="border border-border rounded-lg p-space-4 hover:border-poppy-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-space-2">
                  <h4 className="font-semibold">{squad.name}</h4>
                  {squad.needsInput && (
                    <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                  )}
                </div>
                <p className="text-sm text-warm-neutral mb-space-3">{squad.mission}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{squad.status}</span>
                  <div className="w-12 h-2 bg-warm-neutral/20 rounded-full">
                    <div 
                      className="bg-poppy-primary h-2 rounded-full"
                      style={{ width: `${squad.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSquadDetails = () => (
    <div className="space-y-6">
      {dashboard.activeSquads.map((squad) => (
        <div key={squad.id} className="os-panel p-space-6">
          <div className="flex items-center justify-between mb-space-4">
            <div>
              <h3 className="text-xl font-bold text-poppy-primary">{squad.name}</h3>
              <p className="text-warm-neutral">{squad.mission}</p>
            </div>
            <div className="flex items-center gap-space-2">
              {squad.needsInput && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium animate-pulse">
                  Input Needed
                </span>
              )}
              <button
                onClick={() => onSquadAction(squad.id, 'pause')}
                className="p-2 hover:bg-warm-neutral/10 rounded-lg transition-colors"
              >
                <PauseCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-4 mb-space-4">
            <div>
              <h4 className="font-semibold mb-space-2">Agents</h4>
              <ul className="space-y-1">
                {squad.agents.map((agent, idx) => (
                  <li key={idx} className="text-sm text-warm-neutral">{agent}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-space-2">Deliverables</h4>
              <ul className="space-y-1">
                {squad.deliverables.map((deliverable, idx) => (
                  <li key={idx} className="text-sm text-warm-neutral flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sprout-success" />
                    {deliverable}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-space-2">Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>{squad.progress}%</span>
                </div>
                <div className="w-full bg-warm-neutral/20 rounded-full h-2">
                  <div 
                    className="bg-poppy-primary h-2 rounded-full"
                    style={{ width: `${squad.progress}%` }}
                  />
                </div>
                {squad.estimatedCompletion && (
                  <p className="text-sm text-warm-neutral">
                    Est. completion: {squad.estimatedCompletion}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-border pt-space-4">
            <p className="text-sm font-medium mb-space-2">Current Status:</p>
            <p className="text-sm text-warm-neutral">{squad.status}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-space-6">
      {/* Strategic Directive Input */}
      <div className="os-panel p-space-6 mb-space-6">
        <h2 className="text-2xl font-bold text-poppy-primary mb-space-4">Strategic Command Center</h2>
        <div className="flex gap-space-4">
          <div className="flex-1">
            <textarea
              value={directiveInput}
              onChange={(e) => setDirectiveInput(e.target.value)}
              placeholder="Give a strategic directive... e.g., 'Our churn is too high in the SMB segment - figure out why and what we should build'"
              className="w-full p-space-3 border border-border rounded-lg resize-none h-20 focus:border-poppy-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-space-2">
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
              className="px-space-3 py-space-2 border border-border rounded-lg focus:border-poppy-primary focus:outline-none"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical</option>
            </select>
            <button
              onClick={() => {
                if (directiveInput.trim()) {
                  onDirectiveSubmit(directiveInput, selectedUrgency);
                  setDirectiveInput('');
                }
              }}
              disabled={!directiveInput.trim()}
              className="px-space-4 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Deploy Squad
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-space-1 mb-space-6 border-b border-border">
        {[
          { key: 'overview', label: 'Overview', icon: Target },
          { key: 'squads', label: 'Agent Squads', icon: Users },
          { key: 'vision', label: 'Vision Tracking', icon: TrendingUp },
          { key: 'proposals', label: 'Proposals', icon: Eye }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'overview' | 'squads' | 'vision' | 'proposals')}
            className={`flex items-center gap-space-2 px-space-4 py-space-3 border-b-2 transition-colors ${
              activeTab === key 
                ? 'border-poppy-primary text-poppy-primary' 
                : 'border-transparent text-warm-neutral hover:text-poppy-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && renderQuarterlyOverview()}
        {activeTab === 'squads' && renderSquadDetails()}
        {activeTab === 'vision' && (
          <div className="os-panel p-space-6">
            <p className="text-warm-neutral">Vision tracking details coming soon...</p>
          </div>
        )}
        {activeTab === 'proposals' && (
          <div className="os-panel p-space-6">
            <p className="text-warm-neutral">Proposal review interface coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}