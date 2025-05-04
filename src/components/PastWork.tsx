"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Eye, Trash2, ChevronDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"

interface PastWorkItem {
  id: string
  title: string
  url: string
  createdAt: string
}

interface PastWorkProps {
  storageKey: string
  title: string
  onCountUpdate?: (count: number) => void
  onExpand?: () => void
  largeFormat?: boolean
  onClose?: () => void
}

export default function PastWork({
  storageKey,
  title,
  onCountUpdate,
  onExpand,
  largeFormat = false,
  onClose,
}: PastWorkProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [items, setItems] = useState<PastWorkItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PastWorkItem[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<PastWorkItem | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadItems = useCallback(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsedItems = JSON.parse(stored)
        setItems(parsedItems)
        setFilteredItems(parsedItems)
        if (onCountUpdate) {
          onCountUpdate(parsedItems.length)
        }
      } catch (error) {
        console.error(`Error parsing ${storageKey}:`, error)
        setItems([])
        setFilteredItems([])
      }
    } else {
      setItems([])
      setFilteredItems([])
    }
  }, [storageKey, onCountUpdate])

  // Load items on mount and when storageKey changes
  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Listen for storage changes
  useEffect(() => {
    // Create a custom event name based on the storageKey
    const updateEventName = `${storageKey}Updated`

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        loadItems()
      }
    }

    const handleCustomEvent = () => {
      loadItems()
    }

    // Listen for both storage events and custom events
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(updateEventName, handleCustomEvent)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener(updateEventName, handleCustomEvent)
    }
  }, [storageKey, loadItems])

  // Filter items when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    const filtered = items.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredItems(filtered)
  }, [searchQuery, items])

  // Focus search input when expanded in large format
  useEffect(() => {
    if (largeFormat && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 300)
    }
  }, [largeFormat])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const updatedItems = items.filter((item) => item.id !== id)
      setItems(updatedItems)
      setFilteredItems(
        updatedItems.filter(
          (item) => !searchQuery.trim() || item.title.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      )
      localStorage.setItem(storageKey, JSON.stringify(updatedItems))

      if (onCountUpdate) {
        onCountUpdate(updatedItems.length)
      }

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent(`${storageKey}Updated`))
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleExpand = () => {
    if (!isExpanded && onExpand) {
      onExpand()
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  const handleItemSelect = (item: PastWorkItem) => {
    setSelectedItem(item)
  }

  // Compact view (collapsed or toggle button)
  if (!largeFormat && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
      >
        <Button
          variant="ghost"
          onClick={handleToggleExpand}
          className="group flex items-center gap-2 text-[#EF6351] hover:text-[#d94d38] hover:bg-transparent rounded-full px-4 py-2 border-none shadow-none"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-500">
            <Search className="h-3 w-3" />
          </div>
          <span className="text-sm font-normal">{title}</span>
          <span className="ml-1 text-xs text-rose-400 group-hover:text-rose-500 opacity-70">({items.length})</span>
        </Button>
      </motion.div>
    )
  }

  // Full view (expanded or large format)
  return (
    <LayoutGroup>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-8"
      >
        {!largeFormat && (
          <motion.button
            layout
            onClick={handleToggleExpand}
            className="w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100 hover:bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all duration-300"
            aria-expanded={isExpanded}
            aria-controls="pastwork-content"
          >
            <span className="text-lg font-medium text-[#232426] flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-500">
                <Search className="h-3 w-3" />
              </div>
              {title}
            </span>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
              <ChevronDown className="w-5 h-5 text-rose-400" />
            </motion.div>
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          {(isExpanded || largeFormat) && (
            <motion.div
              layout
              key="pastwork-content"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mt-4 relative backdrop-blur-sm bg-white/70 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Search header with input */}
              <motion.div layout className="p-4 border-b border-rose-100/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-rose-400" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search your past PRDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 text-sm rounded-full border-rose-100 bg-white/80 backdrop-blur-sm shadow-sm focus-visible:ring-rose-200"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1 top-1 h-8 w-8 rounded-full hover:bg-rose-50/70"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear search</span>
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* PRD list */}
              <motion.div layout>
                {filteredItems.length > 0 ? (
                  <ul className="divide-y divide-rose-100/30">
                    {filteredItems.map((item, index) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                        className="group"
                      >
                        <Dialog>
                          <div className="flex items-center justify-between p-4 hover:bg-rose-50/70 transition-colors">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-800">{item.title}</h3>
                              <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-100/50"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-100/50"
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                        </Dialog>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-500">
                      {items.length === 0
                        ? "No PRDs found. Create your first one!"
                        : "No PRDs found matching your search"}
                    </p>
                  </motion.div>
                )}
              </motion.div>

              <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-rose-100/20" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        {(isExpanded || largeFormat) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2 text-center flex justify-between items-center"
          >
            <p className="text-xs text-gray-500">
              {filteredItems.length} PRD{filteredItems.length !== 1 ? "s" : ""} available
            </p>
            {largeFormat && onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-rose-400 hover:text-rose-500 hover:bg-transparent"
              >
                Close
              </Button>
            )}
          </motion.div>
        )}
      </motion.div>
    </LayoutGroup>
  )
}
