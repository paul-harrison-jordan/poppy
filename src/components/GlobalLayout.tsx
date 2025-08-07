'use client'

import React, { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import GlobalSidebar from './GlobalSidebar'
import { cn } from "@/lib/utils"
import { determineCategory, analyzeSummary } from '@/lib/prdCategorization'
import { usePRDStore, PRD } from '@/store/prdStore'
import { useAgenticPRDNotifications } from '@/hooks/useAgenticPRDNotifications'

interface PersonalContext {
  teamStrategy: string
  howYouThinkAboutProduct: string
  pillarGoalsKeyTermsBackground: string
}

interface Step {
  complete: boolean
}

interface StepConfig {
  title: string
  description: string
  checkComplete: (ctx: PersonalContext | string[]) => boolean
}

interface PRDDocument {
  id: string
  title: string
  content: string
  createdAt: string
}

const stepsConfig: StepConfig[] = [
  {
    title: "Tune Poppy",
    description: "Add your team's strategy and product thinking",
    checkComplete: (ctx: PersonalContext | string[]) => {
      if ('teamStrategy' in ctx) {
        return Object.values(ctx as PersonalContext).every((v) => v && v !== "")
      }
      return Array.isArray(ctx) && ctx.length > 0
    }
  },
  {
    title: "Sync Documents",
    description: "Connect your team's documents",
    checkComplete: (docs: PersonalContext | string[]) => {
      if (Array.isArray(docs)) {
        return docs.length > 0
      }
      return false
    }
  }
]

// Helper to trigger agentic notification
function triggerAgenticNotification(prd: PRD) {
  const summary = prd.metadata?.open_questions_summary || ''
  const summaryAnalysis = analyzeSummary(summary)
  const openQuestions = summaryAnalysis.hasQuestions && summary
    ? summary.split(/[\n\r]+/).filter((line: string) => line.includes('?'))
    : []
  window.dispatchEvent(new CustomEvent('poppy-agentic-message', {
    detail: {
      prdTitle: prd.title || '',
      openQuestions,
      prdId: prd.id || ''
    }
  }))
}

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const isOnboarding = pathname === "/onboarding"
  const isDesignMode = pathname === "/" && typeof window !== 'undefined' && 
    localStorage.getItem('currentChatMode') === 'design'

  const [steps, setSteps] = useState<Step[]>([
    { complete: false },
    { complete: false }
  ])

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isDesignMode)

  // Track notified PRDs to avoid duplicate notifications
  const [notifiedPrdIds, setNotifiedPrdIds] = useState<Set<string>>(new Set())

  // Auto-collapse sidebar in design mode
  useEffect(() => {
    const handleModeChange = (event?: CustomEvent<{ mode: string }>) => {
      let mode: string
      
      if (event?.detail?.mode) {
        // From ChatInterface event
        mode = event.detail.mode
      } else {
        // From localStorage
        mode = localStorage.getItem('currentChatMode') || 'brainstorm'
      }
      
      if (mode === 'design' && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
      } else if (mode !== 'design' && isSidebarCollapsed) {
        // Auto-expand when leaving design mode with smooth transition
        setTimeout(() => setIsSidebarCollapsed(false), 100)
      }
    }

    const handleStorageChange = () => {
      handleModeChange()
    }

    const handleCustomModeChange = (event: Event) => {
      handleModeChange(event as CustomEvent<{ mode: string }>)
    }

    // Check current mode on mount
    handleModeChange()

    // Listen for mode changes
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('chatModeChange', handleCustomModeChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('chatModeChange', handleCustomModeChange)
    }
  }, [isSidebarCollapsed, isDesignMode])

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const setPRDs = usePRDStore((state) => state.setPRDs)
  useAgenticPRDNotifications()

  useEffect(() => {
    // On pageload, load PRDs from localStorage into Zustand store
    const saved = localStorage.getItem('savedPRD')
    if (saved) {
      setPRDs(JSON.parse(saved))
    }
  }, [setPRDs])

  useEffect(() => {
    // On pageload, check if prds exists and update syncedDocs accordingly
    const prds = JSON.parse(localStorage.getItem('prds') || '[]') as PRDDocument[]
    if (Array.isArray(prds) && prds.length > 0) {
      const prdDocIds = prds.map((doc) => doc.id)
      const existing = JSON.parse(localStorage.getItem('syncedDocs') || '[]') as string[]
      const merged = Array.from(new Set([...existing, ...prdDocIds]))
      localStorage.setItem('syncedDocs', JSON.stringify(merged))
    }
    const personalContext = JSON.parse(localStorage.getItem("personalContext") || "{}") as PersonalContext
    const syncedDocs = JSON.parse(localStorage.getItem("syncedDocs") || "[]") as string[]
    setSteps([
      { complete: stepsConfig[0].checkComplete(personalContext) },
      { complete: stepsConfig[1].checkComplete(syncedDocs) }
    ])
  }, [])

  // On mount, check all PRDs for at risk and trigger notifications
  useEffect(() => {
    const prds = usePRDStore.getState().prds
    prds.forEach((prd: PRD) => {
      if (prd.metadata && prd.id && determineCategory(prd) === 'at-risk' && !notifiedPrdIds.has(prd.id)) {
        triggerAgenticNotification(prd)
        setNotifiedPrdIds(prev => new Set(prev).add(prd.id!))
      }
    })
  }, [notifiedPrdIds])

  // Listen for localStorage changes to catch new/updated PRDs
  useEffect(() => {
    function handleStorageChange() {
      const prds = usePRDStore.getState().prds
      prds.forEach((prd: PRD) => {
        if (prd.metadata && prd.id && determineCategory(prd) === 'at-risk' && !notifiedPrdIds.has(prd.id)) {
          triggerAgenticNotification(prd)
          setNotifiedPrdIds(prev => new Set(prev).add(prd.id!))
        }
      })
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [notifiedPrdIds])

  // No banner needed anymore
  const bannerHeight = 0
  const sidebarWidth = isSidebarCollapsed ? 64 : 256

  return (
    <div className={cn(
      "min-h-screen w-full flex transition-smooth",
      isHome ? "bg-gradient-to-br from-cream to-white" : "bg-warm-neutral-light"
    )}>
      {/* Global Sidebar - completely hidden in design mode and onboarding */}
      {!isDesignMode && !isOnboarding && (
        <GlobalSidebar 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: (isDesignMode || isOnboarding) ? '0px' : `${sidebarWidth}px` }}
      >

        {/* Main content with proper spacing for banner */}
        <main 
          className="flex-1 flex flex-col min-h-0"
          style={{ marginTop: (isDesignMode || isOnboarding) ? '0px' : `${bannerHeight}px` }}
        >
          {children}
        </main>
      </div>
    </div>
  )
} 