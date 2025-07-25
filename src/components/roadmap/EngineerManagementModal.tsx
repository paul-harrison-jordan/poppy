'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Settings, 
  Plus, 
  User, 
  X,
  Edit,
  UserPlus,
  AlertCircle
} from 'lucide-react'

interface Engineer {
  id: number
  engineer_name: string
  engineer_email: string
  title?: string
  team?: string
  skill_tags?: string[]
  capacity_hours_per_week: number
  utilization_target: number
  is_active: boolean
  notes?: string
}

interface EngineerManagementModalProps {
  onEngineersChange?: () => void
  trigger?: React.ReactNode
}

export default function EngineerManagementModal({ 
  onEngineersChange,
  trigger 
}: EngineerManagementModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state for new/editing engineer
  const [formData, setFormData] = useState({
    engineer_name: '',
    engineer_email: '',
    title: '',
    team: '',
    skill_tags: '',
    capacity_hours_per_week: '40',
    utilization_target: '0.80',
    notes: ''
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

  const resetForm = () => {
    setFormData({
      engineer_name: '',
      engineer_email: '',
      title: '',
      team: '',
      skill_tags: '',
      capacity_hours_per_week: '40',
      utilization_target: '0.80',
      notes: ''
    })
    setEditingId(null)
    setError(null)
  }

  const handleEdit = (engineer: Engineer) => {
    setFormData({
      engineer_name: engineer.engineer_name,
      engineer_email: engineer.engineer_email,
      title: engineer.title || '',
      team: engineer.team || '',
      skill_tags: engineer.skill_tags?.join(', ') || '',
      capacity_hours_per_week: engineer.capacity_hours_per_week.toString(),
      utilization_target: engineer.utilization_target.toString(),
      notes: engineer.notes || ''
    })
    setEditingId(engineer.id)
  }

  const handleSubmit = async () => {
    if (!formData.engineer_name || !formData.engineer_email) {
      setError('Name and email are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        engineer_name: formData.engineer_name,
        engineer_email: formData.engineer_email,
        title: formData.title || null,
        team: formData.team || null,
        skill_tags: formData.skill_tags ? formData.skill_tags.split(',').map(s => s.trim()) : [],
        capacity_hours_per_week: parseInt(formData.capacity_hours_per_week),
        utilization_target: parseFloat(formData.utilization_target),
        notes: formData.notes || null
      }

      const url = editingId ? `/api/engineers/${editingId}` : '/api/engineers'
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await fetchEngineers()
        resetForm()
        onEngineersChange?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save engineer')
      }
    } catch (error) {
      setError('Failed to save engineer')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (engineerId: number) => {
    try {
      const response = await fetch(`/api/engineers/${engineerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchEngineers()
        onEngineersChange?.()
      }
    } catch (error) {
      console.error('Error deactivating engineer:', error)
    }
  }

  const defaultTrigger = (
    <button className="flex items-center gap-2 px-4 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 transition-colors">
      <Settings className="w-4 h-4" />
      Manage Engineers
    </button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Engineer Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Add/Edit Engineer Form */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5" />
                {editingId ? 'Edit Engineer' : 'Add New Engineer'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.engineer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, engineer_name: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.engineer_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, engineer_email: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                    placeholder="Senior Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Team</label>
                  <input
                    type="text"
                    value={formData.team}
                    onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                    placeholder="Frontend, Backend, Full Stack"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Hours per Week</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={formData.capacity_hours_per_week}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity_hours_per_week: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Utilization Target</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1.0"
                    value={formData.utilization_target}
                    onChange={(e) => setFormData(prev => ({ ...prev, utilization_target: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                  />
                  <p className="text-xs text-gray-600 mt-1">0.8 = 80% target utilization</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skill_tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, skill_tags: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                  placeholder="React, Python, AWS, Database Design"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                  rows={2}
                  placeholder="Additional notes about this engineer..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Saving...' : (editingId ? 'Update Engineer' : 'Add Engineer')}
                </button>
                
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Engineers */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Engineers</h3>
            {engineers.length > 0 ? (
              <div className="space-y-3">
                {engineers.map((engineer) => (
                  <Card key={engineer.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-semibold">{engineer.engineer_name}</span>
                            </div>
                            {engineer.title && (
                              <Badge variant="outline" className="text-xs">
                                {engineer.title}
                              </Badge>
                            )}
                            {engineer.team && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                {engineer.team}
                              </Badge>
                            )}
                            {!engineer.is_active && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Email:</span> {engineer.engineer_email}
                            </div>
                            <div>
                              <span className="font-medium">Capacity:</span> {engineer.capacity_hours_per_week}h/week ({(engineer.utilization_target * 100).toFixed(0)}% target)
                            </div>
                            {engineer.skill_tags && engineer.skill_tags.length > 0 && (
                              <div className="col-span-2">
                                <span className="font-medium">Skills:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {engineer.skill_tags.map((skill, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {engineer.notes && (
                              <div className="col-span-2">
                                <span className="font-medium">Notes:</span> {engineer.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(engineer)}
                            className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {engineer.is_active && (
                            <button
                              onClick={() => handleDeactivate(engineer.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No engineers added yet</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}