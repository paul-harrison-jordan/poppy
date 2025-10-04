'use client';

import React, { useState } from 'react';
import { PMPreferenceProfile, ProductAreaPersonas } from '@/types/knowledge';

interface PMProfileCreationProps {
  onProfileCreated: (profile: Partial<PMPreferenceProfile>) => void;
  onSkip?: () => void;
}

const DEFAULT_PERSONAS = {
  customerFacing: 'Support agent trying to resolve customer issues efficiently',
  customerImpacting: 'Marketer looking to improve campaign performance and customer engagement',
  infrastructure: 'Engineer maintaining and scaling internal systems and databases'
};

export default function PMProfileCreation({ onProfileCreated, onSkip }: PMProfileCreationProps) {
  const [step, setStep] = useState<'intro' | 'personas' | 'preferences'>('intro');
  const [personas, setPersonas] = useState<ProductAreaPersonas>(DEFAULT_PERSONAS);
  const [preferences, setPreferences] = useState<{
    speedVsQuality: 'speed' | 'balanced' | 'quality';
    riskTolerance: 'low' | 'medium' | 'high';
    userFocus: 'internal' | 'external' | 'balanced';
  }>({
    speedVsQuality: 'balanced',
    riskTolerance: 'medium',
    userFocus: 'balanced'
  });
  const [productVision, setProductVision] = useState('');
  const [teamStrategy, setTeamStrategy] = useState('');

  const handleSubmit = () => {
    const profile: Partial<PMPreferenceProfile> = {
      vocabulary_glossary: {},
      decision_frameworks: {
        frameworks: [],
        approaches: []
      },
      trade_off_preferences: preferences,
      recurring_themes: [],
      domain_expertise: [],
      personal_context: {
        productAreaPersonas: personas,
        productVision,
        teamStrategy
      },
      total_sessions: 0,
      total_vocabulary_terms: 0,
      total_questions_answered: 0
    };

    onProfileCreated(profile);
  };

  if (step === 'intro') {
    return (
      <div className="max-w-3xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-md border border-warmGray-200 p-8">
          <h2 className="font-display text-3xl font-semibold text-batch-charcoal mb-3">Create Your PM Profile</h2>
          <p className="text-batch-charcoal-light text-lg mb-8">
            Your PM profile helps Poppy understand your decision-making style and generate PRDs tailored to your approach.
          </p>
          <div className="space-y-4">
            <div className="bg-batch-terracotta-light border border-batch-terracotta/20 p-6 rounded-xl">
              <h3 className="font-semibold text-batch-charcoal mb-3 flex items-center gap-2">
                <span className="text-batch-terracotta">📋</span>
                What we&apos;ll cover:
              </h3>
              <ul className="space-y-2 text-batch-charcoal-light">
                <li className="flex items-start gap-2">
                  <span className="text-batch-terracotta mt-0.5">•</span>
                  <span>Product area personas (customer-facing, customer-impacting, infrastructure)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-batch-terracotta mt-0.5">•</span>
                  <span>Your trade-off preferences (speed vs quality, risk tolerance)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-batch-terracotta mt-0.5">•</span>
                  <span>Team strategy and product vision (optional)</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep('personas')}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-batch-terracotta to-batch-terracotta-hover text-white rounded-full hover:shadow-lg transition-all font-semibold"
              >
                Get Started →
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-6 py-4 text-batch-charcoal-light hover:text-batch-charcoal transition-colors font-medium rounded-full hover:bg-warmGray-50"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'personas') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Define Your Product Area Personas</h2>
        <p className="text-gray-700 mb-6">
          Different product areas require different perspectives. Define who your features typically serve.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Customer-Facing Features
              <span className="text-gray-500 font-normal ml-2">(e.g., segment builder, UI tools)</span>
            </label>
            <textarea
              value={personas.customerFacing}
              onChange={(e) => setPersonas({ ...personas, customerFacing: e.target.value })}
              className="w-full p-3 border rounded-md resize-none"
              rows={2}
              placeholder="Describe who uses customer-facing features..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Customer-Impacting Features
              <span className="text-gray-500 font-normal ml-2">(e.g., campaign sender, automation)</span>
            </label>
            <textarea
              value={personas.customerImpacting}
              onChange={(e) => setPersonas({ ...personas, customerImpacting: e.target.value })}
              className="w-full p-3 border rounded-md resize-none"
              rows={2}
              placeholder="Describe who uses customer-impacting features..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Infrastructure Features
              <span className="text-gray-500 font-normal ml-2">(e.g., databases, internal tools)</span>
            </label>
            <textarea
              value={personas.infrastructure}
              onChange={(e) => setPersonas({ ...personas, infrastructure: e.target.value })}
              className="w-full p-3 border rounded-md resize-none"
              rows={2}
              placeholder="Describe who uses infrastructure features..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('intro')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('preferences')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Your PM Preferences</h2>
      <p className="text-gray-700 mb-6">
        Help us understand your decision-making style.
      </p>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Speed vs Quality</label>
          <div className="flex gap-2">
            {(['speed', 'balanced', 'quality'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setPreferences({ ...preferences, speedVsQuality: option })}
                className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                  preferences.speedVsQuality === option
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Risk Tolerance</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setPreferences({ ...preferences, riskTolerance: option })}
                className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                  preferences.riskTolerance === option
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">User Focus</label>
          <div className="flex gap-2">
            {(['internal', 'balanced', 'external'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setPreferences({ ...preferences, userFocus: option })}
                className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                  preferences.userFocus === option
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">
            Product Vision <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            value={productVision}
            onChange={(e) => setProductVision(e.target.value)}
            className="w-full p-3 border rounded-md resize-none"
            rows={3}
            placeholder="Describe your product vision..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">
            Team Strategy <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            value={teamStrategy}
            onChange={(e) => setTeamStrategy(e.target.value)}
            className="w-full p-3 border rounded-md resize-none"
            rows={3}
            placeholder="Describe your team's strategy and constraints..."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setStep('personas')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Profile
          </button>
        </div>
      </div>
    </div>
  );
}
