'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Users, 
  Plus, 
  Clock, 
  X, 
  User,
  Percent,
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
}

interface Assignment {
  id: number
  engineer_id: number
  estimated_weeks: number
  percentage_allocation: number
  start_date?: string
  end_date?: string
  role_on_feature?: string
  assignment_notes?: string
  assignment_status: string
  engineer?: Engineer
}

interface EngineerAssignmentModalProps {
  prdId: number
  prdTitle: string
  existingAssignments?: Assignment[]
  onAssignmentsChange?: () => void
  trigger?: React.ReactNode
}

export default function EngineerAssignmentModal({ 
  prdId, 
  prdTitle, 
  existingAssignments = [],
  onAssignmentsChange,
  trigger 
}: EngineerAssignmentModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>(existingAssignments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New assignment form state
  const [newAssignment, setNewAssignment] = useState({
    engineer_id: '',
    estimated_weeks: '',
    percentage_allocation: '100',
    role_on_feature: '',
    assignment_notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchEngineers()
      fetchAssignments()
    }
  }, [isOpen, prdId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/engineers/assignments?prd_id=${prdId}`)
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const handleAddAssignment = async () => {
    if (!newAssignment.engineer_id || !newAssignment.estimated_weeks) {
      setError('Please select an engineer and enter estimated weeks')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/engineers/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prd_id: prdId,
          engineer_id: parseInt(newAssignment.engineer_id),
          estimated_weeks: parseFloat(newAssignment.estimated_weeks),
          percentage_allocation: parseInt(newAssignment.percentage_allocation),
          role_on_feature: newAssignment.role_on_feature || null,
          assignment_notes: newAssignment.assignment_notes || null
        })
      })

      if (response.ok) {
        await fetchAssignments()
        setNewAssignment({
          engineer_id: '',
          estimated_weeks: '',
          percentage_allocation: '100',
          role_on_feature: '',
          assignment_notes: ''
        })
        onAssignmentsChange?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add assignment')
      }
    } catch {
      setError('Failed to add assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: number) => {
    try {
      const response = await fetch(`/api/engineers/assignments/${assignmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAssignments()
        onAssignmentsChange?.()
      } else {
        setError('Failed to remove assignment')
      }
    } catch {
      setError('Failed to remove assignment')
    }
  }

  const totalEstimatedWeeks = assignments.reduce((sum, a) => sum + (a.estimated_weeks || 0), 0)
  const assignedEngineers = assignments.filter(a => a.assignment_status !== 'cancelled')

  const defaultTrigger = (
    <div className="flex items-center gap-2 cursor-pointer hover:text-poppy transition-colors">
      <Users className="w-4 h-4" />
      <span className="text-sm">
        {assignedEngineers.length > 0 
          ? `${assignedEngineers.length} engineer${assignedEngineers.length !== 1 ? 's' : ''}`
          : 'Assign engineers'
        }
      </span>
      {totalEstimatedWeeks > 0 && (
        <Badge variant="outline" className="text-xs">
          {totalEstimatedWeeks}w total
        </Badge>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Engineer Assignments - {prdTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Current Assignments */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Assignments</h3>
            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-semibold">{assignment.engineer?.engineer_name}</span>
                            </div>
                            {assignment.engineer?.title && (
                              <Badge variant="outline" className="text-xs">
                                {assignment.engineer.title}
                              </Badge>
                            )}
                            {assignment.engineer?.team && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                {assignment.engineer.team}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span>{assignment.estimated_weeks} weeks</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Percent className="w-3 h-3" />
                              <span>{assignment.percentage_allocation}% allocation</span>
                            </div>
                            {assignment.role_on_feature && (
                              <div className="col-span-2">
                                <span className="font-medium">Role:</span> {assignment.role_on_feature}
                              </div>
                            )}
                            {assignment.assignment_notes && (
                              <div className="col-span-2">
                                <span className="font-medium">Notes:</span> {assignment.assignment_notes}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <strong>Total:</strong> {assignedEngineers.length} engineer{assignedEngineers.length !== 1 ? 's' : ''}, {totalEstimatedWeeks} weeks combined
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No engineers assigned yet</p>
              </div>
            )}
          </div>

          {/* Add New Assignment */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Add Assignment</h3>
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Engineer</label>
                    <Select 
                      value={newAssignment.engineer_id} 
                      onValueChange={(value) => setNewAssignment(prev => ({ ...prev, engineer_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select engineer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {engineers
                          .filter(engineer => !assignments.some(a => a.engineer_id === engineer.id && a.assignment_status !== 'cancelled'))
                          .map((engineer) => (
                            <SelectItem key={engineer.id} value={engineer.id.toString()}>
                              <div className="flex items-center gap-2">
                                <span>{engineer.engineer_name}</span>
                                {engineer.title && (
                                  <span className="text-xs text-gray-500">({engineer.title})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Weeks</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newAssignment.estimated_weeks}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, estimated_weeks: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                      placeholder="e.g., 2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Allocation %</label>
                    <Select 
                      value={newAssignment.percentage_allocation} 
                      onValueChange={(value) => setNewAssignment(prev => ({ ...prev, percentage_allocation: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25% (Part time)</SelectItem>
                        <SelectItem value="50">50% (Half time)</SelectItem>
                        <SelectItem value="75">75% (Mostly dedicated)</SelectItem>
                        <SelectItem value="100">100% (Full time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Role on Feature</label>
                    <input
                      type="text"
                      value={newAssignment.role_on_feature}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, role_on_feature: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                      placeholder="e.g., Lead Developer, Backend Support"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={newAssignment.assignment_notes}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, assignment_notes: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-poppy focus:border-poppy"
                    rows={2}
                    placeholder="Any specific notes about this assignment..."
                  />
                </div>

                <button
                  onClick={handleAddAssignment}
                  disabled={loading || !newAssignment.engineer_id || !newAssignment.estimated_weeks}
                  className="w-full px-4 py-2 bg-poppy text-white rounded-lg hover:bg-poppy/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Adding...' : 'Add Assignment'}
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}