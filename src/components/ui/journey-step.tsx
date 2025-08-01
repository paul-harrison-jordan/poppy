'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const journeyStepVariants = cva(
  "journey-step",
  {
    variants: {
      status: {
        completed: "journey-step--active",
        current: "journey-step--current", 
        pending: "",
      }
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export interface JourneyStepProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof journeyStepVariants> {
  title: string
  description?: string
  timestamp?: string
  isLast?: boolean
}

const JourneyStep = React.forwardRef<HTMLDivElement, JourneyStepProps>(
  ({ className, status, title, description, timestamp, isLast = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          journeyStepVariants({ status, className }),
          isLast && "after:hidden"
        )}
        {...props}
      >
        <div className="mb-space-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">{title}</h4>
            {timestamp && (
              <span className="text-xs text-warm-neutral">{timestamp}</span>
            )}
          </div>
          {description && (
            <p className="text-sm text-warm-neutral mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    )
  }
)
JourneyStep.displayName = "JourneyStep"

export { JourneyStep, journeyStepVariants }