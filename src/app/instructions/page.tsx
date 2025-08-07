"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from '@/components/AppShell';
import { Home, Eye, EyeOff, Check, X } from 'lucide-react';

export default function InstructionsPage() {
  const [v0ApiKey, setV0ApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load saved API key and Google Sheet ID on mount
    const savedKey = localStorage.getItem('v0_api_key');
    if (savedKey) {
      setV0ApiKey(savedKey);
    }
    
    const savedSheetId = localStorage.getItem('customer_sheet_id');
    if (savedSheetId) {
      setGoogleSheetId(savedSheetId);
    }
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      // Save V0 API key
      if (v0ApiKey.trim()) {
        localStorage.setItem('v0_api_key', v0ApiKey.trim());
      } else {
        localStorage.removeItem('v0_api_key');
      }
      
      // Save Google Sheet ID
      if (googleSheetId.trim()) {
        localStorage.setItem('customer_sheet_id', googleSheetId.trim());
      } else {
        localStorage.removeItem('customer_sheet_id');
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto space-y-10 relative">
        <Link href="/" className="absolute top-0 right-0 mt-6 mr-8 text-poppy hover:text-poppy/80 transition-colors z-10" aria-label="Back to Chat">
          <Home className="w-7 h-7" />
        </Link>
        <div className="bg-white/90 rounded-b-2xl shadow-sm p-8 text-primary font-sans space-y-8">
          
          {/* Configuration Section */}
          <div className="space-y-6 pb-8 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-poppy">Configuration</h2>
            
            {/* V0 API Key */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Design Mode</h3>
              <p className="text-base text-gray-600">To use Design Mode, you need a v0 API key from <a href="https://v0.dev" target="_blank" rel="noopener noreferrer" className="text-poppy hover:underline">v0.dev</a>:</p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="v0-api-key" className="block text-sm font-medium text-gray-700">
                    v0 API Key
                  </label>
                  <div className="relative">
                    <input
                      id="v0-api-key"
                      type={showApiKey ? "text" : "password"}
                      value={v0ApiKey}
                      onChange={(e) => setV0ApiKey(e.target.value)}
                      placeholder="Enter your v0 API key..."
                      className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-poppy focus:border-poppy text-sm"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">How to get your v0 API key:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Visit <a href="https://v0.dev" target="_blank" rel="noopener noreferrer" className="text-poppy hover:underline">v0.dev</a></li>
                    <li>Sign in to your account</li>
                    <li>Go to your account settings or API section</li>
                    <li>Generate a new API key</li>
                    <li>Copy and paste it above</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Google Sheets Integration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Customer Email Integration</h3>
              <p className="text-base text-gray-600">To enable automatic customer email lookup and outreach, provide your Google Sheets document ID:</p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="google-sheet-id" className="block text-sm font-medium text-gray-700">
                    Google Sheets Document ID
                  </label>
                  <input
                    id="google-sheet-id"
                    type="text"
                    value={googleSheetId}
                    onChange={(e) => setGoogleSheetId(e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poppy focus:border-poppy text-sm"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">How to find your Google Sheets ID:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open your customer data Google Sheet</li>
                    <li>Look at the URL in your browser</li>
                    <li>Find the ID between <code className="bg-gray-200 px-1 rounded">/d/</code> and <code className="bg-gray-200 px-1 rounded">/edit</code></li>
                    <li>Copy and paste that ID above</li>
                  </ol>
                  <p className="mt-2 text-xs text-gray-500">
                    Example: https://docs.google.com/spreadsheets/d/<strong>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</strong>/edit
                  </p>
                </div>
              </div>
            </div>

            {/* Save Settings Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-poppy text-white rounded-md hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
              
              {saveStatus === 'success' && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Check className="w-4 h-4" />
                  Saved successfully
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <X className="w-4 h-4" />
                  Failed to save
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-semibold text-poppy">Draft PRDs Effectively</h2>
            <p className="text-lg">To get the best results from Poppy&apos;s PRD drafting:</p>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li>First, <span className="font-semibold">Tune Poppy</span> with your team&apos;s strategy and product thinking</li>
              <li>Add your <span className="font-semibold">Key Terms</span> to ensure consistent terminology</li>
              <li>Use the <span className="font-semibold">Brainstorm</span> feature to explore ideas before drafting</li>
              <li><span className="font-semibold text-poppy">Required:</span> Include a clear Job-to-be-Done (JTBD) statement that describes:
                <p className="text-lg">When I&apos;m [blank], I want to [blank] so that I can [blank]. 
                  <br />
                  today, I cannot do [blank] because of [blank]
                  <br />
                  this is suboptimal because [blank]
                </p>
              </li>
              <li>Include specific details about:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>User problems and pain points</li>
                  <li>Success metrics and KPIs</li>
                  <li>Technical constraints or requirements</li>
                  <li>Timeline and dependencies</li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-poppy">Brainstorm with Context</h2>
            <p className="text-lg">Poppy has access to:</p>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li>Your team&apos;s strategy and product thinking from <span className="font-semibold">Tune Poppy</span></li>
              <li>All synced documents including:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Previous PRDs and specs</li>
                  <li>Customer feedback and surveys</li>
                  <li>Team documentation</li>
                  <li>Product roadmaps</li>
                </ul>
              </li>
              <li>Your team&apos;s key terms and definitions</li>
              <li>Historical context from past conversations</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-poppy">Schedule Customer Feedback</h2>
            <p className="text-lg">Use the Schedule page to:</p>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li>Search for specific customer feedback using natural language queries</li>
              <li>Find customers based on:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>NPS scores and verbatim feedback</li>
                  <li>GMV and account size</li>
                  <li>Survey dates and response patterns</li>
                </ul>
              </li>
              <li>Schedule outreach with one click:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Automatically checks for recent outreach (last 28 days)</li>
                  <li>Opens Gmail compose with pre-filled feedback details</li>
                  <li>Tracks outreach in the feedback sheet</li>
                </ul>
              </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-poppy">Meeting Recommendations</h2>
          <p className="text-lg">When PRDs spark discussion, Poppy looks for action items and suggests times to meet. Connect your Google Calendar so the app can check availability and propose reviews directly in chat.</p>
        </div>

        <div className="mt-8 text-center text-primary/70 text-base">
          Need help? Ask Poppy in the chat or check the documentation for tips and best practices.
        </div>
        </div>
      </div>
    </AppShell>
  );
} 