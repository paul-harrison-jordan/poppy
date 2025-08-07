"use client"

import React, { useEffect, useState } from "react";
import Sidebar from './Sidebar'
import { cn } from "@/lib/utils";
import { determineCategory, analyzeSummary } from '@/lib/prdCategorization'
import { usePRDStore, PRD } from '@/store/prdStore';
import { useAgenticPRDNotifications } from '@/hooks/useAgenticPRDNotifications';

interface PersonalContext {
  teamStrategy: string;
  howYouThinkAboutProduct: string;
  pillarGoalsKeyTermsBackground: string;
}

interface Step {
  complete: boolean;
}

interface StepConfig {
  title: string;
  description: string;
  checkComplete: (ctx: PersonalContext | string[]) => boolean;
}

interface PRDDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const stepsConfig: StepConfig[] = [
  {
    title: "Tune Poppy",
    description: "Add your team's strategy and product thinking",
    checkComplete: (ctx: PersonalContext | string[]) => {
      if ('teamStrategy' in ctx) {
        return Object.values(ctx as PersonalContext).every((v) => v && v !== "");
      }
      return Array.isArray(ctx) && ctx.length > 0;
    }
  },
  {
    title: "Sync Documents",
    description: "Connect your team's documents",
    checkComplete: (docs: PersonalContext | string[]) => {
      if (Array.isArray(docs)) {
        return docs.length > 0;
      }
      return false;
    }
  }
];

// Helper to trigger agentic notification
function triggerAgenticNotification(prd: PRD) {
  const summary = prd.metadata?.open_questions_summary || '';
  const summaryAnalysis = analyzeSummary(summary);
  const openQuestions = summaryAnalysis.hasQuestions && summary
    ? summary.split(/[\n\r]+/).filter((line: string) => line.includes('?'))
    : [];
  window.dispatchEvent(new CustomEvent('poppy-agentic-message', {
    detail: {
      prdTitle: prd.title || '',
      openQuestions,
      prdId: prd.id || ''
    }
  }));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  // Fallback for SSR/Next.js: usePathname hook
  // If not on homepage, show the banner
  // (If you want to use usePathname, you can, but window.location.pathname is fine for this case)
  const isHome = pathname === "/";

  const [steps, setSteps] = useState<Step[]>([
    { complete: false },
    { complete: false }
  ]);

  // Track notified PRDs to avoid duplicate notifications
  const [notifiedPrdIds, setNotifiedPrdIds] = useState<Set<string>>(new Set());

  const setPRDs = usePRDStore((state) => state.setPRDs);
  useAgenticPRDNotifications();

  useEffect(() => {
    // On pageload, load PRDs from localStorage into Zustand store
    const saved = localStorage.getItem('savedPRD');
    if (saved) {
      setPRDs(JSON.parse(saved));
    }
    // Optionally, subscribe to API or localStorage for updates
  }, [setPRDs]);

  useEffect(() => {
    // On pageload, check if prds exists and update syncedDocs accordingly
    const prds = JSON.parse(localStorage.getItem('prds') || '[]') as PRDDocument[];
    if (Array.isArray(prds) && prds.length > 0) {
      const prdDocIds = prds.map((doc) => doc.id);
      const existing = JSON.parse(localStorage.getItem('syncedDocs') || '[]') as string[];
      const merged = Array.from(new Set([...existing, ...prdDocIds]));
      localStorage.setItem('syncedDocs', JSON.stringify(merged));
    }
    const personalContext = JSON.parse(localStorage.getItem("personalContext") || "{}") as PersonalContext;
    const syncedDocs = JSON.parse(localStorage.getItem("syncedDocs") || "[]") as string[];
    setSteps([
      { complete: stepsConfig[0].checkComplete(personalContext) },
      { complete: stepsConfig[1].checkComplete(syncedDocs) }
    ]);
  }, []);

  // On mount, check all PRDs for at risk and trigger notifications
  useEffect(() => {
    const prds = usePRDStore.getState().prds;
    prds.forEach((prd: PRD) => {
      // Fetch full metadata if available (simulate for now)
      // In a real app, you might fetch comments/summary here
      if (prd.metadata && prd.id && determineCategory(prd) === 'at-risk' && !notifiedPrdIds.has(prd.id)) {
        triggerAgenticNotification(prd);
        setNotifiedPrdIds(prev => new Set(prev).add(prd.id!));
      }
    });
  }, [notifiedPrdIds]);

  // Listen for localStorage changes to catch new/updated PRDs
  useEffect(() => {
    function handleStorageChange() {
      const prds = usePRDStore.getState().prds;
      prds.forEach((prd: PRD) => {
        if (prd.metadata && prd.id && determineCategory(prd) === 'at-risk' && !notifiedPrdIds.has(prd.id)) {
          triggerAgenticNotification(prd);
          setNotifiedPrdIds(prev => new Set(prev).add(prd.id!));
        }
      });
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [notifiedPrdIds]);


  // No banner height needed since we removed the duplicate banner
  const bannerHeight = 0;

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col",
      isHome ? "bg-gradient-to-br from-[#FFFAF3] to-white" : "bg-neutral/80"
    )}>
      {/* Sidebar and main content below banner, with top margin to avoid overlap */}
      <div className="flex min-h-screen h-screen" style={{ marginTop: `${bannerHeight}px` }}>
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 ml-64">
          {children}
        </main>
      </div>
    </div>
  )
} 