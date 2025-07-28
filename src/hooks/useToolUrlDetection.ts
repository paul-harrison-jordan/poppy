import { useEffect, useState, useRef } from 'react'
import { DetectedTool, detectToolUrls, enrichToolMetadata, generateToolSuggestionMessage } from '@/lib/toolUrlDetection'

interface UseToolUrlDetectionOptions {
  onToolsDetected?: (tools: DetectedTool[]) => void
  debounceMs?: number
  autoEnrich?: boolean
}

export function useToolUrlDetection(options: UseToolUrlDetectionOptions = {}) {
  const [detectedTools, setDetectedTools] = useState<DetectedTool[]>([])
  const [isEnriching, setIsEnriching] = useState(false)
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const { onToolsDetected, debounceMs = 500, autoEnrich = true } = options

  const analyzeText = async (text: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      const tools = detectToolUrls(text)
      
      if (tools.length > 0) {
        setDetectedTools(tools)
        setSuggestionMessage(generateToolSuggestionMessage(tools))
        
        if (autoEnrich) {
          setIsEnriching(true)
          try {
            const enrichedTools = await Promise.all(tools.map(enrichToolMetadata))
            setDetectedTools(enrichedTools)
            onToolsDetected?.(enrichedTools)
          } catch (error) {
            console.error('Error enriching tool metadata:', error)
            onToolsDetected?.(tools)
          } finally {
            setIsEnriching(false)
          }
        } else {
          onToolsDetected?.(tools)
        }
      } else {
        setDetectedTools([])
        setSuggestionMessage('')
      }
    }, debounceMs)
  }

  const clearDetections = () => {
    setDetectedTools([])
    setSuggestionMessage('')
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    detectedTools,
    suggestionMessage,
    isEnriching,
    analyzeText,
    clearDetections
  }
}

export function useToolUrlWatcher(elementRef: React.RefObject<HTMLElement>, options: UseToolUrlDetectionOptions = {}) {
  const { analyzeText, ...detection } = useToolUrlDetection(options)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement
      if (target.value) {
        analyzeText(target.value)
      }
    }

    const handlePaste = (event: ClipboardEvent) => {
      // Handle paste with a small delay to let the content be pasted
      setTimeout(() => {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement
        if (target.value) {
          analyzeText(target.value)
        }
      }, 100)
    }

    element.addEventListener('input', handleInput)
    element.addEventListener('paste', handlePaste)

    return () => {
      element.removeEventListener('input', handleInput)
      element.removeEventListener('paste', handlePaste)
    }
  }, [elementRef, analyzeText])

  return detection
}