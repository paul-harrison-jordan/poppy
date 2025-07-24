'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import ChatInterface from './ChatInterface'
import RoadmapDashboard from './roadmap/RoadmapDashboard'
import { useSession } from 'next-auth/react'
import { 
  MessageSquare, 
  Map, 
  PenLine, 
  Grid3X3, 
  Settings
} from 'lucide-react'

type AppMode = 'chat' | 'roadmap' | 'features' | 'settings'

interface UnifiedLayoutProps {
  initialMode?: AppMode
}

export default function UnifiedLayout({ initialMode = 'chat' }: UnifiedLayoutProps) {
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

  const handleModeChange = async (newMode: AppMode) => {
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
  }

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
    <div className="min-h-screen bg-neutral/80 flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🌺</div>
            <h1 className="text-xl font-bold text-gray-800">Poppy</h1>
          </div>
        </div>
        
        <nav className="flex-1 px-6 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentMode === item.mode
            
            return (
              <motion.button
                key={item.mode}
                onClick={() => handleModeChange(item.mode)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3
                  ${isActive 
                    ? 'bg-poppy/10 text-poppy font-semibold border border-poppy/20' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-60">{item.description}</div>
                </div>
              </motion.button>
            )
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: isTransitioning ? 0.7 : 1, 
              y: 0,
              scale: isTransitioning ? 0.98 : 1
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3, 
              ease: "easeInOut",
              scale: { duration: 0.2 }
            }}
            className="flex-1 flex flex-col"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
} 