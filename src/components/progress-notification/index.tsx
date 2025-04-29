"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, X, Loader2 } from "lucide-react"

// Types
export interface Document {
  id: string
  name: string
  synced: boolean
}

export interface ProgressNotificationProps {
  isLoading: boolean
  documents: Document[]
  onComplete?: () => void
  onDismiss?: () => void
  position?: "top-right" | "top-center" | "top-left" | "bottom-right" | "bottom-center" | "bottom-left"
}

export function ProgressNotification({
  isLoading,
  documents,
  onComplete,
  onDismiss,
  position = "top-right",
}: ProgressNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [recentlySynced, setRecentlySynced] = useState<string[]>([])
  const historyRef = useRef<HTMLDivElement>(null)
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate completion percentage
  const totalDocs = documents.length
  const syncedDocs = documents.filter((doc) => doc.synced).length
  const completionPercentage = totalDocs > 0 ? Math.round((syncedDocs / totalDocs) * 100) : 0
  const isComplete = completionPercentage === 100

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-center": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-center": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }

  // Show notification when loading starts
  useEffect(() => {
    if (isLoading) {
      setVisible(true)

      // Clear any existing timeout when loading starts again
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current)
        dismissTimeoutRef.current = null
      }
    }
  }, [isLoading])

  // Handle completion and auto-dismiss
  useEffect(() => {
    // If all documents are synced and we're still in loading state
    if (isComplete && isLoading) {
      // Set a timeout to auto-dismiss after 3 seconds
      dismissTimeoutRef.current = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 3000)

      return () => {
        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current)
        }
      }
    }
  }, [isComplete, isLoading, onComplete])

  // Track newly synced documents
  useEffect(() => {
    if (!isLoading) return

    // Check for newly synced documents
    const newlySynced = documents.filter((doc) => doc.synced && !recentlySynced.includes(doc.id)).map((doc) => doc.id)

    if (newlySynced.length > 0) {
      // Add to recently synced list
      setRecentlySynced((prev) => [...prev, ...newlySynced])

      // Scroll to the bottom of the history list
      setTimeout(() => {
        if (historyRef.current) {
          historyRef.current.scrollTop = historyRef.current.scrollHeight
        }
      }, 100)
    }
  }, [documents, isLoading, recentlySynced])

  // If not visible or no documents, don't show anything
  if (!visible || documents.length === 0) {
    return null
  }

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300,
            exit: { duration: 0.5, ease: "easeOut" },
          }}
          className={`fixed z-50 ${positionClasses[position]}`}
        >
          <motion.div
            className="backdrop-blur-md bg-white/70 border border-white/20 shadow-lg rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05) inset",
            }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ exit: { duration: 0.4 } }}
          >
            <div className="px-5 py-4 relative">
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              {/* Header with progress */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <svg className="w-10 h-10">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="#f1f1f1" strokeWidth="2" />
                    <motion.circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke={isComplete ? "#22c55e" : "#f97316"}
                      strokeWidth="2"
                      strokeDasharray={2 * Math.PI * 18}
                      strokeDashoffset={2 * Math.PI * 18 * (1 - completionPercentage / 100)}
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - completionPercentage / 100) }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      transform="rotate(-90 20 20)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-medium ${isComplete ? "text-green-600" : "text-orange-600"}`}>
                      {completionPercentage}%
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800">Syncing Documents</h3>
                  <p className="text-xs text-gray-500">
                    {syncedDocs} of {totalDocs} documents synced
                  </p>
                </div>
              </div>

              {/* Document history list */}
              <div
                ref={historyRef}
                className="max-h-[180px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
              >
                {documents.map((doc) => (
                  <DocumentItem key={doc.id} document={doc} isNew={doc.synced && recentlySynced.includes(doc.id)} />
                ))}
              </div>
            </div>

            {/* Progress bar at bottom */}
            <motion.div
              className={`h-0.5 ${isComplete ? "bg-green-500" : "bg-orange-500"}`}
              initial={{ width: "0%" }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface DocumentItemProps {
  document: Document
  isNew: boolean
}

function DocumentItem({ document, isNew }: DocumentItemProps) {
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="flex items-center gap-2 rounded-md p-2 bg-transparent"
    >
      <div className="flex-shrink-0">
        {document.synced ? (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100"
          >
            <Loader2 className="h-3.5 w-3.5 text-gray-500" />
          </motion.div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-gray-700">{document.name}</p>
      </div>
    </motion.div>
  )
}
