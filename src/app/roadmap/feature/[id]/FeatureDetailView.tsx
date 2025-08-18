'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Palette, 
  Layers, 
  ExternalLink,
  ArrowLeft,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface Phase {
  id: number
  name: string
  description: string
  customer_value?: string
  is_complete?: boolean
  priority: number
}

interface Feature {
  id: number
  title?: string
  description?: string
  'drive-link': string
  'v0-link': string
  user: string
  shipped: boolean
  created_at?: string
  roadmap?: {
    priority_order?: number
    status?: string
    target_quarter?: string
    estimated_effort_points?: number
    business_value_score?: number
    technical_complexity_score?: number
    dependencies?: string[]
    risks?: string[]
    success_metrics?: string[]
    roadmap_notes?: string
    release_date?: string
    estimated_weeks?: number
    assigned_engineer?: string
  }
}

interface FeatureDetailViewProps {
  feature: Feature
}

export default function FeatureDetailView({ feature: initialFeature }: FeatureDetailViewProps) {
  const [feature, setFeature] = useState(initialFeature)
  const [activeTab, setActiveTab] = useState('prd')
  const [phases, setPhases] = useState<Phase[]>([])
  const [loadingPhases, setLoadingPhases] = useState(false)
  const [decomposing, setDecomposing] = useState(false)
  const [editingPhase, setEditingPhase] = useState<number | null>(null)
  const [phaseValues, setPhaseValues] = useState<{ [key: number]: Phase }>({})
  const [engineers, setEngineers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [editingRoadmap, setEditingRoadmap] = useState(false)
  const [roadmapValues, setRoadmapValues] = useState({
    release_date: feature.roadmap?.release_date || '',
    estimated_weeks: feature.roadmap?.estimated_weeks || 0,
    assigned_engineer: feature.roadmap?.assigned_engineer || 'unassigned'
  })

  // Calculate overall progress
  const calculateOverallProgress = () => {
    let completedSteps = 0
    const totalSteps = 3 // PRD, Design, Decomposition
    
    if (feature['drive-link']) completedSteps++
    if (feature['v0-link']) completedSteps++
    if (phases.length > 0) completedSteps++ // Mark as complete when phases are generated
    
    return Math.round((completedSteps / totalSteps) * 100)
  }

  // Calculate status based on engineer assignment and dates
  const calculateStatus = () => {
    if (!feature.roadmap?.assigned_engineer || feature.roadmap?.assigned_engineer === 'unassigned') return 'Planning'
    if (!feature.roadmap?.release_date || !feature.roadmap?.estimated_weeks) return 'Ready'
    
    const releaseDate = new Date(feature.roadmap.release_date)
    const startDate = new Date(releaseDate)
    startDate.setDate(startDate.getDate() - (feature.roadmap.estimated_weeks * 7))
    
    const today = new Date()
    if (today >= startDate) return 'In Progress'
    return 'Ready'
  }

  // Fetch existing phases
  useEffect(() => {
    const fetchPhases = async () => {
      setLoadingPhases(true)
      try {
        const response = await fetch(`/api/roadmap/prd/${feature.id}/phases`)
        if (response.ok) {
          const data = await response.json()
          setPhases(data.phases || [])
        }
      } catch (error) {
        console.error('Error fetching phases:', error)
      } finally {
        setLoadingPhases(false)
      }
    }

    fetchPhases()
  }, [feature.id])

  // Fetch available engineers
  useEffect(() => {
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

    fetchEngineers()
  }, [])

  const handleDecompose = async () => {
    if (!feature['drive-link']) {
      alert('Please add a Google Doc link first to decompose the PRD')
      return
    }

    setDecomposing(true)
    try {
      // First get the Google Doc content
      const docResponse = await fetch('/api/get-google-doc-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveLink: feature['drive-link'] })
      })

      if (!docResponse.ok) {
        throw new Error('Failed to fetch Google Doc content')
      }

      const { content } = await docResponse.json()

      // Then decompose it
      const decomposeResponse = await fetch('/api/decompose-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (!decomposeResponse.ok) {
        throw new Error('Failed to decompose PRD')
      }

      const reader = decomposeResponse.body?.getReader()
      let result = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          result += new TextDecoder().decode(value)
        }
      }

      // Parse the JSON response and save phases
      const parsedPhases = JSON.parse(result)
      
      // Save phases to database
      const saveResponse = await fetch(`/api/roadmap/prd/${feature.id}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phases: parsedPhases })
      })

      if (saveResponse.ok) {
        setPhases(parsedPhases)
        setActiveTab('decomposition')
      }
    } catch (error) {
      console.error('Error decomposing PRD:', error)
      alert('Failed to decompose PRD. Please try again.')
    } finally {
      setDecomposing(false)
    }
  }

  const togglePhaseComplete = async (phaseId: number, isComplete: boolean) => {
    try {
      await fetch(`/api/roadmap/prd/${feature.id}/phases/${phaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: isComplete })
      })

      setPhases(phases.map(phase => 
        phase.id === phaseId ? { ...phase, is_complete: isComplete } : phase
      ))
    } catch (error) {
      console.error('Error updating phase:', error)
    }
  }

  const handleSaveNewPhase = async () => {
    const newPhase = phaseValues[-1]
    if (!newPhase?.name || !newPhase?.description) {
      alert('Please provide both name and description for the phase')
      return
    }

    try {
      const response = await fetch(`/api/roadmap/prd/${feature.id}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phases: [{
            name: newPhase.name,
            description: newPhase.description,
            customer_value: newPhase.customer_value || '',
            priority: phases.length + 1,
            user_email: feature.user
          }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPhases([...phases, ...data.phases])
        setEditingPhase(null)
        setPhaseValues({})
      }
    } catch (error) {
      console.error('Error adding phase:', error)
    }
  }

  const handleUpdatePhase = async (phaseId: number) => {
    const updatedPhase = phaseValues[phaseId]
    if (!updatedPhase) return

    try {
      const response = await fetch(`/api/roadmap/prd/${feature.id}/phases/${phaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedPhase.name,
          description: updatedPhase.description,
          customer_value: updatedPhase.customer_value
        })
      })

      if (response.ok) {
        setPhases(phases.map(phase => 
          phase.id === phaseId ? updatedPhase : phase
        ))
        setEditingPhase(null)
        setPhaseValues({})
      }
    } catch (error) {
      console.error('Error updating phase:', error)
    }
  }

  const handleDeletePhase = async (phaseId: number) => {
    if (!confirm('Are you sure you want to delete this phase?')) return

    try {
      const response = await fetch(`/api/roadmap/prd/${feature.id}/phases/${phaseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPhases(phases.filter(phase => phase.id !== phaseId))
      }
    } catch (error) {
      console.error('Error deleting phase:', error)
    }
  }

  const handleSaveRoadmapDetails = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmap: {
            ...feature.roadmap,
            ...roadmapValues,
            assigned_engineer: roadmapValues.assigned_engineer === 'unassigned' ? null : roadmapValues.assigned_engineer,
            status: calculateStatus()
          }
        })
      })

      if (response.ok) {
        const updatedFeature = await response.json()
        setFeature(updatedFeature)
        setEditingRoadmap(false)
      }
    } catch (error) {
      console.error('Error updating roadmap details:', error)
    }
  }

  const handleUpdateV0Link = async (v0Link: string) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'v0-link': v0Link })
      })

      if (response.ok) {
        const updatedFeature = await response.json()
        setFeature(updatedFeature)
      }
    } catch (error) {
      console.error('Error updating V0 link:', error)
      alert('Failed to update V0 link')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-poppy-primary-light/5 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header as Command Center */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Link href="/roadmap">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Roadmap
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-poppy-primary mb-2">
                  {feature.title || `Feature #${feature.id}`}
                </h1>
                {feature.description && (
                  <p className="text-warm-neutral text-lg">{feature.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={feature.shipped ? "default" : "secondary"}
                className={feature.shipped ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
              >
                {feature.shipped ? "Shipped" : "In Progress"}
              </Badge>
              <Button variant="outline">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Request Sign-off
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Feature Details</h3>
            {editingRoadmap ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingRoadmap(false)
                    setRoadmapValues({
                      release_date: feature.roadmap?.release_date || '',
                      estimated_weeks: feature.roadmap?.estimated_weeks || 0,
                      assigned_engineer: feature.roadmap?.assigned_engineer || 'unassigned'
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRoadmapDetails}
                >
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingRoadmap(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-warm-neutral" />
                <span className="text-sm text-warm-neutral">Owner</span>
              </div>
              <p className="font-semibold text-gray-900">{feature.user?.split('@')[0] || 'Unknown'}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-warm-neutral" />
                <span className="text-sm text-warm-neutral">Release Date</span>
              </div>
              {editingRoadmap ? (
                <Input
                  type="date"
                  value={roadmapValues.release_date}
                  onChange={(e) => setRoadmapValues({ ...roadmapValues, release_date: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-semibold text-gray-900">
                  {feature.roadmap?.release_date 
                    ? new Date(feature.roadmap.release_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-warm-neutral" />
                <span className="text-sm text-warm-neutral">Estimated Weeks</span>
              </div>
              {editingRoadmap ? (
                <Input
                  type="number"
                  value={roadmapValues.estimated_weeks}
                  onChange={(e) => setRoadmapValues({ ...roadmapValues, estimated_weeks: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                  min="1"
                  max="52"
                />
              ) : (
                <p className="font-semibold text-gray-900">
                  {feature.roadmap?.estimated_weeks || 0} weeks
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-warm-neutral" />
                <span className="text-sm text-warm-neutral">Assigned Engineer</span>
              </div>
              {editingRoadmap ? (
                <Select
                  value={roadmapValues.assigned_engineer}
                  onValueChange={(value) => setRoadmapValues({ ...roadmapValues, assigned_engineer: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select engineer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {engineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.email}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-semibold text-gray-900">
                  {feature.roadmap?.assigned_engineer && feature.roadmap?.assigned_engineer !== 'unassigned' 
                    ? engineers.find(e => e.email === feature.roadmap?.assigned_engineer)?.name || 'Unassigned'
                    : 'Unassigned'
                  }
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-warm-neutral" />
                <span className="text-sm text-warm-neutral">Status</span>
              </div>
              <p className="font-semibold text-gray-900">
                <Badge variant={calculateStatus() === 'In Progress' ? 'default' : 'secondary'}>
                  {calculateStatus()}
                </Badge>
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-warm-neutral" />
                <span className="text-sm text-warm-neutral">Progress</span>
              </div>
              <p className="font-semibold text-gray-900">
                {calculateOverallProgress()}%
              </p>
            </div>
          </div>
        </div>

        {/* Tabs - Command Center Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border shadow-sm">
            <TabsTrigger 
              value="prd" 
              className="flex items-center gap-2 data-[state=active]:bg-poppy-primary data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4" />
              PRD Document
              {feature['drive-link'] && <CheckCircle2 className="w-3 h-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger 
              value="design" 
              className="flex items-center gap-2 data-[state=active]:bg-poppy-primary data-[state=active]:text-white"
            >
              <Palette className="w-4 h-4" />
              Design Mockups
              {feature['v0-link'] && <CheckCircle2 className="w-3 h-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger 
              value="decomposition" 
              className="flex items-center gap-2 data-[state=active]:bg-poppy-primary data-[state=active]:text-white"
            >
              <Layers className="w-4 h-4" />
              Release Phases
              {phases.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{phases.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* PRD Tab */}
          <TabsContent value="prd" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-poppy-primary" />
                    Product Requirements Document
                  </div>
                  {feature['drive-link'] && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={feature['drive-link']} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Google Docs
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {feature['drive-link'] ? (
                  <div className="w-full h-[700px] bg-gray-50">
                    <iframe
                      src={`https://docs.google.com/document/d/${feature['drive-link'].match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]}/preview`}
                      className="w-full h-full"
                      title="PRD Document"
                    />
                  </div>
                ) : (
                  <div className="text-center py-24 bg-gray-50">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 mb-2">No PRD document linked yet</p>
                    <p className="text-sm text-gray-500">Add a Google Doc link to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-poppy-primary" />
                    Design Mockups
                  </div>
                  {feature['v0-link'] && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={feature['v0-link']} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in V0
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {feature['v0-link'] ? (
                  <div className="w-full h-[700px] bg-gray-50">
                    <iframe
                      src={feature['v0-link']}
                      className="w-full h-full"
                      title="Design Mockup"
                    />
                  </div>
                ) : (
                  <div className="text-center py-24 bg-gray-50">
                    <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 mb-2">No design mockup linked yet</p>
                    <p className="text-sm text-gray-500 mb-6">Create AI-powered design mockups for your feature</p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => {
                          // Navigate to auto-design generation
                          window.location.href = `/roadmap/feature/${feature.id}/design`;
                        }}
                        disabled={!feature['drive-link']}
                        className="bg-poppy-primary hover:bg-poppy-primary-hover text-white"
                      >
                        <Palette className="w-4 h-4 mr-2" />
                        🚀 Create Design
                      </Button>
                      <span className="text-sm text-gray-400">or</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const v0Link = prompt('Enter V0 design link:');
                          if (v0Link) {
                            handleUpdateV0Link(v0Link);
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Add V0 Link
                      </Button>
                    </div>
                    {!feature['drive-link'] && (
                      <p className="text-xs text-red-500 mt-3">
                        💡 Add a PRD document first to enable AI design generation
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decomposition Tab */}
          <TabsContent value="decomposition" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-poppy-primary" />
                    Release Phases
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPhase(-1)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Phase
                    </Button>
                    <Button 
                      onClick={handleDecompose} 
                      disabled={decomposing || !feature['drive-link']}
                      variant="outline"
                      size="sm"
                    >
                      {decomposing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Decomposing...
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4 mr-2" />
                          {phases.length > 0 ? 'Re-decompose' : 'Decompose PRD'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPhases ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading phases...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Add new phase form */}
                    {editingPhase === -1 && (
                      <Card className="border-2 border-dashed border-poppy-primary bg-poppy-primary-light/10">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Phase name"
                              className="w-full px-3 py-2 border rounded-md"
                              value={phaseValues[-1]?.name || ''}
                              onChange={(e) => setPhaseValues({
                                ...phaseValues,
                                [-1]: { ...phaseValues[-1], name: e.target.value, id: -1, priority: phases.length + 1 }
                              })}
                            />
                            <textarea
                              placeholder="Phase description"
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={phaseValues[-1]?.description || ''}
                              onChange={(e) => setPhaseValues({
                                ...phaseValues,
                                [-1]: { ...phaseValues[-1], description: e.target.value }
                              })}
                            />
                            <textarea
                              placeholder="Customer value (optional)"
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={phaseValues[-1]?.customer_value || ''}
                              onChange={(e) => setPhaseValues({
                                ...phaseValues,
                                [-1]: { ...phaseValues[-1], customer_value: e.target.value }
                              })}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPhase(null)
                                  setPhaseValues({})
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveNewPhase()}
                              >
                                Save Phase
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Existing phases */}
                    {phases.map((phase) => (
                      <Card key={phase.id} className="border-l-4 border-l-poppy-primary hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {editingPhase === phase.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-md font-semibold"
                                value={phaseValues[phase.id]?.name || phase.name}
                                onChange={(e) => setPhaseValues({
                                  ...phaseValues,
                                  [phase.id]: { ...phase, ...phaseValues[phase.id], name: e.target.value }
                                })}
                              />
                              <textarea
                                className="w-full px-3 py-2 border rounded-md"
                                rows={2}
                                value={phaseValues[phase.id]?.description || phase.description}
                                onChange={(e) => setPhaseValues({
                                  ...phaseValues,
                                  [phase.id]: { ...phase, ...phaseValues[phase.id], description: e.target.value }
                                })}
                              />
                              <textarea
                                placeholder="Customer value (optional)"
                                className="w-full px-3 py-2 border rounded-md"
                                rows={2}
                                value={phaseValues[phase.id]?.customer_value || phase.customer_value || ''}
                                onChange={(e) => setPhaseValues({
                                  ...phaseValues,
                                  [phase.id]: { ...phase, ...phaseValues[phase.id], customer_value: e.target.value }
                                })}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPhase(null)
                                    setPhaseValues({})
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdatePhase(phase.id)}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <button
                                    onClick={() => togglePhaseComplete(phase.id, !phase.is_complete)}
                                    className="text-warm-neutral hover:text-poppy-primary transition-colors"
                                  >
                                    {phase.is_complete ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <Circle className="w-5 h-5" />
                                    )}
                                  </button>
                                  <h3 className="font-semibold text-lg">{phase.name}</h3>
                                  <Badge variant="outline">Phase {phase.priority}</Badge>
                                </div>
                                <p className="text-warm-neutral mb-3">{phase.description}</p>
                                {phase.customer_value && (
                                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-green-800 mb-1">Customer Value</p>
                                    <p className="text-sm text-green-700">{phase.customer_value}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-4">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPhase(phase.id)
                                    setPhaseValues({ [phase.id]: phase })
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePhase(phase.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {/* Empty state */}
                    {phases.length === 0 && editingPhase !== -1 && (
                      <div className="text-center py-24 bg-gray-50 rounded-lg">
                        <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600 mb-2">No decomposition phases yet</p>
                        <p className="text-sm text-gray-500 mb-4">
                          {feature['drive-link'] 
                            ? 'Click "Decompose PRD" to break down your feature into release phases'
                            : 'Add a Google Doc link first to enable PRD decomposition'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}