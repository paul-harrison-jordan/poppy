import { NextRequest, NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { createServiceClient } from '@/utils/supabase/service'

// POST /api/teams/suggest-engineers - Get AI-powered engineer suggestions for a feature
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      prd_id,
      required_skills = [],
      estimated_complexity = 3, // 1-5 scale
      estimated_weeks = 4
    } = body

    if (!prd_id) {
      return NextResponse.json({ 
        error: 'PRD ID is required' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Get all team members with their engineers and performance history
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        *,
        engineer:engineers(*),
        team:teams(team_name),
        performance_metrics:team_performance_metrics(
          estimated_weeks,
          actual_weeks,
          complexity_rating,
          quality_rating,
          primary_technologies,
          completed_at
        )
      `)
      .eq('user_email', session.user.email)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Calculate engineer suggestions based on:
    // 1. Skill match
    // 2. Historical performance
    // 3. Current capacity
    // 4. Team role suitability
    
    const suggestions = teamMembers?.map(member => {
      const engineer = member.engineer
      const performance = member.performance_metrics || []
      
      // Calculate skill match score (0-1)
      const skillMatchScore = calculateSkillMatch(engineer.skill_tags || [], required_skills)
      
      // Calculate performance score based on historical data (0-1)
      const performanceScore = calculatePerformanceScore(performance, estimated_complexity)
      
      // Calculate capacity score (0-1) - simplified for now
      const capacityScore = calculateCapacityScore(member, estimated_weeks)
      
      // Calculate role suitability (0-1)
      const roleSuitabilityScore = calculateRoleSuitability(member.role, estimated_complexity)
      
      // Overall recommendation score (weighted average)
      const overallScore = (
        skillMatchScore * 0.4 +
        performanceScore * 0.3 +
        capacityScore * 0.2 +
        roleSuitabilityScore * 0.1
      )
      
      return {
        team_member_id: member.id,
        engineer: {
          id: engineer.id,
          name: engineer.engineer_name,
          email: engineer.engineer_email,
          title: engineer.title,
          skill_tags: engineer.skill_tags
        },
        team: {
          name: member.team.team_name,
          role: member.role,
          is_primary_role: member.is_primary_role
        },
        scores: {
          skill_match: skillMatchScore,
          performance: performanceScore,
          capacity: capacityScore,
          role_suitability: roleSuitabilityScore,
          overall: overallScore
        },
        recommendation_reason: generateRecommendationReason(
          skillMatchScore, 
          performanceScore, 
          member.role,
          performance.length
        )
      }
    }).sort((a, b) => b.scores.overall - a.scores.overall) || []

    return NextResponse.json({ 
      suggestions: suggestions.slice(0, 5), // Top 5 suggestions
      request_params: {
        prd_id,
        required_skills,
        estimated_complexity,
        estimated_weeks
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions for scoring
function calculateSkillMatch(engineerSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 0.5 // Neutral if no specific skills required
  
  const matchCount = requiredSkills.filter(skill => 
    engineerSkills.some(engineerSkill => 
      engineerSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(engineerSkill.toLowerCase())
    )
  ).length
  
  return Math.min(matchCount / requiredSkills.length, 1.0)
}

interface PerformanceMetric {
  completed_at?: string
  estimated_weeks?: number
  actual_weeks?: number
  quality_rating?: number
  complexity_rating?: number
}

function calculatePerformanceScore(performanceMetrics: PerformanceMetric[], estimatedComplexity: number): number {
  if (performanceMetrics.length === 0) return 0.5 // Neutral for new engineers
  
  // Look at recent performance (last 5 projects)
  const recentMetrics = performanceMetrics
    .filter(m => m.completed_at)
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, 5)
  
  if (recentMetrics.length === 0) return 0.5
  
  // Calculate average performance scores
  const avgAccuracy = recentMetrics.reduce((sum, m) => {
    if (m.estimated_weeks && m.actual_weeks) {
      const accuracy = Math.max(0, 1 - Math.abs(m.estimated_weeks - m.actual_weeks) / m.estimated_weeks)
      return sum + accuracy
    }
    return sum
  }, 0) / recentMetrics.length
  
  const avgQuality = recentMetrics.reduce((sum, m) => sum + (m.quality_rating || 3), 0) / recentMetrics.length / 5
  
  // Bonus for handling similar complexity
  const complexityBonus = recentMetrics.some(m => 
    Math.abs((m.complexity_rating || 3) - estimatedComplexity) <= 1
  ) ? 0.1 : 0
  
  return Math.min((avgAccuracy * 0.6 + avgQuality * 0.4 + complexityBonus), 1.0)
}

interface TeamMember {
  capacity_override?: number
  utilization_override?: number
  team?: {
    default_capacity_hours_per_week?: number
    default_utilization_target?: number
  }
}

function calculateCapacityScore(member: TeamMember, estimatedWeeks: number): number {
  // This is simplified - in real implementation, you'd check current assignments
  // For now, assume all engineers have capacity
  const baseCapacity = member.capacity_override || member.team?.default_capacity_hours_per_week || 40
  
  // Simple heuristic: if it's a long project, prefer engineers with higher capacity
  if (estimatedWeeks > 8) {
    return baseCapacity >= 40 ? 0.8 : 0.6
  }
  
  return 0.7 // Default neutral score
}

function calculateRoleSuitability(role: string, estimatedComplexity: number): number {
  switch (role) {
    case 'tech_lead':
      return estimatedComplexity >= 4 ? 0.9 : 0.7
    case 'engineering_manager':
      return estimatedComplexity >= 4 ? 0.8 : 0.5 // EMs better for complex projects
    case 'engineer':
      return estimatedComplexity <= 3 ? 0.8 : 0.6
    case 'designer':
      return 0.3 // Designers less suitable for engineering tasks
    default:
      return 0.5
  }
}

function generateRecommendationReason(
  skillMatch: number, 
  performance: number, 
  role: string,
  projectCount: number
): string {
  const reasons = []
  
  if (skillMatch > 0.7) {
    reasons.push("Strong skill match")
  } else if (skillMatch > 0.4) {
    reasons.push("Good skill alignment")
  }
  
  if (performance > 0.7) {
    reasons.push("Excellent track record")
  } else if (performance > 0.5) {
    reasons.push("Solid performance history")
  }
  
  if (role === 'tech_lead') {
    reasons.push("Technical leadership experience")
  } else if (role === 'engineering_manager') {
    reasons.push("Management and oversight capabilities")
  }
  
  if (projectCount === 0) {
    reasons.push("New team member - good growth opportunity")
  }
  
  return reasons.length > 0 ? reasons.join(", ") : "Available team member"
}