"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Settings, RefreshCw, CheckCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import Sidebar from './Sidebar'
import { cn } from "@/lib/utils";

const stepsConfig = [
  {
    label: "Personal Context",
    key: "personalContext",
    link: "/tune-poppy",
    icon: Settings,
    cta: "Get Started",
    message: "Add your personal context",
    subtext: "Help Poppy understand your product and team.",
    checkComplete: (ctx: any) => ctx && Object.values(ctx).every((v) => v && v !== "")
  },
  {
    label: "Sync Documents",
    key: "syncedDocs",
    link: "/sync-docs",
    icon: RefreshCw,
    cta: "Sync Now",
    message: "Sync your first document",
    subtext: "Give Poppy access to your docs for better results.",
    checkComplete: (docs: any) => Array.isArray(docs) && docs.length > 0
  }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  // Fallback for SSR/Next.js: usePathname hook
  // If not on homepage, show the banner
  // (If you want to use usePathname, you can, but window.location.pathname is fine for this case)
  const isHome = pathname === "/";

  const [steps, setSteps] = useState([
    { complete: false },
    { complete: false }
  ]);

  useEffect(() => {
    // On pageload, check if prds exists and update syncedDocs accordingly
    const prds = JSON.parse(localStorage.getItem('prds') || '[]');
    if (Array.isArray(prds) && prds.length > 0) {
      const prdDocIds = prds.map((doc: { id: string }) => doc.id);
      const existing = JSON.parse(localStorage.getItem('syncedDocs') || '[]');
      const merged = Array.from(new Set([...existing, ...prdDocIds]));
      localStorage.setItem('syncedDocs', JSON.stringify(merged));
    }
    const personalContext = JSON.parse(localStorage.getItem("personalContext") || "{}");
    const syncedDocs = JSON.parse(localStorage.getItem("syncedDocs") || "[]");
    setSteps([
      { complete: stepsConfig[0].checkComplete(personalContext) },
      { complete: stepsConfig[1].checkComplete(syncedDocs) }
    ]);
  }, []);

  const completedCount = steps.filter((s) => s.complete).length;
  const totalCount = steps.length;
  const isPersonalContextComplete = steps[0].complete;
  const isDocsSynced = steps[1].complete;

  // Height of the banner (adjust if you change banner padding/margin)
  const bannerHeight = (!isHome && (!isPersonalContextComplete || !isDocsSynced)) || (!isHome && isPersonalContextComplete && isDocsSynced) ? 112 : 0;

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col",
      isHome ? "bg-gradient-to-br from-[#FFFAF3] to-white" : "bg-neutral/80"
    )}>
      {/* Fixed onboarding banner at the very top, overlays sidebar and content */}
      {!isHome && (!isPersonalContextComplete || !isDocsSynced) && (
        <div className="fixed top-0 left-0 w-full px-0 py-5 bg-white/90 border-b border-poppy/20 shadow z-50 flex flex-col items-center">
          <div className="w-full max-w-2xl mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-poppy h-2 rounded-full transition-all" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
            </div>
            <div className="flex flex-col gap-4 w-full">
              {!isPersonalContextComplete && (
                <div className="flex items-center gap-4">
                  <Settings className="w-6 h-6 text-poppy" />
                  <div className="flex-1">
                    <div className="font-semibold text-poppy">Add your personal context</div>
                    <div className="text-xs text-gray-500">Help Poppy understand your product and team.</div>
                  </div>
                  <Link href="/tune-poppy" className="px-4 py-2 rounded-full bg-poppy text-white font-semibold hover:bg-poppy/90 transition-colors text-sm shadow">
                    Get Started
                  </Link>
                </div>
              )}
              {!isDocsSynced && (
                <div className="flex items-center gap-4">
                  <RefreshCw className="w-6 h-6 text-poppy" />
                  <div className="flex-1">
                    <div className="font-semibold text-poppy">Sync your first document</div>
                    <div className="text-xs text-gray-500">Give Poppy access to your docs for better results.</div>
                  </div>
                  <Link href="/sync-docs" className="px-4 py-2 rounded-full bg-poppy text-white font-semibold hover:bg-poppy/90 transition-colors text-sm shadow">
                    Sync Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {!isHome && isPersonalContextComplete && isDocsSynced && (
        <div className="fixed top-0 left-0 w-full px-0 py-4 bg-white/90 border-b border-poppy/10 shadow-sm flex items-center justify-center z-50">
          <div className="w-full max-w-2xl mx-auto flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-poppy mr-2" />
            <span className="text-poppy font-semibold">You're all set! Head to Chat to get started.</span>
            <Link href="/" className="ml-4 px-4 py-2 rounded-full bg-poppy text-white font-semibold hover:bg-poppy/90 transition-colors text-sm shadow">
              Go to Chat
            </Link>
          </div>
        </div>
      )}
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