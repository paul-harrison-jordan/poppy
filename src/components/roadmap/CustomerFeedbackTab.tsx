'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageSquare, Trash2, Eye, EyeOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CustomerFeedback {
  id: number
  customer_name?: string
  customer_company?: string
  customer_email?: string
  feedback_source?: string
  feedback_type: string
  feedback_content: string
  urgency_level: string
  business_impact?: string
  feedback_date?: string
  internal_notes?: string
  is_public: boolean
}

interface PRD {
  id: number
  customer_feedback?: CustomerFeedback[]
}

interface CustomerFeedbackTabProps {
  prd: PRD
  userEmail: string
  onUpdate: () => void
}

const urgencyColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

const feedbackTypeColors = {
  request: 'bg-blue-100 text-blue-800',
  pain_point: 'bg-red-100 text-red-800',
  use_case: 'bg-purple-100 text-purple-800',
  validation: 'bg-green-100 text-green-800',
  concern: 'bg-orange-100 text-orange-800'
}

export default function CustomerFeedbackTab({ prd, onUpdate }: CustomerFeedbackTabProps) {
  const [isAddingFeedback, setIsAddingFeedback] = useState(false)
  const [newFeedback, setNewFeedback] = useState({
    customer_name: '',
    customer_company: '',
    customer_email: '',
    feedback_source: '',
    feedback_type: 'request',
    feedback_content: '',
    urgency_level: 'medium',
    business_impact: '',
    feedback_date: new Date().toISOString().split('T')[0],
    internal_notes: '',
    is_public: true
  })

  const handleAddFeedback = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback)
      })
      
      if (response.ok) {
        setNewFeedback({
          customer_name: '',
          customer_company: '',
          customer_email: '',
          feedback_source: '',
          feedback_type: 'request',
          feedback_content: '',
          urgency_level: 'medium',
          business_impact: '',
          feedback_date: new Date().toISOString().split('T')[0],
          internal_notes: '',
          is_public: true
        })
        setIsAddingFeedback(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding customer feedback:', error)
    }
  }

  const handleDeleteFeedback = async (feedbackId: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/feedback/${feedbackId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting customer feedback:', error)
    }
  }

  const handleToggleVisibility = async (feedbackId: number, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !isPublic })
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating feedback visibility:', error)
    }
  }

  const feedback = prd.customer_feedback || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customer Feedback</h3>
        <Dialog open={isAddingFeedback} onOpenChange={setIsAddingFeedback}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Customer Feedback</DialogTitle>
              <DialogDescription>
                Record customer feedback, requests, or validation for this PRD
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={newFeedback.customer_name}
                    onChange={(e) => setNewFeedback({...newFeedback, customer_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_company">Company</Label>
                  <Input
                    id="customer_company"
                    value={newFeedback.customer_company}
                    onChange={(e) => setNewFeedback({...newFeedback, customer_company: e.target.value})}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={newFeedback.customer_email}
                    onChange={(e) => setNewFeedback({...newFeedback, customer_email: e.target.value})}
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="feedback_source">Source</Label>
                  <Input
                    id="feedback_source"
                    value={newFeedback.feedback_source}
                    onChange={(e) => setNewFeedback({...newFeedback, feedback_source: e.target.value})}
                    placeholder="Sales call, Support ticket, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="feedback_type">Type</Label>
                  <Select value={newFeedback.feedback_type} onValueChange={(value) => setNewFeedback({...newFeedback, feedback_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="request">Feature Request</SelectItem>
                      <SelectItem value="pain_point">Pain Point</SelectItem>
                      <SelectItem value="use_case">Use Case</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="concern">Concern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency_level">Urgency</Label>
                  <Select value={newFeedback.urgency_level} onValueChange={(value) => setNewFeedback({...newFeedback, urgency_level: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="feedback_date">Date</Label>
                  <Input
                    id="feedback_date"
                    type="date"
                    value={newFeedback.feedback_date}
                    onChange={(e) => setNewFeedback({...newFeedback, feedback_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="feedback_content">Feedback Content *</Label>
                <Textarea
                  id="feedback_content"
                  value={newFeedback.feedback_content}
                  onChange={(e) => setNewFeedback({...newFeedback, feedback_content: e.target.value})}
                  placeholder="Describe the customer's feedback, request, or pain point..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="business_impact">Business Impact</Label>
                <Textarea
                  id="business_impact"
                  value={newFeedback.business_impact}
                  onChange={(e) => setNewFeedback({...newFeedback, business_impact: e.target.value})}
                  placeholder="Potential revenue impact, user growth, etc."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="internal_notes">Internal Notes</Label>
                <Textarea
                  id="internal_notes"
                  value={newFeedback.internal_notes}
                  onChange={(e) => setNewFeedback({...newFeedback, internal_notes: e.target.value})}
                  placeholder="Private notes for your team..."
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={newFeedback.is_public}
                  onChange={(e) => setNewFeedback({...newFeedback, is_public: e.target.checked})}
                />
                <Label htmlFor="is_public">Share with stakeholders (public)</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingFeedback(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFeedback} disabled={!newFeedback.feedback_content}>
                Add Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {feedback.length > 0 ? (
        <div className="grid gap-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    {item.customer_name && (
                      <span className="font-medium">{item.customer_name}</span>
                    )}
                    {item.customer_company && (
                      <span className="text-sm text-gray-600">({item.customer_company})</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleVisibility(item.id, item.is_public)}
                    >
                      {item.is_public ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Private
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFeedback(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge className={feedbackTypeColors[item.feedback_type as keyof typeof feedbackTypeColors]}>
                    {item.feedback_type.replace('_', ' ')}
                  </Badge>
                  <Badge className={urgencyColors[item.urgency_level as keyof typeof urgencyColors]}>
                    {item.urgency_level}
                  </Badge>
                  {item.feedback_source && (
                    <Badge variant="outline">{item.feedback_source}</Badge>
                  )}
                  {item.feedback_date && (
                    <span className="text-xs text-gray-500">
                      {new Date(item.feedback_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="text-sm mb-3 whitespace-pre-wrap">{item.feedback_content}</p>

                {item.business_impact && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-800 mb-1">Business Impact</div>
                    <div className="text-sm text-green-700">{item.business_impact}</div>
                  </div>
                )}

                {item.internal_notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-800 mb-1">Internal Notes</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{item.internal_notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No customer feedback recorded yet</p>
              <p className="text-sm">Add customer requests, pain points, and validation to strengthen your PRD</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}