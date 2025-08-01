'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { StatusIndicator } from './status-indicator'

const osHeaderVariants = cva(
  "os-header transition-smooth",
  {
    variants: {
      variant: {
        default: "py-space-6",
        compact: "py-space-4",
        hero: "py-space-8",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SystemStatusProps {
  label: string
  status: 'active' | 'pending' | 'blocked' | 'review' | 'completed' | 'draft'
}

export interface OSHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof osHeaderVariants> {
  title: string
  subtitle?: string
  systemStatus?: SystemStatusProps[]
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
}

const OSHeader = React.forwardRef<HTMLDivElement, OSHeaderProps>(
  ({ 
    className, 
    variant, 
    title, 
    subtitle, 
    systemStatus, 
    actions, 
    breadcrumbs,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(osHeaderVariants({ variant, className }))}
        {...props}
      >
        <div className="max-w-7xl mx-auto px-space-6">
          {breadcrumbs && (
            <div className="mb-space-4">
              {breadcrumbs}
            </div>
          )}
          
          <div className="flex items-start justify-between flex-wrap gap-space-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-poppy-primary mb-space-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg text-warm-neutral mb-space-4">
                  {subtitle}
                </p>
              )}
              
              {systemStatus && systemStatus.length > 0 && (
                <div className="flex items-center gap-space-6 text-sm">
                  {systemStatus.map((status, index) => (
                    <StatusIndicator
                      key={index}
                      status={status.status}
                      label={status.label}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
          
          {children}
        </div>
      </div>
    )
  }
)
OSHeader.displayName = "OSHeader"

export { OSHeader, osHeaderVariants }