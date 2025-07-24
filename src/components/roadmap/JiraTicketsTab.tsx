'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Link, ExternalLink, Trash2, Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface JiraTicket {
  id: number
  ticket_key: string
  ticket_url: string
  ticket_type?: string
  ticket_title?: string
  ticket_status?: string
  is_primary_epic: boolean
}

interface PRD {
  id: number
  jira_tickets?: JiraTicket[]
}

interface JiraTicketsTabProps {
  prd: PRD
  userEmail: string
  onUpdate: () => void
}

const ticketTypeColors = {
  Epic: 'bg-purple-100 text-purple-800',
  Story: 'bg-blue-100 text-blue-800',
  Task: 'bg-green-100 text-green-800',
  Bug: 'bg-red-100 text-red-800',
  Subtask: 'bg-gray-100 text-gray-800'
}

const statusColors = {
  'To Do': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'In Review': 'bg-purple-100 text-purple-800',
  'Done': 'bg-green-100 text-green-800',
  'Blocked': 'bg-red-100 text-red-800'
}

export default function JiraTicketsTab({ prd, onUpdate }: JiraTicketsTabProps) {
  const [isAddingTicket, setIsAddingTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    ticket_key: '',
    ticket_url: '',
    ticket_type: '',
    ticket_title: '',
    ticket_status: '',
    is_primary_epic: false
  })

  const handleAddTicket = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket)
      })
      
      if (response.ok) {
        setNewTicket({
          ticket_key: '',
          ticket_url: '',
          ticket_type: '',
          ticket_title: '',
          ticket_status: '',
          is_primary_epic: false
        })
        setIsAddingTicket(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding Jira ticket:', error)
    }
  }

  const handleDeleteTicket = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/jira/${ticketId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting Jira ticket:', error)
    }
  }

  const handleTogglePrimary = async (ticketId: number, isPrimary: boolean) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/jira/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary_epic: !isPrimary })
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating Jira ticket:', error)
    }
  }

  const tickets = prd.jira_tickets || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Jira Tickets</h3>
        <Dialog open={isAddingTicket} onOpenChange={setIsAddingTicket}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Jira Ticket</DialogTitle>
              <DialogDescription>
                Connect a Jira ticket or epic to this PRD for development tracking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ticket_key">Ticket Key *</Label>
                <Input
                  id="ticket_key"
                  value={newTicket.ticket_key}
                  onChange={(e) => setNewTicket({...newTicket, ticket_key: e.target.value})}
                  placeholder="PROJ-123"
                />
              </div>
              <div>
                <Label htmlFor="ticket_url">Ticket URL *</Label>
                <Input
                  id="ticket_url"
                  value={newTicket.ticket_url}
                  onChange={(e) => setNewTicket({...newTicket, ticket_url: e.target.value})}
                  placeholder="https://yourteam.atlassian.net/browse/PROJ-123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticket_type">Type</Label>
                  <Select value={newTicket.ticket_type} onValueChange={(value) => setNewTicket({...newTicket, ticket_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Epic">Epic</SelectItem>
                      <SelectItem value="Story">Story</SelectItem>
                      <SelectItem value="Task">Task</SelectItem>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Subtask">Subtask</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ticket_status">Status</Label>
                  <Select value={newTicket.ticket_status} onValueChange={(value) => setNewTicket({...newTicket, ticket_status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="ticket_title">Title</Label>
                <Input
                  id="ticket_title"
                  value={newTicket.ticket_title}
                  onChange={(e) => setNewTicket({...newTicket, ticket_title: e.target.value})}
                  placeholder="Brief description of the ticket"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_primary_epic"
                  checked={newTicket.is_primary_epic}
                  onChange={(e) => setNewTicket({...newTicket, is_primary_epic: e.target.checked})}
                />
                <Label htmlFor="is_primary_epic">Primary epic for this PRD</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingTicket(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTicket} disabled={!newTicket.ticket_key || !newTicket.ticket_url}>
                  Add Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length > 0 ? (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Link className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{ticket.ticket_key}</span>
                      {ticket.ticket_type && (
                        <Badge className={ticketTypeColors[ticket.ticket_type as keyof typeof ticketTypeColors] || 'bg-gray-100 text-gray-800'}>
                          {ticket.ticket_type}
                        </Badge>
                      )}
                      {ticket.ticket_status && (
                        <Badge className={statusColors[ticket.ticket_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                          {ticket.ticket_status}
                        </Badge>
                      )}
                      {ticket.is_primary_epic && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Primary Epic
                        </Badge>
                      )}
                    </div>
                    
                    {ticket.ticket_title && (
                      <p className="text-sm text-gray-600 mb-2">{ticket.ticket_title}</p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={ticket.ticket_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open in Jira
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePrimary(ticket.id, ticket.is_primary_epic)}
                      >
                        <Star className={`w-3 h-3 mr-1 ${ticket.is_primary_epic ? 'fill-current' : ''}`} />
                        {ticket.is_primary_epic ? 'Remove Primary' : 'Make Primary Epic'}
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTicket(ticket.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No Jira tickets linked yet</p>
              <p className="text-sm">Connect relevant tickets and epics to track development progress</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}