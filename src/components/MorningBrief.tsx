'use client';

import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  TrendingUp, 
  Users, 
  Zap,
  ArrowRight,
  Calendar,
  Target
} from 'lucide-react';
import type { MorningBrief as MorningBriefType, MorningBriefUpdate } from '@/types/agentMode';

interface MorningBriefProps {
  brief: MorningBriefType;
  onProposalAction: (proposalId: string, action: 'approve' | 'iterate' | 'defer' | 'reject') => void;
  onSquadAction: (squadId: string, action: 'review' | 'provide_input') => void;
  onOpportunityAction: (opportunityId: string, action: 'explore' | 'dismiss') => void;
}

export default function MorningBrief({ 
  brief, 
  onProposalAction, 
  onSquadAction, 
  onOpportunityAction 
}: MorningBriefProps) {
  const getUpdateTypeIcon = (type: MorningBriefUpdate['type']) => {
    switch (type) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-sprout-success" />;
      case 'decision_needed': return <AlertTriangle className="w-5 h-5 text-orange-500 animate-pulse" />;
      case 'progress': return <TrendingUp className="w-5 h-5 text-poppy-primary" />;
      case 'blocked': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-warm-neutral" />;
    }
  };

  const getUpdateTypeColor = (type: MorningBriefUpdate['type']) => {
    switch (type) {
      case 'completed': return 'border-l-sprout-success bg-sprout-success/5';
      case 'decision_needed': return 'border-l-orange-500 bg-orange-50';
      case 'progress': return 'border-l-poppy-primary bg-poppy-primary/5';
      case 'blocked': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-warm-neutral bg-warm-neutral/5';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-sprout-success';
    if (confidence >= 0.6) return 'text-poppy-primary';
    if (confidence >= 0.4) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="os-panel p-space-6">
        <div className="flex items-center justify-between mb-space-4">
          <div>
            <h1 className="text-3xl font-bold text-poppy-primary flex items-center gap-space-3">
              <Calendar className="w-8 h-8" />
              Morning Brief
            </h1>
            <p className="text-warm-neutral">{brief.date}</p>
          </div>
          <div className="grid grid-cols-3 gap-space-4 text-center">
            <div className="os-panel p-space-3">
              <div className="text-2xl font-bold text-poppy-primary">{brief.squadUpdates.length}</div>
              <div className="text-sm text-warm-neutral">Active Squads</div>
            </div>
            <div className="os-panel p-space-3">
              <div className="text-2xl font-bold text-orange-500">{brief.decisionsNeeded}</div>
              <div className="text-sm text-warm-neutral">Decisions Needed</div>
            </div>
            <div className="os-panel p-space-3">
              <div className="text-2xl font-bold text-sprout-success">{brief.proposalsReady.length}</div>
              <div className="text-sm text-warm-neutral">Proposals Ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals Ready for Review */}
      {brief.proposalsReady.length > 0 && (
        <div className="os-panel">
          <div className="p-space-6 border-b border-border">
            <h2 className="text-xl font-bold text-poppy-primary flex items-center gap-space-2">
              <Target className="w-6 h-6" />
              Proposals Ready for Decision
            </h2>
            <p className="text-warm-neutral">Strategic recommendations requiring your review</p>
          </div>
          <div className="divide-y divide-border">
            {brief.proposalsReady.map((proposal) => (
              <div key={proposal.id} className="p-space-6">
                <div className="flex items-start justify-between mb-space-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-space-1">{proposal.title}</h3>
                    <p className="text-warm-neutral mb-space-2">{proposal.tldr}</p>
                    <div className="flex items-center gap-space-4 text-sm">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-sprout-success" />
                        {proposal.impact}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-poppy-primary" />
                        {proposal.effort} effort
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-warm-neutral" />
                        {proposal.readTime}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-2">
                  <button
                    onClick={() => onProposalAction(proposal.id, 'approve')}
                    className="px-space-4 py-space-2 bg-sprout-success text-white rounded-lg hover:bg-sprout-success/90 transition-colors text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onProposalAction(proposal.id, 'iterate')}
                    className="px-space-4 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary/90 transition-colors text-sm font-medium"
                  >
                    Iterate
                  </button>
                  <button
                    onClick={() => onProposalAction(proposal.id, 'defer')}
                    className="px-space-4 py-space-2 border border-border hover:bg-warm-neutral/10 transition-colors text-sm font-medium rounded-lg"
                  >
                    Defer
                  </button>
                  <button
                    onClick={() => onProposalAction(proposal.id, 'reject')}
                    className="px-space-4 py-space-2 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium rounded-lg"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Squad Updates */}
      <div className="os-panel">
        <div className="p-space-6 border-b border-border">
          <h2 className="text-xl font-bold text-poppy-primary flex items-center gap-space-2">
            <Users className="w-6 h-6" />
            Squad Updates
          </h2>
          <p className="text-warm-neutral">Progress from your active agent squads</p>
        </div>
        <div className="divide-y divide-border">
          {brief.squadUpdates.map((update) => (
            <div key={update.squadId} className={`p-space-6 border-l-4 ${getUpdateTypeColor(update.type)}`}>
              <div className="flex items-start justify-between mb-space-3">
                <div className="flex items-start gap-space-3">
                  {getUpdateTypeIcon(update.type)}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-space-1">{update.squadName}</h3>
                    <p className="text-warm-neutral mb-space-2">{update.update}</p>
                    <div className="flex items-center gap-space-4 text-sm">
                      <span className={`font-medium ${getConfidenceColor(update.confidence)}`}>
                        {Math.round(update.confidence * 100)}% confidence
                      </span>
                      {update.options && (
                        <span className="text-orange-600">
                          {update.options.length} options available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {update.needsInput && (
                  <div className="flex items-center gap-space-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <button
                      onClick={() => onSquadAction(update.squadId, 'provide_input')}
                      className="px-space-3 py-space-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      Provide Input
                    </button>
                  </div>
                )}
              </div>
              
              {update.options && (
                <div className="ml-8 space-y-2">
                  <p className="text-sm font-medium text-warm-neutral">Available options:</p>
                  <ul className="space-y-1">
                    {update.options.map((option, idx) => (
                      <li key={idx} className="text-sm text-warm-neutral flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        {option}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Alerts */}
      {brief.strategicAlerts.length > 0 && (
        <div className="os-panel">
          <div className="p-space-6 border-b border-border">
            <h2 className="text-xl font-bold text-poppy-primary flex items-center gap-space-2">
              <AlertTriangle className="w-6 h-6" />
              Strategic Alerts
            </h2>
            <p className="text-warm-neutral">Proactive opportunities and risks detected</p>
          </div>
          <div className="divide-y divide-border">
            {brief.strategicAlerts.map((alert) => (
              <div key={alert.id} className="p-space-6">
                <div className="flex items-start justify-between mb-space-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-space-2 mb-space-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                        alert.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                        alert.urgency === 'medium' ? 'bg-poppy-primary/10 text-poppy-primary' :
                        'bg-warm-neutral/10 text-warm-neutral'
                      }`}>
                        {alert.urgency} priority
                      </span>
                      <span className="text-xs text-warm-neutral">{alert.type}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-space-1">{alert.headline}</h3>
                    <p className="text-warm-neutral mb-space-2">{alert.summary}</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Impact:</span> {alert.implication}</p>
                      <p><span className="font-medium">Recommendation:</span> {alert.recommendation}</p>
                      <p><span className="font-medium">Effort:</span> {alert.effortRequired}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-2">
                  <button className="px-space-4 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary/90 transition-colors text-sm font-medium">
                    Act on This
                  </button>
                  <button className="px-space-4 py-space-2 border border-border hover:bg-warm-neutral/10 transition-colors text-sm font-medium rounded-lg">
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {brief.opportunities.length > 0 && (
        <div className="os-panel">
          <div className="p-space-6 border-b border-border">
            <h2 className="text-xl font-bold text-poppy-primary flex items-center gap-space-2">
              <Zap className="w-6 h-6" />
              Strategic Opportunities
            </h2>
            <p className="text-warm-neutral">New opportunities identified by your agent squads</p>
          </div>
          <div className="divide-y divide-border">
            {brief.opportunities.map((opportunity) => (
              <div key={opportunity.id} className="p-space-6">
                <div className="flex items-start justify-between mb-space-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-space-1">{opportunity.headline}</h3>
                    <p className="text-warm-neutral mb-space-2">{opportunity.whyNow}</p>
                    <p className="text-sm"><span className="font-medium">Strategic Impact:</span> {opportunity.whatItMeans}</p>
                  </div>
                  <div className="text-sm text-right">
                    <div className="font-medium text-sprout-success">
                      Impact: {Math.round(opportunity.effortVsImpact * 100)}%
                    </div>
                    <div className="text-warm-neutral">
                      {Math.round(opportunity.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-2">
                  <button
                    onClick={() => onOpportunityAction(opportunity.id, 'explore')}
                    className="px-space-4 py-space-2 bg-sprout-success text-white rounded-lg hover:bg-sprout-success/90 transition-colors text-sm font-medium"
                  >
                    Explore Opportunity
                  </button>
                  <button
                    onClick={() => onOpportunityAction(opportunity.id, 'dismiss')}
                    className="px-space-4 py-space-2 border border-border hover:bg-warm-neutral/10 transition-colors text-sm font-medium rounded-lg"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}