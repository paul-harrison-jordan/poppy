'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Mail, DollarSign, MessageSquare, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuggestedCustomer {
  id: number
  customer_name?: string
  customer_email?: string
  feedback_content: string
  urgency_level: string
  business_impact?: string
  internal_notes?: string
  feedback_date?: string
}

interface SuggestedCustomersProps {
  featureId: number
  className?: string
}

const urgencyColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
}

export default function SuggestedCustomers({ featureId, className = '' }: SuggestedCustomersProps) {
  const [customers, setCustomers] = useState<SuggestedCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState('')

  const fetchSuggestedCustomers = useCallback(async () => {
    try {
      const response = await fetch(`/api/roadmap/prd/${featureId}/feedback`)
      if (response.ok) {
        const data = await response.json()
        // Filter for AI-suggested customers (those with internal notes about matching)
        const suggested = data.filter((feedback: SuggestedCustomer) => 
          feedback.internal_notes?.includes('Auto-matched') || 
          feedback.feedback_content?.includes('Suggested customer')
        )
        setCustomers(suggested)
      } else {
        setError('Failed to load suggested customers')
      }
    } catch (err) {
      setError('Error loading suggested customers')
      console.error('Error fetching suggested customers:', err)
    } finally {
      setLoading(false)
    }
  }, [featureId])

  useEffect(() => {
    fetchSuggestedCustomers()
  }, [featureId, fetchSuggestedCustomers])

  const extractGMV = (impact?: string) => {
    if (!impact) return null
    const gmvMatch = impact.match(/GMV: \$([^)]+)/)
    return gmvMatch ? gmvMatch[1] : null
  }

  const extractMatchScore = (notes?: string) => {
    if (!notes) return null
    const scoreMatch = notes.match(/(\d+\.\d+)% similarity/)
    return scoreMatch ? parseFloat(scoreMatch[1]) : null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Suggested Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Suggested Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (customers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Suggested Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No customer suggestions found for this feature yet.</p>
        </CardContent>
      </Card>
    )
  }

  const displayedCustomers = expanded ? customers : customers.slice(0, 3)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-600" />
            Suggested Customers
            <Badge variant="secondary" className="text-xs">
              {customers.length} found
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Star className="w-3 h-3" />
            AI-powered
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Customers with relevant feedback who might be interested in validating this feature
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedCustomers.map((customer) => {
          const gmv = extractGMV(customer.business_impact)
          const matchScore = extractMatchScore(customer.internal_notes)
          
          return (
            <div key={customer.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {customer.customer_name || 'Anonymous Customer'}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${urgencyColors[customer.urgency_level as keyof typeof urgencyColors]}`}
                    >
                      {customer.urgency_level}
                    </Badge>
                    {matchScore && (
                      <Badge variant="secondary" className="text-xs">
                        {matchScore.toFixed(0)}% match
                      </Badge>
                    )}
                  </div>
                  
                  {customer.customer_email && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <Mail className="w-3 h-3" />
                      {customer.customer_email}
                    </div>
                  )}
                  
                  {gmv && (
                    <div className="flex items-center gap-1 text-sm text-green-600 mb-2">
                      <DollarSign className="w-3 h-3" />
                      ${gmv} GMV
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {customer.feedback_content}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`mailto:${customer.customer_email}?subject=Feedback on ${document.title}`, '_blank')}
                  className="text-xs"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Reach Out
                </Button>
              </div>
            </div>
          )
        })}
        
        {customers.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center gap-2"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show {customers.length - 3} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}