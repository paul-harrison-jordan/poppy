// Performance monitoring utilities
import React from 'react'
export class PerformanceMonitor {
  private static observers: Map<string, PerformanceObserver> = new Map()

  static startMetric(name: string) {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-start`)
    }
  }

  static endMetric(name: string) {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
      
      // Get the measurement
      const entries = performance.getEntriesByName(name, 'measure')
      const latestEntry = entries[entries.length - 1]
      
      if (latestEntry && process.env.NODE_ENV === 'development') {
        console.log(`Performance: ${name} took ${latestEntry.duration.toFixed(2)}ms`)
      }
      
      // Clean up marks
      performance.clearMarks(`${name}-start`)
      performance.clearMarks(`${name}-end`)
      performance.clearMeasures(name)
    }
  }

  static observeLCP(callback?: (entry: PerformanceEntry) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lcpEntry = entries[entries.length - 1]
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`LCP: ${lcpEntry.startTime.toFixed(2)}ms`)
        }
        
        callback?.(lcpEntry)
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', observer)
    }
  }

  static observeFID(callback?: (entry: PerformanceEntry) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`FID: ${(entry as PerformanceEventTiming).processingStart - entry.startTime}ms`)
          }
          callback?.(entry)
        })
      })
      
      observer.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', observer)
    }
  }

  static observeCLS(callback?: (entry: PerformanceEntry) => void) {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`CLS: ${(entry as PerformanceEntry & { value: number }).value}`)
          }
          callback?.(entry)
        })
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', observer)
    }
  }

  static disconnect() {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(metricName: string) {
  const startTime = performance.now()
  
  return {
    end: () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Hook Performance: ${metricName} took ${duration.toFixed(2)}ms`)
      }
      
      return duration
    }
  }
}

// Component wrapper for performance monitoring
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  metricName: string
) {
  const WrappedComponent = (props: T) => {
    const monitor = usePerformanceMonitor(metricName)
    
    React.useEffect(() => {
      monitor.end()
    }, [monitor])
    
    return React.createElement(Component, props)
  }
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`
  return WrappedComponent
}