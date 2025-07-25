'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  MessageSquare, 
  Map, 
  Grid3X3, 
  Settings,
  RefreshCw,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface GlobalSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function GlobalSidebar({ isCollapsed = false, onToggleCollapse }: GlobalSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleNavigation = async (path: string) => {
    if (pathname === path) return
    
    router.push(path, { scroll: false })
  }

  const mainNavigationItems = [
    {
      path: '/',
      icon: MessageSquare,
      label: 'Chat',
      description: 'Create PRDs & brainstorm features'
    },
    {
      path: '/roadmap',
      icon: Map,
      label: 'Roadmap',
      description: 'Plan & prioritize features'
    },
    {
      path: '/features',
      icon: Grid3X3,
      label: 'Features',
      description: 'Browse all features'
    }
  ]

  const settingsNavigationItems = [
    {
      path: '/instructions',
      icon: Settings,
      label: 'Settings',
      description: 'Tune Poppy'
    },
    {
      path: '/sync',
      icon: RefreshCw,
      label: 'Sync Documents',
      description: 'Connect your docs'
    },
    {
      path: '/key-terms',
      icon: BookOpen,
      label: 'Key Terms',
      description: 'Define terminology'
    }
  ]

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-white border-r border-gray-200 flex flex-col shadow-lg fixed left-0 top-0 h-full z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl flex-shrink-0">🌺</div>
          {!isCollapsed && <h1 className="text-xl font-bold text-gray-800">Poppy</h1>}
        </div>
        {/* Collapse/Expand Toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-md transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
        <div className="space-y-2">
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Main
            </h2>
          )}
          {mainNavigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path || 
              (item.path === '/' && pathname === '/') ||
              (item.path !== '/' && pathname.startsWith(item.path))
            
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-poppy/10 text-poppy font-semibold border border-poppy/20' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-60">{item.description}</div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Settings Navigation */}
        <div className="space-y-2">
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Setup
            </h2>
          )}
          {settingsNavigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path || 
              (item.path !== '/' && pathname.startsWith(item.path))
            
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-poppy/10 text-poppy font-semibold border border-poppy/20' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-60">{item.description}</div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <motion.button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={`
            w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-poppy border border-transparent hover:border-gray-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <div>
              <div className="font-medium">Sign Out</div>
              <div className="text-xs opacity-60">End your session</div>
            </div>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
} 