'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Users, Clock, Target, Mail, Hash, Calendar, Trash2, Star } from 'lucide-react'

interface Engineer {
  id: number
  engineer_name: string
  engineer_email: string
  title: string
  skill_tags: string[]
  notes: string
  capacity_hours_per_week: number
  utilization_target: number
}

interface TeamMember {
  id: number
  role: string
  is_primary_role: boolean
  joining_date: string
  capacity_override: number | null
  utilization_override: number | null
  created_at: string
  engineer: Engineer
}

interface Team {
  id: number
  team_name: string
  team_description: string
  default_capacity_hours_per_week: number
  default_utilization_target: number
  created_at: string
  team_members: TeamMember[]
}

interface TeamDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: number
  onTeamUpdated: () => void
}

export default function TeamDetailsModal({ isOpen, onClose, teamId, onTeamUpdated }: TeamDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)

  const fetchTeamDetails = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/teams/${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setTeam(data)
      } else {
        console.error('Failed to fetch team details')
      }
    } catch (error) {
      console.error('Error fetching team details:', error)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeamDetails()
    }
  }, [isOpen, teamId, fetchTeamDetails])

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTeamDetails() // Refresh data
        onTeamUpdated() // Refresh parent component
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove team member')
      }
    } catch (error) {
      console.error('Error removing team member:', error)
      alert('Failed to remove team member')
    }
  }

  if (!isOpen) return null

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'engineering_manager':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'designer':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'tech_lead':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'engineer':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getSlackHandle = (notes: string) => {
    const slackMatch = notes?.match(/Slack:\s*@?([^\n\r]+)/i)
    return slackMatch ? slackMatch[1].trim() : null
  }

  const getWorkDescription = (notes: string) => {
    const descMatch = notes?.match(/Work Description:\s*([^\n\r]+)/i)
    return descMatch ? descMatch[1].trim() : null
  }

  const calculateTeamCapacity = () => {
    if (!team?.team_members) return { totalHours: 0, totalUtilization: 0 }
    
    const totalHours = team.team_members.reduce((sum, member) => {
      const capacity = member.capacity_override || member.engineer.capacity_hours_per_week || team.default_capacity_hours_per_week
      return sum + capacity
    }, 0)

    const avgUtilization = team.team_members.reduce((sum, member) => {
      const utilization = member.utilization_override || member.engineer.utilization_target || team.default_utilization_target
      return sum + utilization
    }, 0) / team.team_members.length

    return { totalHours, totalUtilization: avgUtilization }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy-primary mx-auto mb-4"></div>
            <p className="text-warm-neutral">Loading team details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <p className="text-red-600">Failed to load team details</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-poppy-primary text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const { totalHours, totalUtilization } = calculateTeamCapacity()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-poppy-primary" />
            <div>
              <h2 className="text-xl font-semibold text-poppy-primary">{team.team_name}</h2>
              {team.team_description && (
                <p className="text-sm text-warm-neutral">{team.team_description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-neutral-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-neutral" />
          </button>
        </div>

        <div className="p-6">
          {/* Team Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-poppy-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-poppy-primary" />
                <span className="text-sm font-medium text-poppy-primary">Members</span>
              </div>
              <p className="text-2xl font-bold text-poppy-primary">{team.team_members.length}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Total Capacity</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{totalHours}h/week</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Avg Utilization</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{Math.round(totalUtilization * 100)}%</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Created</span>
              </div>
              <p className="text-sm font-bold text-purple-600">
                {new Date(team.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Team Members List */}
          <div>
            <h3 className="text-lg font-semibold text-poppy-primary mb-4">Team Members</h3>
            
            {team.team_members.length === 0 ? (
              <div className="text-center py-8 text-warm-neutral">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No team members yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {team.team_members.map((member) => {
                  const slackHandle = getSlackHandle(member.engineer.notes)
                  const workDescription = getWorkDescription(member.engineer.notes)
                  
                  return (
                    <div key={member.id} className="border border-border rounded-lg p-4 hover:border-poppy-primary/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Member Header */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-poppy-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-poppy-primary">
                                {member.engineer.engineer_name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-poppy-primary">
                                  {member.engineer.engineer_name}
                                </h4>
                                {member.is_primary_role && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                )}
                                <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(member.role)}`}>
                                  {formatRole(member.role)}
                                </span>
                              </div>
                              <p className="text-sm text-warm-neutral">{member.engineer.title}</p>
                            </div>
                          </div>

                          {/* Contact & Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-warm-neutral" />
                                <span>{member.engineer.engineer_email}</span>
                              </div>
                              {slackHandle && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Hash className="w-4 h-4 text-warm-neutral" />
                                  <span>@{slackHandle}</span>
                                </div>
                              )}
                              {member.joining_date && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-warm-neutral" />
                                  <span>Joined {new Date(member.joining_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-warm-neutral" />
                                <span>
                                  {member.capacity_override || member.engineer.capacity_hours_per_week || team.default_capacity_hours_per_week}h/week
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Target className="w-4 h-4 text-warm-neutral" />
                                <span>
                                  {Math.round((member.utilization_override || member.engineer.utilization_target || team.default_utilization_target) * 100)}% utilization
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Work Description */}
                          {workDescription && (
                            <div className="mb-3">
                              <p className="text-sm text-warm-neutral bg-warm-neutral-light p-2 rounded">
                                <span className="font-medium">Work:</span> {workDescription}
                              </p>
                            </div>
                          )}

                          {/* Skills */}
                          {member.engineer.skill_tags && member.engineer.skill_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {member.engineer.skill_tags.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRemoveMember(member.id, member.engineer.engineer_name)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Remove from team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}