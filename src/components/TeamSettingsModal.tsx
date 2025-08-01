'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Settings, Users, FileText, Clock, Target, Trash2 } from 'lucide-react'

interface Team {
  id: number
  team_name: string
  team_description: string
  default_capacity_hours_per_week: number
  default_utilization_target: number
  created_at: string
}

interface TeamSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: number
  onTeamUpdated: () => void
}

export default function TeamSettingsModal({ isOpen, onClose, teamId, onTeamUpdated }: TeamSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    team_name: '',
    team_description: '',
    default_capacity_hours_per_week: 40,
    default_utilization_target: 0.80
  })

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeamDetails()
    }
  }, [isOpen, teamId, fetchTeamDetails])

  const fetchTeamDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setTeam(data)
        setFormData({
          team_name: data.team_name,
          team_description: data.team_description || '',
          default_capacity_hours_per_week: data.default_capacity_hours_per_week,
          default_utilization_target: data.default_utilization_target
        })
      }
    } catch (error) {
      console.error('Error fetching team details:', error)
    }
  }, [teamId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onTeamUpdated()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update team')
      }
    } catch (error) {
      console.error('Error updating team:', error)
      alert('Failed to update team')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!team) return

    const confirmMessage = `Are you sure you want to delete "${team.team_name}"? This action cannot be undone and will remove all team members.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onTeamUpdated()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete team')
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Failed to delete team')
    } finally {
      setDeleteLoading(false)
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

  if (!team) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy-primary mx-auto mb-4"></div>
            <p className="text-warm-neutral">Loading team settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-poppy-primary" />
            <h2 className="text-xl font-semibold text-poppy-primary">Team Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-neutral-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-neutral" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
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
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors resize-none"
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
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
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
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
              />
            </div>
          </div>

          <div className="text-xs text-warm-neutral">
            Default settings apply to new team members unless overridden
          </div>

          {/* Team Info */}
          <div className="bg-warm-neutral-light p-3 rounded-lg">
            <p className="text-xs text-warm-neutral">
              <strong>Created:</strong> {new Date(team.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-warm-neutral-light transition-colors"
              disabled={loading || deleteLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-colors disabled:opacity-50"
              disabled={loading || deleteLoading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="border-t border-border p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-xs text-warm-neutral mb-4">
              Deleting a team will remove all team members and cannot be undone.
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleDeleteTeam}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={loading || deleteLoading}
          >
            <Trash2 className="w-4 h-4" />
            {deleteLoading ? 'Deleting...' : 'Delete Team'}
          </button>
        </div>
      </div>
    </div>
  )
}