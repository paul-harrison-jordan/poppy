'use client'

import React, { useState, useEffect, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import ChatInterface from './ChatInterface'
import RoadmapDashboard from './roadmap/RoadmapDashboard'
import { useSession } from 'next-auth/react'
import { 
  MessageSquare, 
  Map, 
  Grid3X3,
  Settings,
  Sparkles
} from 'lucide-react'

type AppMode = 'chat' | 'roadmap' | 'features' | 'settings'

interface UnifiedLayoutProps {
  initialMode?: AppMode
}

function UnifiedLayout({ initialMode = 'chat' }: UnifiedLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [currentMode, setCurrentMode] = useState<AppMode>(initialMode)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Sync mode with pathname
  useEffect(() => {
    if (pathname === '/roadmap') {
      setCurrentMode('roadmap')
    } else if (pathname === '/features') {
      setCurrentMode('features')
    } else if (pathname === '/instructions') {
      setCurrentMode('settings')
    } else {
      setCurrentMode('chat')
    }
  }, [pathname])

  const handleModeChange = useCallback(async (newMode: AppMode) => {
    if (newMode === currentMode) return
    
    setIsTransitioning(true)
    
    // Update URL without full page reload
    const urlMap = {
      'chat': '/',
      'roadmap': '/roadmap',
      'features': '/features',
      'settings': '/instructions'
    }
    
    router.push(urlMap[newMode], { scroll: false })
    
    setTimeout(() => {
      setCurrentMode(newMode)
      setIsTransitioning(false)
    }, 150)
  }, [currentMode, router])

  const navigationItems = [
    {
      mode: 'chat' as AppMode,
      icon: MessageSquare,
      label: 'Chat',
      description: 'Create PRDs & brainstorm features'
    },
    {
      mode: 'roadmap' as AppMode,
      icon: Map,
      label: 'Roadmap',
      description: 'Plan & prioritize features'
    },
    {
      mode: 'features' as AppMode,
      icon: Grid3X3,
      label: 'Features',
      description: 'Browse all features'
    },
    {
      mode: 'settings' as AppMode,
      icon: Settings,
      label: 'Settings',
      description: 'Customize workspace'
    }
  ]

  const renderContent = () => {
    switch (currentMode) {
      case 'chat':
        return <ChatInterface />
      case 'roadmap':
        return (
          <div className="w-full max-w-7xl mx-auto">
            <RoadmapDashboard userEmail={session?.user?.email || ''} />
          </div>
        )
      case 'features':
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Grid3X3 className="w-16 h-16 text-poppy/50 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary mb-2">All Features</h2>
              <p className="text-gray-600">Coming soon - Browse your feature catalog</p>
            </div>
          </div>
        )
      case 'settings':
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Settings className="w-16 h-16 text-poppy/50 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-primary mb-2">Settings</h2>
              <p className="text-gray-600">Coming soon - Customize your experience</p>
            </div>
          </div>
        )
      default:
        return <ChatInterface />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex">
      {/* Left Sidebar Navigation - Enhanced bento-style */}
      <div className="w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col shadow-2xl shadow-gray-900/5">
        <div className="p-8 border-b border-gray-200/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="text-3xl">🌺</div>
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-poppy/60" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Poppy
              </h1>
              <p className="text-xs text-gray-500 font-medium">AI Product Manager</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-8 py-8 space-y-3">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentMode === item.mode
            
            return (
              <motion.button
                key={item.mode}
                onClick={() => handleModeChange(item.mode)}
                className={`
                  w-full text-left p-5 rounded-2xl transition-all duration-300 flex items-center gap-4
                  backdrop-blur-sm relative overflow-hidden group
                  ${isActive 
                    ? 'bg-gradient-to-r from-poppy/10 to-poppy/5 text-poppy font-semibold border border-poppy/20 shadow-lg shadow-poppy/10' 
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:text-poppy border border-transparent hover:border-gray-200/50 hover:shadow-md'
                  }
                `}
                whileHover={{ 
                  scale: 1.02,
                  y: -2,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-poppy/20' : 'bg-gray-100 group-hover:bg-poppy/10'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="relative z-10">
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute right-4 w-2 h-2 bg-poppy rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Bottom section with user info or status */}
        <div className="p-8 border-t border-gray-200/50">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>All systems ready</span>
          </div>
        </div>
      </div>

      {/* Main Content Area - Enhanced with bento-style spacing */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/20 to-transparent pointer-events-none" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMode}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ 
              opacity: isTransitioning ? 0.8 : 1, 
              y: 0,
              scale: isTransitioning ? 0.98 : 1
            }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1],
              scale: { duration: 0.3 }
            }}
            className="flex-1 flex flex-col relative z-10 p-8"
          >
            <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-xl shadow-gray-900/5 overflow-hidden">
              {renderContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Memoize the component for better performance
export default memo(UnifiedLayout) 