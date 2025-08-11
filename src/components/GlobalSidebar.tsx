'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  MessageSquare, 
  Map, 
  Settings,
  RefreshCw,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  Bot,
  Target
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
      label: 'AI Assistant',
      description: 'Draft PRDs & brainstorm features',
      actionable: true
    },
    {
      path: '/roadmap',
      icon: Map,
      label: 'Roadmap',
      description: 'Plan & track feature delivery',
      actionable: true
    },
    {
      path: '/teams',
      icon: Users,
      label: 'Teams',
      description: 'Organize & optimize capacity',
      actionable: true
    },
    {
      path: '/agent-mode',
      icon: Bot,
      label: 'Agent Mode',
      description: 'Autonomous task execution',
      actionable: true
    },
    {
      path: '/competitive-analysis',
      icon: Target,
      label: 'Competitive Analysis',
      description: 'Analyze competitor approaches',
      actionable: true
    },
  ]

  const settingsNavigationItems = [
    {
      path: '/instructions',
      icon: Settings,
      label: 'Settings',
      description: 'Configure AI behavior',
      actionable: false
    },
    {
      path: '/sync',
      icon: RefreshCw,
      label: 'Document Sync',
      description: 'Connect knowledge sources',
      actionable: false
    },
    {
      path: '/key-terms',
      icon: BookOpen,
      label: 'Terminology',
      description: 'Define domain language',
      actionable: false
    }
  ]

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="os-header border-r border-border flex flex-col elevation-lg fixed left-0 top-0 h-full z-50 overflow-hidden"
    >
      {/* Professional OS Header */}
      <div className="p-space-6 border-b border-border flex-shrink-0 bg-poppy-primary-light/30">
        <div className="flex items-center gap-space-3 mb-space-4">
          <div className="text-2xl flex-shrink-0">🌺</div>
          {!isCollapsed && <h1 className="text-xl font-bold text-poppy-primary">Poppy</h1>}
        </div>
        {!isCollapsed && (
          <p className="text-xs text-poppy-primary font-medium uppercase tracking-wider">Product Management OS</p>
        )}
        {/* Collapse/Expand Toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute top-space-4 right-space-4 p-2 hover:bg-poppy-primary/10 rounded-lg transition-smooth"
            title={isCollapsed ? 'Expand OS panel' : 'Collapse OS panel'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-poppy-primary" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-poppy-primary" />
            )}
          </button>
        )}
      </div>
      
      {/* Professional OS Navigation */}
      <nav className="flex-1 px-space-3 py-space-6 space-y-space-6 overflow-y-auto">
        <div className="space-y-space-2">
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-poppy-primary uppercase tracking-wider mb-space-3 px-space-3">
              Core Workflows
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
                  w-full text-left px-space-4 py-space-3 rounded-xl transition-smooth flex items-center gap-space-3
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-poppy-primary-light text-poppy-primary font-semibold border border-poppy-primary/20 elevation-sm' 
                    : 'text-warm-neutral hover:bg-warm-neutral-light hover:text-poppy-primary border border-transparent hover:border-warm-neutral/20'
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
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* System Configuration */}
        <div className="space-y-space-2">
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-warm-neutral uppercase tracking-wider mb-space-3 px-space-3">
              Configuration
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
                  w-full text-left px-space-4 py-space-3 rounded-xl transition-smooth flex items-center gap-space-3
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-lavender-secondary-light text-lavender-secondary font-semibold border border-lavender-secondary/20 elevation-sm' 
                    : 'text-warm-neutral hover:bg-warm-neutral-light hover:text-lavender-secondary border border-transparent hover:border-warm-neutral/20'
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
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* System Logout */}
      <div className="p-space-3 border-t border-border flex-shrink-0 bg-warm-neutral-light/30">
        <motion.button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={`
            w-full text-left px-space-4 py-space-3 rounded-xl transition-smooth flex items-center gap-space-3 text-warm-neutral hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20
            ${isCollapsed ? 'justify-center' : ''}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={isCollapsed ? 'End Session' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <div>
              <div className="font-medium">End Session</div>
              <div className="text-xs opacity-75">Sign out safely</div>
            </div>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
} 