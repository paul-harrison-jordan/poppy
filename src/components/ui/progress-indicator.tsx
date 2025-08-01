'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const progressIndicatorVariants = cva(
  "progress-bar",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-2", 
        lg: "h-3",
      },
      variant: {
        default: "",
        success: "",
        warning: "",
        danger: "",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

const progressFillVariants = cva(
  "progress-bar__fill",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-poppy-primary to-sprout-success",
        success: "bg-gradient-to-r from-sprout-success to-sprout-success-hover",
        warning: "bg-gradient-to-r from-warning to-warning/80",
        danger: "bg-gradient-to-r from-destructive to-destructive/80",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProgressIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressIndicatorVariants> {
  value: number
  max?: number
  showLabel?: boolean
  label?: string
}

const ProgressIndicator = React.forwardRef<HTMLDivElement, ProgressIndicatorProps>(
  ({ className, size, variant, value, max = 100, showLabel = false, label, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    return (
      <div ref={ref} className="w-full" {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-space-2">
            <span className="text-sm font-medium text-foreground">
              {label || "Progress"}
            </span>
            <span className="text-sm text-warm-neutral">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        <div className={cn(progressIndicatorVariants({ size, variant, className }))}>
          <div 
            className={cn(progressFillVariants({ variant }))}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)
ProgressIndicator.displayName = "ProgressIndicator"

export { ProgressIndicator, progressIndicatorVariants }