'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusIndicatorVariants = cva(
  "status-indicator font-medium text-sm transition-smooth",
  {
    variants: {
      status: {
        active: "status-indicator--active text-sprout-success",
        pending: "status-indicator--pending text-warning",
        blocked: "status-indicator--blocked text-destructive", 
        review: "status-indicator--review text-lavender-secondary",
        completed: "status-indicator--active text-sprout-success",
        draft: "status-indicator--pending text-warm-neutral",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      }
    },
    defaultVariants: {
      status: "pending",
      size: "default",
    },
  }
)

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusIndicatorVariants> {
  label: string
  showDot?: boolean
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, status, size, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(statusIndicatorVariants({ status, size, className }))}
        {...props}
      >
        <span>{label}</span>
      </div>
    )
  }
)
StatusIndicator.displayName = "StatusIndicator"

export { StatusIndicator, statusIndicatorVariants }