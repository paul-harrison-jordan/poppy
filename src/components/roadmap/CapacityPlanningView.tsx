'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import EngineerManagementModal from './EngineerManagementModal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  User,
  Activity
} from 'lucide-react'

interface Engineer {
  id: number
  engineer_name: string
  engineer_email: string
  title?: string
  team?: string
  capacity_hours_per_week: number
  utilization_target: number
}

interface Assignment {
  id: number
  prd_id: number
  estimated_weeks: number
  percentage_allocation: number
  role_on_feature?: string
  prd?: {
    id: number
    title: string
    status: string
  }
}

interface EngineerCapacity {
  engineer: Engineer
  assignments: Assignment[]
  metrics: {
    totalAllocatedWeeks: number
    totalCapacityWeeks: number
    utilizationPercentage: number
    availableWeeks: number
    isOverallocated: boolean
    activeFeatures: number
  }
}

interface TeamMetrics {
  totalEngineers: number
  totalCapacityWeeks: number
  totalAllocatedWeeks: number
  totalAvailableWeeks: number
  overallocatedEngineers: number
  averageUtilization: number
  teamUtilizationPercentage: number
}

interface CapacityPlanningViewProps {
  userEmail: string
}

export default function CapacityPlanningView({ userEmail }: CapacityPlanningViewProps) {
  const [capacityData, setCapacityData] = useState<EngineerCapacity[]>([])
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('12') // weeks
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  useEffect(() => {
    fetchCapacityData()
  }, [timeframe])

  const fetchCapacityData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/engineers/capacity?weeks=${timeframe}`)
      if (response.ok) {
        const data = await response.json()
        setCapacityData(data.capacityData || [])
        setTeamMetrics(data.teamMetrics || null)
      }
    } catch (error) {
      console.error('Error fetching capacity data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return 'text-red-600 bg-red-50 border-red-200'
    if (percentage > 90) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (percentage > 70) return 'text-green-600 bg-green-50 border-green-200'
    return 'text-blue-600 bg-blue-50 border-blue-200'
  }

  const getUtilizationIcon = (percentage: number) => {
    if (percentage > 100) return <AlertTriangle className="w-4 h-4" />
    if (percentage > 90) return <TrendingUp className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  // Get unique teams for filtering
  const teams = ['all', ...new Set(capacityData.map(e => e.engineer.team).filter(Boolean))]

  // Filter engineers by selected team
  const filteredCapacityData = selectedTeam === 'all' 
    ? capacityData 
    : capacityData.filter(e => e.engineer.team === selectedTeam)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Capacity Planning</h2>
          <p className="text-gray-600">Manage engineering resource allocation and identify bottlenecks</p>
        </div>
        
        <div className="flex items-center gap-3">
          <EngineerManagementModal onEngineersChange={fetchCapacityData} />
          
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.filter(team => team !== 'all').map(team => (
                <SelectItem key={team} value={team!}>{team}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="8">8 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
              <SelectItem value="16">16 weeks</SelectItem>
              <SelectItem value="24">24 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Overview Cards */}
      {teamMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Size</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.totalEngineers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamMetrics.teamUtilizationPercentage.toFixed(1)}%
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${getUtilizationColor(teamMetrics.teamUtilizationPercentage)}`}>
                  {getUtilizationIcon(teamMetrics.teamUtilizationPercentage)}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamMetrics.totalAvailableWeeks.toFixed(1)}w
                  </p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overallocated</p>
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.overallocatedEngineers}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${teamMetrics.overallocatedEngineers > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Engineer Capacity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Individual Engineer Capacity ({timeframe} weeks)</h3>
        
        {filteredCapacityData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCapacityData.map((engineerCapacity) => {
              const { engineer, assignments, metrics } = engineerCapacity
              
              return (
                <Card key={engineer.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-600" />
                          {engineer.engineer_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
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
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getUtilizationColor(metrics.utilizationPercentage)}`}>
                        {metrics.utilizationPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Capacity Overview */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Allocated</p>
                        <p className="font-semibold">{metrics.totalAllocatedWeeks.toFixed(1)}w</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Capacity</p>
                        <p className="font-semibold">{metrics.totalCapacityWeeks.toFixed(1)}w</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available</p>
                        <p className={`font-semibold ${metrics.availableWeeks < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {metrics.availableWeeks.toFixed(1)}w
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Utilization</span>
                        <span>{metrics.utilizationPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            metrics.utilizationPercentage > 100 
                              ? 'bg-red-500' 
                              : metrics.utilizationPercentage > 90 
                                ? 'bg-orange-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(metrics.utilizationPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Active Assignments */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">
                          Active Features ({assignments.length})
                        </span>
                      </div>
                      
                      {assignments.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {assignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium truncate">
                                  {assignment.prd?.title || `Feature #${assignment.prd_id}`}
                                </p>
                                {assignment.role_on_feature && (
                                  <p className="text-xs text-gray-600">{assignment.role_on_feature}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{assignment.estimated_weeks}w</p>
                                <p className="text-xs text-gray-600">{assignment.percentage_allocation}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No active assignments</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Engineers Found</h3>
            <p className="text-gray-600">Add engineers to your team to start tracking capacity.</p>
          </div>
        )}
      </div>
    </div>
  )
}