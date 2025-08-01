'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Users, Hash, FileText, Briefcase, Star } from 'lucide-react'

interface Engineer {
  id: number
  engineer_name: string
  engineer_email: string
  title: string
  skill_tags: string[]
  notes: string
}

interface AddTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onMemberAdded: () => void
  teamId: number
}

export default function AddTeamMemberModal({ isOpen, onClose, onMemberAdded, teamId }: AddTeamMemberModalProps) {
  const [loading, setLoading] = useState(false)
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [formData, setFormData] = useState({
    engineer_id: '',
    role: 'engineer',
    is_primary_role: false,
    joining_date: '',
    capacity_override: '',
    utilization_override: '',
    slack_handle: '',
    work_description: ''
  })
  const [newEngineerData, setNewEngineerData] = useState({
    engineer_name: '',
    engineer_email: '',
    title: '',
    skill_tags: [] as string[],
    capacity_hours_per_week: 40,
    utilization_target: 0.80
  })

  useEffect(() => {
    if (isOpen) {
      fetchEngineers()
    }
  }, [isOpen])

  const fetchEngineers = async () => {
    try {
      const response = await fetch('/api/engineers')
      if (response.ok) {
        const data = await response.json()
        setEngineers(data.engineers || [])
      }
    } catch (error) {
      console.error('Error fetching engineers:', error)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let engineerId = formData.engineer_id

      // If creating a new engineer, create them first
      if (isCreatingNew) {
        const createdEngineer = await createNewEngineer()
        if (!createdEngineer) {
          setLoading(false)
          return
        }
        engineerId = createdEngineer.id.toString()
      }

      const payload = {
        engineer_id: parseInt(engineerId),
        role: formData.role,
        is_primary_role: formData.is_primary_role,
        joining_date: formData.joining_date || null,
        capacity_override: formData.capacity_override ? parseInt(formData.capacity_override) : null,
        utilization_override: formData.utilization_override ? parseFloat(formData.utilization_override) : null,
      }

      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        // If slack handle or work description provided, update engineer record
        if (formData.slack_handle || formData.work_description) {
          await updateEngineerDetails(engineerId)
        }
        
        onMemberAdded()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add team member')
      }
    } catch (error) {
      console.error('Error adding team member:', error)
      alert('Failed to add team member')
    } finally {
      setLoading(false)
    }
  }

  const createNewEngineer = async () => {
    try {
      const response = await fetch('/api/engineers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newEngineerData,
          skill_tags: newEngineerData.skill_tags.length > 0 ? newEngineerData.skill_tags : []
        }),
      })

      if (response.ok) {
        const engineer = await response.json()
        return engineer
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create engineer')
        return null
      }
    } catch (error) {
      console.error('Error creating engineer:', error)
      alert('Failed to create engineer')
      return null
    }
  }

  const updateEngineerDetails = async (engineerId: string) => {
    try {
      // Update engineer's notes with slack handle and description
      const engineer = engineers.find(e => e.id === parseInt(engineerId))
      
      // If engineer not found in current list (newly created), get base notes
      let updatedNotes = engineer?.notes || ''
      
      if (formData.slack_handle) {
        updatedNotes += `\nSlack: @${formData.slack_handle}`
      }
      
      if (formData.work_description) {
        updatedNotes += `\nWork Description: ${formData.work_description}`
      }

      await fetch(`/api/engineers/${engineerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: updatedNotes.trim()
        }),
      })
    } catch (error) {
      console.error('Error updating engineer details:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      engineer_id: '',
      role: 'engineer',
      is_primary_role: false,
      joining_date: '',
      capacity_override: '',
      utilization_override: '',
      slack_handle: '',
      work_description: ''
    })
    setNewEngineerData({
      engineer_name: '',
      engineer_email: '',
      title: '',
      skill_tags: [],
      capacity_hours_per_week: 40,
      utilization_target: 0.80
    })
    setIsCreatingNew(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleNewEngineerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewEngineerData(prev => ({
      ...prev,
      [name]: name === 'capacity_hours_per_week' 
        ? parseInt(value) || 0
        : name === 'utilization_target'
        ? parseFloat(value) || 0
        : value
    }))
  }

  const handleSkillTagsChange = (skillsText: string) => {
    const skills = skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
    setNewEngineerData(prev => ({
      ...prev,
      skill_tags: skills
    }))
  }

  const selectedEngineer = engineers.find(e => e.id === parseInt(formData.engineer_id))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-poppy-primary" />
            <h2 className="text-xl font-semibold text-poppy-primary">Add Team Member</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-neutral-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-neutral" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Engineer Selection Mode */}
          <div className="border-b border-border pb-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !isCreatingNew 
                    ? 'bg-poppy-primary text-poppy-primary-foreground' 
                    : 'bg-warm-neutral-light text-warm-neutral hover:bg-poppy-primary/10'
                }`}
              >
                Select Existing Engineer
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isCreatingNew 
                    ? 'bg-poppy-primary text-poppy-primary-foreground' 
                    : 'bg-warm-neutral-light text-warm-neutral hover:bg-poppy-primary/10'
                }`}
              >
                Create New Engineer
              </button>
            </div>
          </div>

          {!isCreatingNew ? (
            /* Existing Engineer Selection */
            <div>
              <label htmlFor="engineer_id" className="block text-sm font-medium text-poppy-primary mb-2">
                Select Engineer *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-warm-neutral" />
                <select
                  id="engineer_id"
                  name="engineer_id"
                  value={formData.engineer_id}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                  required={!isCreatingNew}
                >
                  <option value="">Choose an engineer...</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.id} value={engineer.id}>
                      {engineer.engineer_name} ({engineer.title || 'No title'})
                    </option>
                  ))}
                </select>
              </div>
              {selectedEngineer && (
                <p className="text-xs text-warm-neutral mt-1">
                  {selectedEngineer.engineer_email} • Skills: {selectedEngineer.skill_tags?.join(', ') || 'None listed'}
                </p>
              )}
            </div>
          ) : (
            /* New Engineer Creation */
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-poppy-primary mb-3">Create New Engineer</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="engineer_name" className="block text-sm font-medium text-poppy-primary mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="engineer_name"
                    name="engineer_name"
                    value={newEngineerData.engineer_name}
                    onChange={handleNewEngineerChange}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                    placeholder="John Doe"
                    required={isCreatingNew}
                  />
                </div>
                
                <div>
                  <label htmlFor="engineer_email" className="block text-sm font-medium text-poppy-primary mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="engineer_email"
                    name="engineer_email"
                    value={newEngineerData.engineer_email}
                    onChange={handleNewEngineerChange}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                    placeholder="john.doe@company.com"
                    required={isCreatingNew}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-poppy-primary mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newEngineerData.title}
                  onChange={handleNewEngineerChange}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                  placeholder="Senior Software Engineer"
                />
              </div>

              <div>
                <label htmlFor="skill_tags_input" className="block text-sm font-medium text-poppy-primary mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  id="skill_tags_input"
                  value={newEngineerData.skill_tags.join(', ')}
                  onChange={(e) => handleSkillTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                  placeholder="React, TypeScript, Node.js"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new_capacity" className="block text-sm font-medium text-poppy-primary mb-1">
                    Capacity (hrs/week)
                  </label>
                  <input
                    type="number"
                    id="new_capacity"
                    name="capacity_hours_per_week"
                    value={newEngineerData.capacity_hours_per_week}
                    onChange={handleNewEngineerChange}
                    min="1"
                    max="80"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="new_utilization" className="block text-sm font-medium text-poppy-primary mb-1">
                    Utilization Target
                  </label>
                  <input
                    type="number"
                    id="new_utilization"
                    name="utilization_target"
                    value={newEngineerData.utilization_target}
                    onChange={handleNewEngineerChange}
                    min="0.1"
                    max="1.0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-poppy-primary mb-2">
                Role *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-warm-neutral" />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                  required
                >
                  <option value="engineer">Engineer</option>
                  <option value="tech_lead">Tech Lead</option>
                  <option value="engineering_manager">Engineering Manager</option>
                  <option value="designer">Designer</option>
                </select>
              </div>
            </div>

            {/* Primary Role */}
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="is_primary_role"
                name="is_primary_role"
                checked={formData.is_primary_role}
                onChange={handleInputChange}
                className="w-4 h-4 text-poppy-primary border-border rounded focus:ring-poppy-primary/20"
              />
              <label htmlFor="is_primary_role" className="flex items-center gap-1 text-sm font-medium text-poppy-primary">
                <Star className="w-4 h-4" />
                Primary Role
              </label>
            </div>
          </div>

          {/* Slack Handle */}
          <div>
            <label htmlFor="slack_handle" className="block text-sm font-medium text-poppy-primary mb-2">
              Slack Handle
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-warm-neutral" />
              <input
                type="text"
                id="slack_handle"
                name="slack_handle"
                value={formData.slack_handle}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                placeholder="john.doe (without @)"
              />
            </div>
          </div>

          {/* Work Description */}
          <div>
            <label htmlFor="work_description" className="block text-sm font-medium text-poppy-primary mb-2">
              Work Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-warm-neutral" />
              <textarea
                id="work_description"
                name="work_description"
                value={formData.work_description}
                onChange={handleInputChange}
                rows={3}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors resize-none"
                placeholder="Brief description of their responsibilities and specialties on this team"
              />
            </div>
          </div>

          {/* Optional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="capacity_override" className="block text-sm font-medium text-poppy-primary mb-2">
                Capacity Override (hours/week)
              </label>
              <input
                type="number"
                id="capacity_override"
                name="capacity_override"
                value={formData.capacity_override}
                onChange={handleInputChange}
                min="1"
                max="80"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                placeholder="Leave empty for team default"
              />
            </div>

            <div>
              <label htmlFor="utilization_override" className="block text-sm font-medium text-poppy-primary mb-2">
                Utilization Override (0.1 - 1.0)
              </label>
              <input
                type="number"
                id="utilization_override"
                name="utilization_override"
                value={formData.utilization_override}
                onChange={handleInputChange}
                min="0.1"
                max="1.0"
                step="0.01"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
                placeholder="Leave empty for team default"
              />
            </div>
          </div>

          {/* Joining Date */}
          <div>
            <label htmlFor="joining_date" className="block text-sm font-medium text-poppy-primary mb-2">
              Joining Date
            </label>
            <input
              type="date"
              id="joining_date"
              name="joining_date"
              value={formData.joining_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-warm-neutral-light transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-colors disabled:opacity-50"
              disabled={loading || (!isCreatingNew && !formData.engineer_id) || (isCreatingNew && (!newEngineerData.engineer_name || !newEngineerData.engineer_email))}
            >
              {loading ? (isCreatingNew ? 'Creating & Adding...' : 'Adding...') : (isCreatingNew ? 'Create & Add Member' : 'Add Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}