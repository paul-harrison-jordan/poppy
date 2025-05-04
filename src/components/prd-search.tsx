"use client"

import type * as React from "react"
import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion, LayoutGroup } from "framer-motion"
import { ChevronDown, Eye, FilePlus, Search, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PrdItem {
  id: string
  title: string
  date: string
  time: string
}

// Sample data based on the screenshots
const samplePrds: PrdItem[] = [
  { id: "1", title: "asdfasdf", date: "5/3/2025", time: "11:00:51 AM" },
  { id: "2", title: "test", date: "5/3/2025", time: "2:07:08 PM" },
  { id: "3", title: "Ticket Auto Snooze", date: "5/3/2025", time: "6:30:38 PM" },
  { id: "4", title: "Ticket auto Snooze", date: "5/3/2025", time: "6:34:36 PM" },
]

export function PrdSearch() {
  const [activeTab, setActiveTab] = useState<"create" | "search">("create")
  const [prdTitle, setPrdTitle] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPrd, setSelectedPrd] = useState<PrdItem | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle new PRD creation
    console.log("Creating new PRD:", prdTitle)
    setPrdTitle("")
  }

  const handlePrdSelect = (prd: PrdItem) => {
    setSelectedPrd(prd)
  }

  const filteredPrds = searchQuery
    ? samplePrds.filter((prd) => prd.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : samplePrds

  // Focus input when tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "create" && createInputRef.current) {
        createInputRef.current.focus()
      } else if (activeTab === "search" && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 300) // Delay focus until after animation completes

    return () => clearTimeout(timer)
  }, [activeTab])

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <h1 className="text-4xl font-bold text-center my-12">We&apos;re 1% Done</h1>

      <LayoutGroup>
        <div className="relative mb-6">
          {/* Custom Tabs */}
          <div className="relative z-10 flex justify-center mb-4">
            <motion.div
              layout
              className="bg-white/80 backdrop-blur-sm border border-rose-100 p-1 rounded-full shadow-sm flex"
            >
              <motion.button
                layout
                onClick={() => setActiveTab("create")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                  activeTab === "create"
                    ? "bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow-sm"
                    : "text-gray-600 hover:text-rose-500",
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
                    ? "bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow-sm"
                    : "text-gray-600 hover:text-rose-500",
                )}
              >
                <Search className="h-4 w-4" />
                <span>Find PRD</span>
              </motion.button>
            </motion.div>
          </div>

          <div className="relative">
            <AnimatePresence initial={false}>
              {activeTab === "create" && (
                <motion.div
                  key="create-tab"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 },
                  }}
                >
                  <form onSubmit={handleCreateSubmit} className="relative">
                    <motion.div
                      layout
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Input
                        ref={createInputRef}
                        type="text"
                        placeholder="Give your PRD a title..."
                        value={prdTitle}
                        onChange={(e) => setPrdTitle(e.target.value)}
                        className="pr-12 h-12 text-base rounded-full border-rose-100 bg-white/80 backdrop-blur-sm shadow-sm focus-visible:ring-rose-200"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!prdTitle.trim()}
                        className={cn(
                          "absolute right-1 top-1 rounded-full shadow-sm transition-all",
                          prdTitle.trim()
                            ? "bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 opacity-100"
                            : "bg-gray-200 opacity-70",
                        )}
                      >
                        <ChevronDown className="h-5 w-5 rotate-90" />
                        <span className="sr-only">Create PRD</span>
                      </Button>
                    </motion.div>
                  </form>
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-2 text-center"
                  >
                    <p className="text-xs text-gray-500">
                      Enter a title for your new PRD and press the arrow to create it
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === "search" && (
                <motion.div
                  key="search-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 },
                  }}
                >
                  <motion.div
                    layout
                    initial={{ scale: 0.95, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="relative backdrop-blur-sm bg-white/70 rounded-2xl shadow-sm overflow-hidden"
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
                      {filteredPrds.length > 0 ? (
                        <ul className="divide-y divide-rose-100/30">
                          {filteredPrds.map((prd, index) => (
                            <motion.li
                              key={prd.id}
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
                                    <h3 className="font-medium text-gray-800">{prd.title}</h3>
                                    <p className="text-xs text-gray-500">
                                      {prd.date}, {prd.time}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-100/50"
                                        onClick={() => handlePrdSelect(prd)}
                                      >
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">View</span>
                                      </Button>
                                    </DialogTrigger>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-100/50"
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
                          <p className="text-sm text-gray-500">No PRDs found matching your search</p>
                        </motion.div>
                      )}
                    </motion.div>

                    <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-rose-100/20" />
                  </motion.div>

                  {/* Results count */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-center"
                  >
                    <p className="text-xs text-gray-500">
                      {filteredPrds.length} PRD{filteredPrds.length !== 1 ? "s" : ""} available
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </LayoutGroup>

      {/* PRD View Dialog */}
      {selectedPrd && (
        <DialogContent className="sm:max-w-[600px] bg-white/90 backdrop-blur-sm border-rose-100/30 rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
              {selectedPrd.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-sm text-gray-500">
              Created on {selectedPrd.date} at {selectedPrd.time}
            </div>
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100/30">
              <p className="text-sm text-gray-600">PRD content would appear here...</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/70 rounded-full">
                Edit
              </Button>
              <Button className="bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 rounded-full shadow-sm">
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </div>
  )
}
