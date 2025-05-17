"use client"

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  minComments: number
  minCommentors: number
  maxDaysSinceEdit: number
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    minComments: 0,
    minCommentors: 0,
    maxDaysSinceEdit: 0
  })

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = {
      ...filters,
      [key]: parseInt(value) || 0
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="minComments">Minimum Comments</Label>
          <Input
            id="minComments"
            type="number"
            min="0"
            value={filters.minComments}
            onChange={(e) => handleFilterChange('minComments', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="minCommentors">Minimum Commentors</Label>
          <Input
            id="minCommentors"
            type="number"
            min="0"
            value={filters.minCommentors}
            onChange={(e) => handleFilterChange('minCommentors', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="maxDaysSinceEdit">Max Days Since Edit</Label>
          <Select
            value={filters.maxDaysSinceEdit.toString()}
            onValueChange={(value) => handleFilterChange('maxDaysSinceEdit', value)}
          >
            <SelectTrigger id="maxDaysSinceEdit">
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any time</SelectItem>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last week</SelectItem>
              <SelectItem value="30">Last month</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
} 