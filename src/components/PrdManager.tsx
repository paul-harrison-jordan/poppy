"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FilePlus, Search, Eye, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import DraftForm from "@/components/DraftForm"
import { cn } from "@/lib/utils"

interface PrdItem {
  id: string
  title: string
  url: string
  createdAt: string
}

export function PrdManager() {
  const [activeTab, setActiveTab] = useState<"create" | "search">("create")
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<PrdItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PrdItem[]>([])
  const [selectedItem, setSelectedItem] = useState<PrdItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState<number | "auto">("auto")

  // Load items from localStorage
  const loadItems = () => {
    const stored = localStorage.getItem("savedPRD")
    if (stored) {
      try {
        const parsedItems = JSON.parse(stored)
        setItems(parsedItems)
        setFilteredItems(parsedItems)
      } catch (error) {
        console.error("Error parsing savedPRD:", error)
        setItems([])
        setFilteredItems([])
      }
    } else {
      setItems([])
      setFilteredItems([])
    }
  }

  // Load items on mount
  useEffect(() => {
    loadItems()
  }, [])

  // Listen for storage changes
  useEffect(() => {
    const updateEventName = "savedPRDUpdated"

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "savedPRD") {
        loadItems()
      }
    }

    const handleCustomEvent = () => {
      loadItems()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(updateEventName, handleCustomEvent)
    window.addEventListener("prdCountUpdated", handleCustomEvent)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener(updateEventName, handleCustomEvent)
      window.removeEventListener("prdCountUpdated", handleCustomEvent)
    }
  }, [])

  // Filter items when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    const filtered = items.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredItems(filtered)
  }, [searchQuery, items])

  // Focus search input when tab changes to search
  useEffect(() => {
    if (activeTab === "search" && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 300)
    }
  }, [activeTab])

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
      localStorage.setItem("savedPRD", JSON.stringify(updatedItems))

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("prdCountUpdated", { detail: { count: updatedItems.length } }))
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleItemSelect = (item: PrdItem) => {
    setSelectedItem(item)
  }

  // Animation variants for smoother transitions
  const contentVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      y: -30,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <h1 className="text-4xl font-bold text-center my-12">We&apos;re 1% Done</h1>

      <div className="relative mb-6">
        {/* Custom Tabs */}
        <div className="relative z-10 flex justify-center mb-4">
          <motion.div
            layout
            className="bg-white/80 backdrop-blur-sm border border-poppy-100 p-1 rounded-full shadow-sm flex"
          >
            <motion.button
              layout
              onClick={() => setActiveTab("create")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                activeTab === "create"
                  ? "bg-poppy-500 hover:bg-poppy-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-poppy-500",
              )}
            >
              <FilePlus className="h-4 w-4" />
              <span>New PRD</span>
            </motion.button>
            <motion.button
              layout
              onClick={() => setActiveTab("search")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                activeTab === "search"
                  ? "bg-poppy-500 hover:bg-poppy-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-poppy-500",
              )}
            >
              <Search className="h-4 w-4" />
              <span>Find PRD</span>
            </motion.button>
          </motion.div>
        </div>

        <div className="relative min-h-[300px]" ref={containerRef}>
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "create" ? (
              <motion.div
                key="create-tab"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
                className="absolute w-full"
              >
                <DraftForm />
              </motion.div>
            ) : (
              <motion.div
                key="search-tab"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
                className="absolute w-full"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="relative backdrop-blur-sm bg-white/70 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Search header with input */}
                  <div className="p-4 border-b border-poppy-100/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-poppy-500" />
                      <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search your past PRDs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 text-sm rounded-full border-poppy-100 bg-white/80 backdrop-blur-sm shadow-sm focus-visible:ring-poppy-200"
                      />
                      {searchQuery && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-1 top-1 h-8 w-8 rounded-full hover:bg-poppy-50/70"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear search</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* PRD list */}
                  <div>
                    {filteredItems.length > 0 ? (
                      <ul className="divide-y divide-poppy-100/30">
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
                              <div className="flex items-center justify-between p-4 hover:bg-poppy-50/70 transition-colors">
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-800">{item.title}</h3>
                                  <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full text-poppy-500 hover:text-poppy-600 hover:bg-poppy-100/50"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">View</span>
                                    </Button>
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full text-poppy-500 hover:text-poppy-600 hover:bg-poppy-100/50"
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
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-gray-500">
                          {items.length === 0
                            ? "No PRDs found. Create your first one!"
                            : "No PRDs found matching your search"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-poppy-100/20" />
                </motion.div>

                {/* Results count */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-center"
                >
                  <p className="text-xs text-gray-500">
                    {filteredItems.length} PRD{filteredItems.length !== 1 ? "s" : ""} available
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
