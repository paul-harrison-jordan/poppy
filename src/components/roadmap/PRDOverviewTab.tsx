'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit2, Save, X, AlertTriangle, Target, TrendingUp } from 'lucide-react'

interface PRD {
  id: number
  'drive-link': string
  'v0-link'?: string
  user: string
  shipped: boolean
  created_at: string
  roadmap?: {
    priority_order: number
    status: string
    target_quarter?: string
    estimated_effort_points?: number
    business_value_score?: number
    technical_complexity_score?: number
    dependencies?: string[]
    risks?: Array<{risk: string, mitigation: string, impact: string}>
    success_metrics?: Array<{metric: string, target: string, measurement: string}>
    roadmap_notes?: string
  }
}

interface PRDOverviewTabProps {
  prd: PRD
  userEmail: string
  onUpdate: () => void
}

export default function PRDOverviewTab({ prd, onUpdate }: PRDOverviewTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    status: prd.roadmap?.status || 'planned',
    target_quarter: prd.roadmap?.target_quarter || '',
    estimated_effort_points: prd.roadmap?.estimated_effort_points || '',
    business_value_score: prd.roadmap?.business_value_score || '',
    technical_complexity_score: prd.roadmap?.technical_complexity_score || '',
    roadmap_notes: prd.roadmap?.roadmap_notes || ''
  })

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      
      if (response.ok) {
        setIsEditing(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating PRD:', error)
    }
  }

  const handleCancel = () => {
    setEditData({
      status: prd.roadmap?.status || 'planned',
      target_quarter: prd.roadmap?.target_quarter || '',
      estimated_effort_points: prd.roadmap?.estimated_effort_points || '',
      business_value_score: prd.roadmap?.business_value_score || '',
      technical_complexity_score: prd.roadmap?.technical_complexity_score || '',
      roadmap_notes: prd.roadmap?.roadmap_notes || ''
    })
    setIsEditing(false)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Roadmap Details
          </CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              {isEditing ? (
                <Select value={editData.status} onValueChange={(value) => setEditData({...editData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  <Badge>{prd.roadmap?.status || 'planned'}</Badge>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="target_quarter">Target Quarter</Label>
              {isEditing ? (
                <Input
                  id="target_quarter"
                  value={editData.target_quarter}
                  onChange={(e) => setEditData({...editData, target_quarter: e.target.value})}
                  placeholder="e.g., Q2 2024"
                />
              ) : (
                <div className="mt-1 text-sm">{prd.roadmap?.target_quarter || 'Not set'}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="effort_points">Effort Points</Label>
              {isEditing ? (
                <Input
                  id="effort_points"
                  type="number"
                  value={editData.estimated_effort_points}
                  onChange={(e) => setEditData({...editData, estimated_effort_points: parseInt(e.target.value) || ''})}
                  placeholder="Story points"
                />
              ) : (
                <div className="mt-1 text-sm">{prd.roadmap?.estimated_effort_points || 'Not set'}</div>
              )}
            </div>
            
            <div>
              <Label htmlFor="business_value">Business Value (1-10)</Label>
              {isEditing ? (
                <Input
                  id="business_value"
                  type="number"
                  min="1"
                  max="10"
                  value={editData.business_value_score}
                  onChange={(e) => setEditData({...editData, business_value_score: parseInt(e.target.value) || ''})}
                />
              ) : (
                <div className="mt-1 text-sm">{prd.roadmap?.business_value_score || 'Not set'}/10</div>
              )}
            </div>
            
            <div>
              <Label htmlFor="complexity">Complexity (1-10)</Label>
              {isEditing ? (
                <Input
                  id="complexity"
                  type="number"
                  min="1"
                  max="10"
                  value={editData.technical_complexity_score}
                  onChange={(e) => setEditData({...editData, technical_complexity_score: parseInt(e.target.value) || ''})}
                />
              ) : (
                <div className="mt-1 text-sm">{prd.roadmap?.technical_complexity_score || 'Not set'}/10</div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="roadmap_notes">Roadmap Notes</Label>
            {isEditing ? (
              <Textarea
                id="roadmap_notes"
                value={editData.roadmap_notes}
                onChange={(e) => setEditData({...editData, roadmap_notes: e.target.value})}
                placeholder="Notes for stakeholder discussions..."
                rows={3}
              />
            ) : (
              <div className="mt-1 text-sm whitespace-pre-wrap">
                {prd.roadmap?.roadmap_notes || 'No notes yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Success Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prd.roadmap?.success_metrics && prd.roadmap.success_metrics.length > 0 ? (
            <div className="space-y-3">
              {prd.roadmap.success_metrics.map((metric, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-medium">{metric.metric}</div>
                  <div className="text-sm text-gray-600">Target: {metric.target}</div>
                  <div className="text-sm text-gray-500">Measurement: {metric.measurement}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No success metrics defined yet</div>
          )}
        </CardContent>
      </Card>

      {prd.roadmap?.dependencies && prd.roadmap.dependencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prd.roadmap.dependencies.map((dependency: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-sm">{dependency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {prd.roadmap?.risks && prd.roadmap.risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Risks & Mitigation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prd.roadmap.risks.map((risk, index: number) => (
                <div key={index} className="border border-red-200 rounded-lg p-3">
                  <div className="font-medium text-red-800">{risk.risk}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <strong>Impact:</strong> {risk.impact}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}