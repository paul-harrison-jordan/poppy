import { openai } from '../openai'

interface RoadmapDefaults {
  business_value_score: number
  technical_complexity_score: number
  estimated_effort_points: number
  target_quarter: string
  status: string
  roadmap_notes: string
  priority_order: number
}

export class RoadmapAIService {
  
  static async generateRoadmapDefaults(prdContent: string): Promise<RoadmapDefaults> {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3)
      
      const prompt = `
As an AI product management assistant, analyze this PRD content and generate smart roadmap defaults.

PRD Content:
${prdContent}

Generate roadmap defaults in JSON format with these fields:

1. business_value_score (1-10): Rate potential business impact
   - 1-3: Low impact (internal tools, minor improvements)
   - 4-6: Medium impact (user experience improvements, efficiency gains)
   - 7-10: High impact (revenue drivers, competitive advantages, major user needs)

2. technical_complexity_score (1-10): Rate implementation difficulty
   - 1-3: Simple (config changes, minor UI updates)
   - 4-6: Medium (new features, integrations, moderate backend work)
   - 7-10: Complex (new infrastructure, major architecture changes)

3. estimated_effort_points (1-20): Estimate in story points
   - Based on complexity and scope described in PRD

4. target_quarter: Suggest realistic quarter (format: "Q1 ${currentYear + 1}", "Q2 ${currentYear + 1}", etc.)
   - Current: Q${currentQuarter} ${currentYear}
   - Consider complexity and business priority

5. status: Always set to "planned"

6. roadmap_notes: 2-3 sentence summary of key goals and success criteria

7. priority_order: Suggest priority (1-100, lower = higher priority)
   - Based on business value vs complexity ratio

Respond with ONLY valid JSON, no additional text:
`

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      })

      const content = response.choices[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('No response from AI service')
      }

      // Parse the JSON response
      const defaults = JSON.parse(content) as RoadmapDefaults
      
      // Validate and sanitize the response
      return {
        business_value_score: Math.min(10, Math.max(1, defaults.business_value_score || 5)),
        technical_complexity_score: Math.min(10, Math.max(1, defaults.technical_complexity_score || 5)),
        estimated_effort_points: Math.min(20, Math.max(1, defaults.estimated_effort_points || 5)),
        target_quarter: defaults.target_quarter || `Q${currentQuarter + 1} ${currentYear}`,
        status: 'planned',
        roadmap_notes: defaults.roadmap_notes || 'AI-generated roadmap entry from PRD content',
        priority_order: Math.min(100, Math.max(1, defaults.priority_order || 50))
      }

    } catch (error) {
      console.error('Error generating roadmap defaults:', error)
      
      // Return sensible fallbacks if AI fails
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3)
      
      return {
        business_value_score: 5,
        technical_complexity_score: 5,
        estimated_effort_points: 5,
        target_quarter: `Q${currentQuarter + 1} ${currentYear}`,
        status: 'planned',
        roadmap_notes: 'Automatically created roadmap entry. Please review and update details.',
        priority_order: 50
      }
    }
  }

  static async createRoadmapEntry(prdId: number, prdContent: string, userEmail: string) {
    try {
      // Generate AI-powered defaults
      const defaults = await this.generateRoadmapDefaults(prdContent)
      
      // Update PRD with AI-generated roadmap defaults via API
      const response = await fetch('/api/roadmap/auto-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prd_id: prdId,
          user_email: userEmail,
          ...defaults
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create roadmap entry')
      }

      const result = await response.json()
      console.log('Auto-updated PRD with roadmap data:', prdId)
      
      return result

    } catch (error) {
      console.error('Error updating PRD with roadmap data:', error)
      // Don't throw - we don't want to break PRD creation if roadmap update fails
      return null
    }
  }
}