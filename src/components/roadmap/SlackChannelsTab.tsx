'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageSquare, ExternalLink, Trash2, Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface SlackChannel {
  id: number
  channel_name: string
  channel_url?: string
  channel_purpose?: string
  is_primary: boolean
}

interface PRD {
  id: number
  slack_channels?: SlackChannel[]
}

interface SlackChannelsTabProps {
  prd: PRD
  userEmail: string
  onUpdate: () => void
}

export default function SlackChannelsTab({ prd, onUpdate }: SlackChannelsTabProps) {
  const [isAddingChannel, setIsAddingChannel] = useState(false)
  const [newChannel, setNewChannel] = useState({
    channel_name: '',
    channel_url: '',
    channel_purpose: '',
    is_primary: false
  })

  const handleAddChannel = async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel)
      })
      
      if (response.ok) {
        setNewChannel({
          channel_name: '',
          channel_url: '',
          channel_purpose: '',
          is_primary: false
        })
        setIsAddingChannel(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding Slack channel:', error)
    }
  }

  const handleDeleteChannel = async (channelId: number) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/slack/${channelId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting Slack channel:', error)
    }
  }

  const handleTogglePrimary = async (channelId: number, isPrimary: boolean) => {
    try {
      const response = await fetch(`/api/roadmap/prd/${prd.id}/slack/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: !isPrimary })
      })
      
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating Slack channel:', error)
    }
  }

  const channels = prd.slack_channels || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Slack Channels</h3>
        <Dialog open={isAddingChannel} onOpenChange={setIsAddingChannel}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Slack Channel</DialogTitle>
              <DialogDescription>
                Connect a Slack channel to this PRD for team communication
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel_name">Channel Name</Label>
                <Input
                  id="channel_name"
                  value={newChannel.channel_name}
                  onChange={(e) => setNewChannel({...newChannel, channel_name: e.target.value})}
                  placeholder="#product-feature-name"
                />
              </div>
              <div>
                <Label htmlFor="channel_url">Channel URL (optional)</Label>
                <Input
                  id="channel_url"
                  value={newChannel.channel_url}
                  onChange={(e) => setNewChannel({...newChannel, channel_url: e.target.value})}
                  placeholder="https://yourteam.slack.com/channels/..."
                />
              </div>
              <div>
                <Label htmlFor="channel_purpose">Purpose</Label>
                <Textarea
                  id="channel_purpose"
                  value={newChannel.channel_purpose}
                  onChange={(e) => setNewChannel({...newChannel, channel_purpose: e.target.value})}
                  placeholder="Why is this channel relevant to this PRD?"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={newChannel.is_primary}
                  onChange={(e) => setNewChannel({...newChannel, is_primary: e.target.checked})}
                />
                <Label htmlFor="is_primary">Primary channel for this PRD</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingChannel(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddChannel} disabled={!newChannel.channel_name}>
                  Add Channel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length > 0 ? (
        <div className="grid gap-4">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{channel.channel_name}</span>
                      {channel.is_primary && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    
                    {channel.channel_purpose && (
                      <p className="text-sm text-gray-600 mb-2">{channel.channel_purpose}</p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {channel.channel_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={channel.channel_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open Channel
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePrimary(channel.id, channel.is_primary)}
                      >
                        <Star className={`w-3 h-3 mr-1 ${channel.is_primary ? 'fill-current' : ''}`} />
                        {channel.is_primary ? 'Remove Primary' : 'Make Primary'}
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteChannel(channel.id)}
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
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No Slack channels linked yet</p>
              <p className="text-sm">Connect relevant channels to keep team communication organized</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}