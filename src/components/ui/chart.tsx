'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const chartContainerVariants = cva(
  "chart-container",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        elevated: "bg-card border-border elevation-md",
        featured: "bg-gradient-to-br from-card to-muted/30 border-border elevation-lg",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ChartContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chartContainerVariants> {
  title?: string
  description?: string
  headerAction?: React.ReactNode
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, variant, title, description, headerAction, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(chartContainerVariants({ variant, className }))}
        {...props}
      >
        {(title || description || headerAction) && (
          <div className="flex items-start justify-between mb-space-4">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-warm-neutral">
                  {description}
                </p>
              )}
            </div>
            {headerAction && (
              <div className="flex-shrink-0">
                {headerAction}
              </div>
            )}
          </div>
        )}
        <div className="chart-content">
          {children}
        </div>
      </div>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

// Metric Card Component for KPIs
const metricCardVariants = cva(
  "metric-card",
  {
    variants: {
      trend: {
        up: "border-l-4 border-l-sprout-success",
        down: "border-l-4 border-l-destructive", 
        neutral: "border-l-4 border-l-warm-neutral",
      }
    },
    defaultVariants: {
      trend: "neutral",
    },
  }
)

export interface MetricCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  title: string
  value: string | number
  change?: string
  changeLabel?: string
  icon?: React.ReactNode
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, trend, title, value, change, changeLabel, icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(metricCardVariants({ trend, className }))}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-warm-neutral mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mb-space-2">
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-sprout-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-warm-neutral"
                )}>
                  {change}
                </span>
                {changeLabel && (
                  <span className="text-xs text-warm-neutral">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="p-space-3 bg-poppy-primary-light rounded-xl flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
      </div>
    )
  }
)
MetricCard.displayName = "MetricCard"

export { ChartContainer, chartContainerVariants, MetricCard, metricCardVariants }