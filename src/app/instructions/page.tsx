import React from "react";
import Link from "next/link";
import AppShell from '@/components/AppShell';
import Banner from '@/components/Banner';
import { Home } from 'lucide-react';

export default function InstructionsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto space-y-10 relative">
        <Link href="/" className="absolute top-0 right-0 mt-6 mr-8 text-poppy hover:text-poppy/80 transition-colors z-10" aria-label="Back to Chat">
          <Home className="w-7 h-7" />
        </Link>
        <Banner status="instructions" />
        <div className="bg-white/90 rounded-b-2xl shadow-sm p-8 text-primary font-sans space-y-8">
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
              <li>Your team&apos;`s key terms and definitions</li>
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

          <div className="mt-8 text-center text-primary/70 text-base">
            Need help? Ask Poppy in the chat or check the documentation for tips and best practices.
          </div>
        </div>
      </div>
    </AppShell>
  );
} 