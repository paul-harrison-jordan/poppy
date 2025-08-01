'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import CreateTeamModal from '@/components/CreateTeamModal'
import AddTeamMemberModal from '@/components/AddTeamMemberModal'
import TeamDetailsModal from '@/components/TeamDetailsModal'
import TeamSettingsModal from '@/components/TeamSettingsModal'
import { 
  Users,
  Plus,
  Settings,
  UserPlus,
  Badge,
  Star,
  Clock,
  Target,
  Mail,
  Hash
} from 'lucide-react'

interface Engineer {
  id: number
  engineer_name: string
  engineer_email: string
  title: string
  skill_tags: string[]
  capacity_hours_per_week?: number
  utilization_target?: number
  notes?: string
}

interface TeamMember {
  id: number
  role: string
  is_primary_role: boolean
  joining_date: string
  capacity_override: number | null
  utilization_override: number | null
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

export default function TeamsPage() {
  const { data: session, status } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)

  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.email) {
      fetchTeams()
    }
  }, [session?.user?.email, fetchTeams])
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-primary animate-pulse font-sans">Loading...</div>
      </div>
    )
  }
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

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

  const handleAddMember = (teamId: number) => {
    setSelectedTeamId(teamId)
    setShowAddMemberModal(true)
  }

  const handleViewDetails = (teamId: number) => {
    setSelectedTeamId(teamId)
    setShowDetailsModal(true)
  }

  const handleTeamSettings = (teamId: number) => {
    setSelectedTeamId(teamId)
    setShowSettingsModal(true)
  }

  const closeAllModals = () => {
    setShowAddMemberModal(false)
    setShowDetailsModal(false)
    setShowSettingsModal(false)
    setSelectedTeamId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-primary animate-pulse font-sans">Loading teams...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-space-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-space-6">
        <div>
          <h1 className="text-3xl font-bold text-poppy-primary">Team Management</h1>
          <p className="text-warm-neutral mt-1">Organize and optimize your engineering teams</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-smooth"
        >
          <Plus className="w-4 h-4" />
          New Team
        </button>
      </div>

      {teams.length === 0 ? (
        // Empty state
        <div className="text-center py-space-12 bg-card rounded-xl border border-border elevation-sm">
          <Users className="w-16 h-16 text-warm-neutral mx-auto mb-space-4 opacity-60" />
          <h3 className="text-xl font-semibold text-poppy-primary mb-space-2">No teams configured</h3>
          <p className="text-warm-neutral mb-space-6 max-w-md mx-auto">
            Build your first team to organize engineers, track capacity, and optimize assignment workflows.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-space-6 py-space-3 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-smooth elevation-sm"
          >
            <Plus className="w-4 h-4" />
            Create Your First Team
          </button>
        </div>
      ) : (
        // Team dashboard cards
        <div className="space-y-space-6">
          {teams.map((team) => {
            const totalCapacity = team.team_members?.reduce((sum, member) => {
              return sum + (member.capacity_override || member.engineer.capacity_hours_per_week || team.default_capacity_hours_per_week)
            }, 0) || 0

            const avgUtilization = team.team_members?.length > 0 
              ? team.team_members.reduce((sum, member) => {
                  return sum + (member.utilization_override || member.engineer.utilization_target || team.default_utilization_target)
                }, 0) / team.team_members.length
              : team.default_utilization_target

            return (
              <div key={team.id} className="bg-card rounded-xl border border-border p-space-8 hover:border-poppy-primary/20 transition-smooth elevation-sm hover:elevation-md">
                {/* Team Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-poppy-primary">{team.team_name}</h2>
                      <span className="px-3 py-1 bg-poppy-primary/10 text-poppy-primary text-sm rounded-full font-medium">
                        {team.team_members?.length || 0} members
                      </span>
                    </div>
                    {team.team_description && (
                      <p className="text-warm-neutral mb-4">{team.team_description}</p>
                    )}
                    
                    {/* Team Metrics */}
                    <div className="grid grid-cols-3 gap-space-6 mb-space-6">
                      <div className="bg-lavender-secondary-light rounded-lg p-space-4 text-center border border-lavender-secondary/20">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-lavender-secondary" />
                          <span className="text-sm font-medium text-lavender-secondary">Total Capacity</span>
                        </div>
                        <p className="text-2xl font-bold text-lavender-secondary">{totalCapacity}h</p>
                        <p className="text-xs text-warm-neutral">per week</p>
                      </div>
                      
                      <div className="bg-sprout-success-light rounded-lg p-space-4 text-center border border-sprout-success/20">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Target className="w-5 h-5 text-sprout-success" />
                          <span className="text-sm font-medium text-sprout-success">Utilization</span>
                        </div>
                        <p className="text-2xl font-bold text-sprout-success">{Math.round(avgUtilization * 100)}%</p>
                        <p className="text-xs text-warm-neutral">average target</p>
                      </div>
                      
                      <div className="bg-poppy-primary-light rounded-lg p-space-4 text-center border border-poppy-primary/20">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Badge className="w-5 h-5 text-poppy-primary" />
                          <span className="text-sm font-medium text-poppy-primary">Effective Hours</span>
                        </div>
                        <p className="text-2xl font-bold text-poppy-primary">{Math.round(totalCapacity * avgUtilization)}h</p>
                        <p className="text-xs text-warm-neutral">per week</p>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleTeamSettings(team.id)}
                    className="p-space-3 hover:bg-warm-neutral-light rounded-lg transition-smooth"
                    title="Team Settings"
                  >
                    <Settings className="w-5 h-5 text-warm-neutral hover:text-poppy-primary" />
                  </button>
                </div>

                {/* Team Members Grid */}
                {team.team_members && team.team_members.length > 0 ? (
                  <div className="mb-space-6">
                    <h3 className="text-lg font-semibold text-poppy-primary mb-space-4">Team Members</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-4">
                      {team.team_members.map((member) => {
                        const slackHandle = member.engineer.notes?.match(/Slack:\s*@?([^\n\r]+)/i)?.[1]?.trim()
                        const workDescription = member.engineer.notes?.match(/Work Description:\s*([^\n\r]+)/i)?.[1]?.trim()
                        
                        return (
                          <div key={member.id} className="border border-border rounded-lg p-space-4 hover:border-poppy-primary/30 transition-smooth bg-card elevation-sm hover:elevation-md">
                            {/* Member Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-poppy-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-poppy-primary">
                                  {member.engineer.engineer_name.charAt(0)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-poppy-primary truncate">
                                    {member.engineer.engineer_name}
                                  </h4>
                                  {member.is_primary_role && (
                                    <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-warm-neutral truncate">{member.engineer.title || 'No title'}</p>
                              </div>
                            </div>

                            {/* Role Badge */}
                            <div className="mb-3">
                              <span className={`px-3 py-1 text-xs rounded-full border ${getRoleColor(member.role)}`}>
                                {formatRole(member.role)}
                              </span>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-1 mb-3 text-xs">
                              <div className="flex items-center gap-2 text-warm-neutral">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{member.engineer.engineer_email}</span>
                              </div>
                              {slackHandle && (
                                <div className="flex items-center gap-2 text-warm-neutral">
                                  <Hash className="w-3 h-3" />
                                  <span>@{slackHandle}</span>
                                </div>
                              )}
                            </div>

                            {/* Work Description */}
                            {workDescription && (
                              <div className="mb-3">
                                <p className="text-xs text-warm-neutral bg-warm-neutral-light p-2 rounded line-clamp-2">
                                  {workDescription}
                                </p>
                              </div>
                            )}

                            {/* Skills */}
                            {member.engineer.skill_tags && member.engineer.skill_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {member.engineer.skill_tags.slice(0, 3).map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 text-xs bg-lavender-secondary-light text-lavender-secondary rounded border border-lavender-secondary/20"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {member.engineer.skill_tags.length > 3 && (
                                  <span className="px-2 py-1 text-xs bg-warm-neutral-light text-warm-neutral rounded border border-warm-neutral/20">
                                    +{member.engineer.skill_tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Capacity Info */}
                            <div className="flex justify-between text-xs text-warm-neutral">
                              <span>{member.capacity_override || member.engineer.capacity_hours_per_week || team.default_capacity_hours_per_week}h/week</span>
                              <span>{Math.round((member.utilization_override || member.engineer.utilization_target || team.default_utilization_target) * 100)}% target</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-space-8 mb-space-6 bg-warm-neutral-light rounded-lg border border-warm-neutral/10">
                    <Users className="w-12 h-12 mx-auto mb-space-3 text-warm-neutral opacity-60" />
                    <p className="text-warm-neutral mb-2">No team members assigned</p>
                    <p className="text-sm text-warm-neutral/70">Add engineers to build your team capacity</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-space-3">
                  <button 
                    onClick={() => handleAddMember(team.id)}
                    className="flex items-center gap-2 px-space-6 py-space-3 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover transition-smooth elevation-sm"
                  >
                    <UserPlus className="w-5 h-5" />
                    Add Member
                  </button>
                  <button 
                    onClick={() => handleViewDetails(team.id)}
                    className="flex items-center gap-2 px-space-6 py-space-3 border border-poppy-primary/20 text-poppy-primary rounded-lg font-medium hover:bg-poppy-primary/5 transition-smooth"
                  >
                    <Users className="w-5 h-5" />
                    Full Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTeamCreated={fetchTeams}
      />
      
      {selectedTeamId && (
        <>
          <AddTeamMemberModal
            isOpen={showAddMemberModal}
            onClose={closeAllModals}
            onMemberAdded={() => {
              fetchTeams()
              closeAllModals()
            }}
            teamId={selectedTeamId}
          />
          
          <TeamDetailsModal
            isOpen={showDetailsModal}
            onClose={closeAllModals}
            onTeamUpdated={fetchTeams}
            teamId={selectedTeamId}
          />
          
          <TeamSettingsModal
            isOpen={showSettingsModal}
            onClose={closeAllModals}
            onTeamUpdated={() => {
              fetchTeams()
              closeAllModals()
            }}
            teamId={selectedTeamId}
          />
        </>
      )}
    </div>
  )
}