'use client'

import { useState } from 'react'
import { X, Users, FileText, Clock, Target } from 'lucide-react'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onTeamCreated: () => void
}

export default function CreateTeamModal({ isOpen, onClose, onTeamCreated }: CreateTeamModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    team_name: '',
    team_description: '',
    default_capacity_hours_per_week: 40,
    default_utilization_target: 0.80
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onTeamCreated()
        onClose()
        // Reset form
        setFormData({
          team_name: '',
          team_description: '',
          default_capacity_hours_per_week: 40,
          default_utilization_target: 0.80
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create team')
      }
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'default_capacity_hours_per_week' 
        ? parseInt(value) || 0
        : name === 'default_utilization_target'
        ? parseFloat(value) || 0
        : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-space-4">
      <div className="bg-card rounded-xl elevation-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-space-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-poppy-primary" />
            <h2 className="text-xl font-semibold text-poppy-primary">Create New Team</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-neutral-light rounded-lg transition-smooth"
          >
            <X className="w-5 h-5 text-warm-neutral hover:text-poppy-primary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-space-6 space-y-space-4">
          {/* Team Name */}
          <div>
            <label htmlFor="team_name" className="block text-sm font-medium text-poppy-primary mb-2">
              Team Name *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-warm-neutral" />
              <input
                type="text"
                id="team_name"
                name="team_name"
                value={formData.team_name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-smooth"
                placeholder="e.g., Frontend Team, Mobile Squad"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="team_description" className="block text-sm font-medium text-poppy-primary mb-2">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-warm-neutral" />
              <textarea
                id="team_description"
                name="team_description"
                value={formData.team_description}
                onChange={handleInputChange}
                rows={3}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-smooth resize-none"
                placeholder="Brief description of the team's focus and responsibilities"
              />
            </div>
          </div>

          {/* Default Settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Capacity Hours */}
            <div>
              <label htmlFor="default_capacity_hours_per_week" className="block text-sm font-medium text-poppy-primary mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Hours/Week
                </div>
              </label>
              <input
                type="number"
                id="default_capacity_hours_per_week"
                name="default_capacity_hours_per_week"
                value={formData.default_capacity_hours_per_week}
                onChange={handleInputChange}
                min="1"
                max="80"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-smooth"
              />
            </div>

            {/* Utilization Target */}
            <div>
              <label htmlFor="default_utilization_target" className="block text-sm font-medium text-poppy-primary mb-2">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Target %
                </div>
              </label>
              <input
                type="number"
                id="default_utilization_target"
                name="default_utilization_target"
                value={formData.default_utilization_target}
                onChange={handleInputChange}
                min="0.1"
                max="1.0"
                step="0.01"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-smooth"
              />
            </div>
          </div>

          <div className="text-xs text-warm-neutral">
            Default settings can be overridden per team member
          </div>

          {/* Actions */}
          <div className="flex gap-space-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-warm-neutral-light transition-smooth"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-smooth disabled:opacity-50 elevation-sm"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}