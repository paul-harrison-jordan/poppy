"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2 } from "lucide-react"

interface AlertNotificationProps {
  title: string
  message: string
  link?: {
    text: string
    url: string
  }
  onDismiss?: () => void
  position?: "top-right" | "top-center" | "top-left" | "bottom-right" | "bottom-center" | "bottom-left"
}

export function AlertNotification({
  title,
  message,
  link,
  onDismiss,
  position = "top-right",
}: AlertNotificationProps) {
  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-center": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-center": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  return (
    <AnimatePresence>
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
          <div className="px-5 py-4">
            {/* Header with title and dismiss button */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 pr-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{title}</h3>
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="ml-2 text-[#232426] hover:text-[#EF6351] transition-colors"
                aria-label="Dismiss notification"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Link if provided */}
            {link && (
              <div className="mt-2">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#EF6351] hover:text-[#d94d38] transition-colors"
                >
                  {link.text} →
                </a>
              </div>
            )}
          </div>

          {/* Green progress bar at bottom */}
          <div className="h-0.5 bg-green-500" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 