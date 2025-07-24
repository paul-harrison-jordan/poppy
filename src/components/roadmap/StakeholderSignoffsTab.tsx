'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Clock, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StakeholderSignoff {
  id: number
  stakeholder_email: string
  stakeholder_name: string
  stakeholder_role?: string
  signoff_type: string
  status: string
  signoff_notes?: string
  decision_date?: string
  due_date?: string
  reminder_sent_at?: string
  requested_by: string
}

interface PRD {
  id: number
  stakeholder_signoffs?: StakeholderSignoff[]
}

interface StakeholderSignoffsTabProps {
  prd: PRD
  userEmail: string
  onUpdate: () => void
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  needs_changes: 'bg-orange-100 text-orange-800'
}

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  needs_changes: AlertCircle
}

const signoffTypeLabels = {
  technical_review: 'Technical Review',
  business_approval: 'Business Approval',
  legal_review: 'Legal Review',
  security_review: 'Security Review',
  design_review: 'Design Review',
  go_to_market: 'Go-to-Market Approval'
}

export default function StakeholderSignoffsTab({ prd, userEmail, onUpdate }: StakeholderSignoffsTabProps) {
  const [isAddingSignoff, setIsAddingSignoff] = useState(false)
  const [newSignoff, setNewSignoff] = useState({
    stakeholder_email: '',
    stakeholder_name: '',
    stakeholder_role: '',
    signoff_type: 'technical_review',
    due_date: '',
    signoff_notes: ''
  })

  const handleAddSignoff = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/signoffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSignoff)
      })
      
      if (response.ok) {
        setNewSignoff({
          stakeholder_email: '',
          stakeholder_name: '',
          stakeholder_role: '',
          signoff_type: 'technical_review',
          due_date: '',
          signoff_notes: ''
        })
        setIsAddingSignoff(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding stakeholder signoff:', error)
    }
  }

  const handleDeleteSignoff = async (signoffId: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/signoffs/${signoffId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting stakeholder signoff:', error)
    }
  }

  const handleUpdateSignoff = async (signoffId: number, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/signoffs/${signoffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          signoff_notes: notes,
          decision_date: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating stakeholder signoff:', error)
    }
  }

  const signoffs = prd.stakeholder_signoffs || []
  const approvedCount = signoffs.filter((s) => s.status === 'approved').length
  const pendingCount = signoffs.filter((s) => s.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Stakeholder Sign-offs</h3>
          {signoffs.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {approvedCount} approved, {pendingCount} pending
            </p>
          )}
        </div>
        <Dialog open={isAddingSignoff} onOpenChange={setIsAddingSignoff}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Request Sign-off
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Stakeholder Sign-off</DialogTitle>
              <DialogDescription>
                Request approval or review from a key stakeholder for this PRD
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stakeholder_name">Stakeholder Name *</Label>
                  <Input
                    id="stakeholder_name"
                    value={newSignoff.stakeholder_name}
                    onChange={(e) => setNewSignoff({...newSignoff, stakeholder_name: e.target.value})}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="stakeholder_email">Email *</Label>
                  <Input
                    id="stakeholder_email"
                    type="email"
                    value={newSignoff.stakeholder_email}
                    onChange={(e) => setNewSignoff({...newSignoff, stakeholder_email: e.target.value})}
                    placeholder="jane@company.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stakeholder_role">Role</Label>
                  <Input
                    id="stakeholder_role"
                    value={newSignoff.stakeholder_role}
                    onChange={(e) => setNewSignoff({...newSignoff, stakeholder_role: e.target.value})}
                    placeholder="Engineering Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="signoff_type">Sign-off Type *</Label>
                  <Select value={newSignoff.signoff_type} onValueChange={(value) => setNewSignoff({...newSignoff, signoff_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical_review">Technical Review</SelectItem>
                      <SelectItem value="business_approval">Business Approval</SelectItem>
                      <SelectItem value="legal_review">Legal Review</SelectItem>
                      <SelectItem value="security_review">Security Review</SelectItem>
                      <SelectItem value="design_review">Design Review</SelectItem>
                      <SelectItem value="go_to_market">Go-to-Market Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newSignoff.due_date}
                  onChange={(e) => setNewSignoff({...newSignoff, due_date: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="signoff_notes">Request Notes</Label>
                <Textarea
                  id="signoff_notes"
                  value={newSignoff.signoff_notes}
                  onChange={(e) => setNewSignoff({...newSignoff, signoff_notes: e.target.value})}
                  placeholder="Additional context or specific questions for the stakeholder..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingSignoff(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSignoff} disabled={!newSignoff.stakeholder_name || !newSignoff.stakeholder_email}>
                  Request Sign-off
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {signoffs.length > 0 ? (
        <div className="grid gap-4">
          {signoffs.map((signoff) => {
            const StatusIcon = statusIcons[signoff.status as keyof typeof statusIcons]
            const isOverdue = signoff.due_date && new Date(signoff.due_date) < new Date() && signoff.status === 'pending'
            
            return (
              <Card key={signoff.id} className={isOverdue ? 'border-red-200' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{signoff.stakeholder_name}</span>
                        {signoff.stakeholder_role && (
                          <span className="text-sm text-gray-600">({signoff.stakeholder_role})</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[signoff.status as keyof typeof statusColors]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {signoff.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {signoffTypeLabels[signoff.signoff_type as keyof typeof signoffTypeLabels]}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>

                      {signoff.due_date && (
                        <p className="text-sm text-gray-600 mb-2">
                          Due: {new Date(signoff.due_date).toLocaleDateString()}
                        </p>
                      )}

                      {signoff.signoff_notes && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                          {signoff.signoff_notes}
                        </p>
                      )}

                      {signoff.status === 'pending' && signoff.stakeholder_email === userEmail && (
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateSignoff(signoff.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateSignoff(signoff.id, 'needs_changes')}
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Request Changes
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateSignoff(signoff.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {signoff.decision_date && (
                        <p className="text-xs text-gray-500 mt-2">
                          Decision made: {new Date(signoff.decision_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSignoff(signoff.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No stakeholder sign-offs requested yet</p>
              <p className="text-sm">Request approvals from key stakeholders to move your PRD forward</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}