"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Prd } from '@/types/my-work'
import { determineCategory } from '@/lib/prdCategorization'

export interface FilterState {
  minComments: number
  minCommentors: number
  maxDaysSinceEdit: number
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void
  activeCategory: string
  onCategoryChange: (category: string) => void
  prds: Prd[]
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'needs-review', label: 'Needs Review' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'at-risk', label: 'At Risk' },
  { id: 'ready-for-review', label: 'Ready' },
  { id: 'inactive', label: 'Inactive' }
] as const

export default function FilterBar({ 
  onFilterChange, 
  activeCategory, 
  onCategoryChange,
  prds
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleTabChange = (tab: string) => {
    onCategoryChange(tab)
    // Apply different filter presets based on the tab
    switch (tab) {
      case 'active':
        onFilterChange({ minComments: 1, minCommentors: 1, maxDaysSinceEdit: 7 })
        break
      case 'in-progress':
        onFilterChange({ minComments: 0, minCommentors: 0, maxDaysSinceEdit: 7 })
        break
      case 'needs-review':
        onFilterChange({ minComments: 1, minCommentors: 1, maxDaysSinceEdit: 0 })
        break
      case 'blocked':
        onFilterChange({ minComments: 3, minCommentors: 2, maxDaysSinceEdit: 0 })
        break
      case 'at-risk':
        onFilterChange({ minComments: 2, minCommentors: 2, maxDaysSinceEdit: 3 })
        break
      case 'ready-for-review':
        onFilterChange({ minComments: 0, minCommentors: 0, maxDaysSinceEdit: 5 })
        break
      case 'inactive':
        onFilterChange({ minComments: 0, minCommentors: 0, maxDaysSinceEdit: 30 })
        break
      case 'all':
      default:
        onFilterChange({ minComments: 0, minCommentors: 0, maxDaysSinceEdit: 0 })
    }
  }

  const getCategoryCount = (category: string) => {
    if (category === 'all') return prds.length
    return prds.filter(prd => {
      const prdCategory = determineCategory(prd)
      return prdCategory === category
    }).length
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'active':
        return 'bg-green-50 text-green-700 hover:bg-green-100'
      case 'at-risk':
        return 'bg-amber-50 text-amber-700 hover:bg-amber-100'
      case 'blocked':
        return 'bg-red-50 text-red-700 hover:bg-red-100'
      case 'needs-review':
        return 'bg-purple-50 text-purple-700 hover:bg-purple-100'
      case 'ready-for-review':
        return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 hover:bg-blue-100'
      case 'inactive':
        return 'bg-gray-50 text-gray-700 hover:bg-gray-100'
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-100'
    }
  }

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => {
          const count = getCategoryCount(category.id)
          const color = getCategoryColor(category.id)
          return (
            <Button
              key={category.id}
              variant="ghost"
              size="sm"
              className={`px-3 py-1.5 rounded-full transition-colors ${
                activeCategory === category.id
                  ? `${color} shadow-sm`
                  : `${color} opacity-70 hover:opacity-100`
              }`}
              onClick={() => handleTabChange(category.id)}
            >
              <span className="font-medium">{category.label}</span>
              <span className="ml-2 text-xs opacity-75">
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search PRDs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 text-sm rounded-lg border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm focus-visible:ring-poppy-200"
        />
        {searchQuery && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setSearchQuery('')}
            className="absolute right-1 top-1 h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    </div>
  )
} 