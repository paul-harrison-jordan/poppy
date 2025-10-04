'use client';

import React, { useState } from 'react';
import PMProfileCreation from '@/components/batch-prd/PMProfileCreation';
import BatchFeatureInput from '@/components/batch-prd/BatchFeatureInput';
import BatchReviewInterface from '@/components/batch-prd/BatchReviewInterface';
import { PMPreferenceProfile, FeatureInput, ProposedContent, BatchPRDSession } from '@/types/knowledge';

type Step = 'profile' | 'features' | 'generating' | 'review' | 'generating-prds' | 'complete';

export default function BatchPRDPage() {
  const [step, setStep] = useState<Step>('profile');
  const [pmProfile, setPmProfile] = useState<Partial<PMPreferenceProfile> | null>(null);
  const [features, setFeatures] = useState<FeatureInput[]>([]);
  const [proposedContent, setProposedContent] = useState<ProposedContent[]>([]);
  const [generatedPRDs, setGeneratedPRDs] = useState<Array<{
    featureId: string;
    featureName: string;
    title?: string;
    markdown?: string;
    googleDocUrl?: string;
    docId?: string;
    error?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleProfileCreated = (profile: Partial<PMPreferenceProfile>) => {
    console.log('[BatchPRD] PM profile created:', profile);
    setPmProfile(profile);
    setStep('features');
  };

  const handleFeaturesSubmit = async (submittedFeatures: FeatureInput[]) => {
    console.log('[BatchPRD] Features submitted:', submittedFeatures);
    setFeatures(submittedFeatures);
    setStep('generating');
    setError(null);

    try {
      // Create session
      const sessionRes = await fetch('/api/batch-prd/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: submittedFeatures.map(f => ({ name: f.name }))
        })
      });

      if (!sessionRes.ok) {
        throw new Error('Failed to create session');
      }

      const sessionData = await sessionRes.json();
      const newSession: BatchPRDSession = {
        ...sessionData.session,
        features: submittedFeatures
      };

      // Generate content
      console.log('[BatchPRD] Generating content for features...');

      // Pull existing teamTerms from localStorage to inform vocab generation
      const existingTeamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}');
      console.log(`[BatchPRD] Using ${Object.keys(existingTeamTerms).length} existing team terms for smart vocab generation`);

      const contentRes = await fetch('/api/batch-prd/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSession: newSession,
          pmProfile: pmProfile as PMPreferenceProfile,
          teamTerms: existingTeamTerms
        })
      });

      if (!contentRes.ok) {
        throw new Error('Failed to generate content');
      }

      const contentData = await contentRes.json();
      console.log('[BatchPRD] Content generated:', contentData);
      setProposedContent(contentData.proposedContent);
      setStep('review');
    } catch (err) {
      console.error('[BatchPRD] Error generating content:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate content');
      setStep('features');
    }
  };

  const handleApprove = async (approvedContent: ProposedContent[]) => {
    console.log('[BatchPRD] Content approved:', approvedContent);
    setProposedContent(approvedContent);
    setStep('generating-prds');
    setError(null);

    try {
      console.log('[BatchPRD] Generating PRDs...');

      // Pull all context from localStorage (like draft-prd flow does)
      const existingTeamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}');

      // Save approved terms to localStorage for future learning
      const newTerms: Record<string, string> = {};
      approvedContent.forEach(content => {
        content.terms.filter(t => t.approved).forEach(term => {
          newTerms[term.term] = term.definition;
        });
      });

      const mergedTeamTerms = { ...existingTeamTerms, ...newTerms };
      localStorage.setItem('teamTerms', JSON.stringify(mergedTeamTerms));
      console.log(`[BatchPRD] Saved ${Object.keys(newTerms).length} new terms to localStorage`);

      const personalContext = localStorage.getItem('personalContext') || '';

      const prdsRes = await fetch('/api/batch-prd/generate-prds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          proposedContent: approvedContent,
          pmProfile: pmProfile as PMPreferenceProfile,
          teamTerms: mergedTeamTerms,
          personalContext
        })
      });

      if (!prdsRes.ok) {
        throw new Error('Failed to generate PRDs');
      }

      const prdsData = await prdsRes.json();
      console.log('[BatchPRD] PRDs generated:', prdsData);
      setGeneratedPRDs(prdsData.prds);
      setStep('complete');
    } catch (err) {
      console.error('[BatchPRD] Error generating PRDs:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PRDs');
      setStep('review');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${step === 'profile' ? 'text-blue-600' : 'text-gray-600'}`}>
              1. Profile
            </span>
            <span className={`text-sm font-semibold ${step === 'features' || step === 'generating' ? 'text-blue-600' : 'text-gray-600'}`}>
              2. Features
            </span>
            <span className={`text-sm font-semibold ${step === 'review' ? 'text-blue-600' : 'text-gray-600'}`}>
              3. Review
            </span>
            <span className={`text-sm font-semibold ${step === 'generating-prds' || step === 'complete' ? 'text-blue-600' : 'text-gray-600'}`}>
              4. Generate
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: step === 'profile' ? '25%' :
                       step === 'features' || step === 'generating' ? '50%' :
                       step === 'review' ? '75%' : '100%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      {step === 'profile' && (
        <PMProfileCreation
          onProfileCreated={handleProfileCreated}
          onSkip={() => {
            setPmProfile(null);
            setStep('features');
          }}
        />
      )}

      {step === 'features' && (
        <BatchFeatureInput
          onFeaturesSubmit={handleFeaturesSubmit}
          onBack={() => setStep('profile')}
        />
      )}

      {step === 'generating' && (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Generating Content...</h2>
          <p className="text-gray-700 mb-6">
            Poppy is searching for term definitions and question answers for your features.
            This may take a few minutes.
          </p>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <BatchReviewInterface
          features={features}
          proposedContent={proposedContent}
          onApprove={handleApprove}
          onBack={() => setStep('features')}
        />
      )}

      {step === 'generating-prds' && (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Generating PRDs...</h2>
          <p className="text-gray-700 mb-6">
            Poppy is generating full PRD documents for your approved features.
            This may take a few minutes.
          </p>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">PRDs Generated Successfully!</h2>
          <p className="text-gray-700 mb-6">
            {generatedPRDs.length} PRD{generatedPRDs.length !== 1 ? 's' : ''} generated successfully.
          </p>
          <div className="space-y-4">
            {generatedPRDs.map((prd, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{prd.title || prd.featureName}</h3>
                {prd.error ? (
                  <p className="text-red-600">Error: {prd.error}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-green-600">✓ PRD Generated Successfully</p>
                    {prd.googleDocUrl ? (
                      <a
                        href={prd.googleDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        View in Google Docs
                      </a>
                    ) : (
                      <p className="text-yellow-600 text-sm">
                        ⚠ Google Docs save skipped (not signed in with Google)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setStep('profile');
                setFeatures([]);
                setProposedContent([]);
                setGeneratedPRDs([]);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start New Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
