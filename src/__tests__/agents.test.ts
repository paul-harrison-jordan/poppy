import { describe, it, expect, vi } from 'vitest'

// Mock the OpenAI module to avoid needing API keys during testing
vi.mock('@/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }
}))

// Import the mocked function after the mock is set up
import { openai } from '@/lib/openai'
const mockCreate = vi.mocked(openai.chat.completions.create)

import { EchoAgent } from '../agents/EchoAgent'
import { JobsExtractorAgent } from '../agents/jobsExtractor'
import { ScopeAnalyzerAgent } from '../agents/scopeAnalyzer'
import { CompetitiveLandscaperAgent } from '../agents/competitiveLandscaper'
import { RoadmapPositionerAgent } from '../agents/roadmapPositioner'
import { EngineeringEstimatorAgent } from '../agents/engineeringEstimator'
import { PRDWriterAgent } from '../agents/prdWriter'
import { PRDOrchestrator } from '../orchestrators/PRDOrchestrator'
import { ModelSelector } from '../agents/ModelSelector'
import { OutcomeAnalyzerAgent } from '../agents/outcomeAnalyzer'
import { LearningSystem } from '../services/LearningSystem'

describe('EchoAgent', () => {
  it('should instantiate and return expected echo text', async () => {
    const agent = new EchoAgent()
    
    expect(agent.name).toBe('EchoAgent')
    expect(agent.purpose).toBe('Simple test agent that echoes input')
    expect(agent.model).toBe('gpt-4o-mini')
    expect(agent.maxTokens).toBe(100)
    
    const result = await agent.execute({ input: 'Hello World' })
    
    expect(result.success).toBe(true)
    expect(result.result).toBe('Echo: Hello World')
    expect(result.metadata?.tokensUsed).toBe(10)
    expect(result.metadata?.modelUsed).toBe('gpt-4o-mini')
    expect(result.metadata?.executionTime).toBe(50)
  })

  it('should handle empty input', async () => {
    const agent = new EchoAgent()
    const result = await agent.execute({ input: '' })
    
    expect(result.success).toBe(true)
    expect(result.result).toBe('Echo: ')
  })

  it('should handle missing input', async () => {
    const agent = new EchoAgent()
    const result = await agent.execute({})
    
    expect(result.success).toBe(true)
    expect(result.result).toBe('Echo: ')
  })
})

describe('JobsExtractorAgent', () => {
  it('should extract and rank jobs from valid input', async () => {
    const agent = new JobsExtractorAgent()
    
    expect(agent.name).toBe('JobsExtractorAgent')
    expect(agent.purpose).toBe('Extract and rank jobs-to-be-done from raw feature input')
    expect(agent.model).toBe('gpt-4o-mini')
    expect(agent.maxTokens).toBe(500)

    // Mock the OpenAI API response
    const mockResponse = JSON.stringify({
      jobs: [
        { id: '1', description: 'Complete a task quickly', rank: 1 },
        { id: '2', description: 'Track progress visually', rank: 2 },
        { id: '3', description: 'Collaborate with team members', rank: 3 }
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 100 }
    })
    
    const result = await agent.execute({ input: 'Build a project management tool' })
    
    expect(result.success).toBe(true)
    expect(result.result.jobs).toHaveLength(3)
    expect(result.result.jobs[0].rank).toBe(1)
    expect(result.result.jobs[0].description).toBe('Complete a task quickly')
    expect(result.metadata?.tokensUsed).toBe(100)
  })

  it('should return empty array for empty input', async () => {
    const agent = new JobsExtractorAgent()
    
    // Mock empty response
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"jobs": []}' } }],
      usage: { total_tokens: 50 }
    })
    
    const result = await agent.execute({ input: '' })
    
    expect(result.success).toBe(true)
    expect(result.result.jobs).toHaveLength(0)
  })
})

describe('ScopeAnalyzerAgent', () => {
  it('should analyze scope from jobs and constraints', async () => {
    const agent = new ScopeAnalyzerAgent()
    
    expect(agent.name).toBe('ScopeAnalyzerAgent')
    expect(agent.purpose).toBe('Convert extracted jobs into clear in-scope/out-of-scope boundaries')
    expect(agent.model).toBe('gpt-4o-mini')
    expect(agent.maxTokens).toBe(600)

    // Mock the OpenAI API response
    const mockResponse = JSON.stringify({
      inScope: [
        'Core task management features',
        'Basic progress tracking',
        'Simple team collaboration'
      ],
      outOfScope: [
        'Advanced analytics',
        'Third-party integrations',
        'Mobile app development'
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 150 }
    })
    
    const result = await agent.execute({ 
      jobs: JSON.stringify([
        { id: '1', description: 'Complete tasks quickly', rank: 1 },
        { id: '2', description: 'Track progress visually', rank: 2 }
      ]),
      constraints: 'Limited development time, small team'
    })
    
    expect(result.success).toBe(true)
    expect(result.result.inScope).toHaveLength(3)
    expect(result.result.outOfScope).toHaveLength(3)
    expect(result.result.inScope[0]).toBe('Core task management features')
    expect(result.result.outOfScope[0]).toBe('Advanced analytics')
  })
})

describe('CompetitiveLandscaperAgent', () => {
  it('should analyze competitive landscape with deterministic mock response', async () => {
    const agent = new CompetitiveLandscaperAgent()
    
    expect(agent.name).toBe('CompetitiveLandscaperAgent')
    expect(agent.purpose).toBe('Analyze competitive landscape and differentiation')
    expect(agent.model).toBe('gpt-4o')
    expect(agent.maxTokens).toBe(800)

    // Mock deterministic LLM response
    const mockResponse = JSON.stringify({
      competitors: [
        {
          name: 'Asana',
          summary: 'Task management with team collaboration features and project templates',
          ourEdge: 'More intuitive user experience with AI-powered task prioritization'
        },
        {
          name: 'Trello',
          summary: 'Kanban-style boards for visual project management',
          ourEdge: 'Advanced analytics and automated workflow suggestions'
        },
        {
          name: 'Monday.com',
          summary: 'Customizable work operating system with multiple project views',
          ourEdge: 'Simpler setup process and better integration with existing tools'
        }
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 200 }
    })
    
    const result = await agent.execute({ 
      jobs: JSON.stringify([
        { id: '1', description: 'Manage tasks efficiently', rank: 1 },
        { id: '2', description: 'Collaborate with team members', rank: 2 }
      ])
    })
    
    expect(result.success).toBe(true)
    expect(result.result.competitors).toHaveLength(3)
    expect(result.result.competitors[0].name).toBe('Asana')
    expect(result.result.competitors[0].summary).toContain('Task management')
    expect(result.result.competitors[0].ourEdge).toContain('AI-powered')
    expect(result.metadata?.tokensUsed).toBe(200)
  })
})

describe('RoadmapPositionerAgent', () => {
  it('should position feature in roadmap with valid quarter', async () => {
    const agent = new RoadmapPositionerAgent()
    
    expect(agent.name).toBe('RoadmapPositionerAgent')
    expect(agent.purpose).toBe('Position feature within existing roadmap and strategy')
    expect(agent.model).toBe('gpt-4o')
    expect(agent.maxTokens).toBe(700)

    // Mock response with valid quarter
    const mockResponse = JSON.stringify({
      quarter: 'Q3',
      rationale: 'This feature aligns with our H2 user experience improvements and can be developed after the core platform is stable in Q2',
      conflicts: [
        'May compete for design resources with mobile app redesign',
        'Requires API changes that could impact Q4 integrations'
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 180 }
    })
    
    const result = await agent.execute({ 
      currentRoadmap: JSON.stringify([
        'Q1: Core platform MVP',
        'Q2: User authentication and onboarding',
        'Q3: Advanced features and integrations',
        'Q4: Mobile app and enterprise features'
      ]),
      featureIdea: 'Advanced analytics dashboard'
    })
    
    expect(result.success).toBe(true)
    expect(['Q1', 'Q2', 'Q3', 'Q4']).toContain(result.result.quarter)
    expect(result.result.quarter).toBe('Q3')
    expect(result.result.rationale).toContain('H2 user experience')
    expect(result.result.conflicts).toHaveLength(2)
    expect(result.result.conflicts[0]).toContain('design resources')
  })

  it('should default to Q2 for invalid quarter', async () => {
    const agent = new RoadmapPositionerAgent()

    // Mock response with invalid quarter
    const mockResponse = JSON.stringify({
      quarter: 'INVALID',
      rationale: 'Some rationale',
      conflicts: []
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 100 }
    })
    
    const result = await agent.execute({ 
      currentRoadmap: JSON.stringify(['Q1: Test']),
      featureIdea: 'Test feature'
    })
    
    expect(result.success).toBe(true)
    expect(result.result.quarter).toBe('Q2')
    expect(['Q1', 'Q2', 'Q3', 'Q4']).toContain(result.result.quarter)
  })
})

describe('EngineeringEstimatorAgent', () => {
  it('should provide engineering estimates with positive integer story points', async () => {
    const agent = new EngineeringEstimatorAgent()
    
    expect(agent.name).toBe('EngineeringEstimatorAgent')
    expect(agent.purpose).toBe('Provide a first-pass effort estimate and resource needs')
    expect(agent.model).toBe('gpt-4o-mini')
    expect(agent.maxTokens).toBe(600)

    // Mock response with valid estimates
    const mockResponse = JSON.stringify({
      storyPoints: 21,
      rolesNeeded: [
        'Frontend Developer',
        'Backend Developer',
        'UI/UX Designer',
        'QA Engineer'
      ],
      risks: [
        'Third-party API integration complexity',
        'Performance optimization for large datasets',
        'Cross-browser compatibility challenges'
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 160 }
    })
    
    const result = await agent.execute({ 
      scope: JSON.stringify({
        inScope: ['User dashboard', 'Data visualization', 'Export functionality'],
        outOfScope: ['Mobile app', 'Advanced analytics']
      }),
      teamStructure: 'Small team: 2 developers, 1 designer, 1 PM'
    })
    
    expect(result.success).toBe(true)
    expect(result.result.storyPoints).toBe(21)
    expect(typeof result.result.storyPoints).toBe('number')
    expect(result.result.storyPoints).toBeGreaterThan(0)
    expect(Number.isInteger(result.result.storyPoints)).toBe(true)
    expect(result.result.rolesNeeded).toHaveLength(4)
    expect(result.result.rolesNeeded).toContain('Frontend Developer')
    expect(result.result.risks).toHaveLength(3)
    expect(result.result.risks[0]).toContain('Third-party API')
  })

  it('should handle invalid story points by defaulting to positive integer', async () => {
    const agent = new EngineeringEstimatorAgent()

    // Mock response with invalid story points
    const mockResponse = JSON.stringify({
      storyPoints: -5,
      rolesNeeded: ['Developer'],
      risks: []
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 80 }
    })
    
    const result = await agent.execute({ 
      scope: JSON.stringify({ inScope: ['Simple feature'] }),
      teamStructure: '1 developer'
    })
    
    expect(result.success).toBe(true)
    expect(result.result.storyPoints).toBeGreaterThan(0)
    expect(Number.isInteger(result.result.storyPoints)).toBe(true)
  })
})

describe('Agent Integration', () => {
  it('should chain jobsExtractor output into scopeAnalyzer input', async () => {
    const jobsAgent = new JobsExtractorAgent()
    const scopeAgent = new ScopeAnalyzerAgent()

    // Mock jobsExtractor response
    const jobsResponse = JSON.stringify({
      jobs: [
        { id: '1', description: 'Manage tasks efficiently', rank: 1 },
        { id: '2', description: 'Collaborate with team', rank: 2 },
        { id: '3', description: 'Track project progress', rank: 3 }
      ]
    })

    // Mock scopeAnalyzer response
    const scopeResponse = JSON.stringify({
      inScope: [
        'Task creation and editing',
        'Basic team messaging',
        'Progress visualization'
      ],
      outOfScope: [
        'Advanced reporting',
        'External integrations'
      ]
    })

    // First call for jobsExtractor
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: jobsResponse } }],
      usage: { total_tokens: 100 }
    })

    // Second call for scopeAnalyzer
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: scopeResponse } }],
      usage: { total_tokens: 120 }
    })

    // Execute jobsExtractor
    const jobsResult = await jobsAgent.execute({ input: 'Build a project management tool' })
    
    expect(jobsResult.success).toBe(true)
    expect(jobsResult.result.jobs).toHaveLength(3)

    // Execute scopeAnalyzer with jobs result
    const scopeResult = await scopeAgent.execute({
      jobs: JSON.stringify(jobsResult.result.jobs),
      constraints: 'Small team, 6-week timeline'
    })

    expect(scopeResult.success).toBe(true)
    expect(scopeResult.result.inScope.length).toBeGreaterThan(0)
    expect(scopeResult.result.outOfScope.length).toBeGreaterThan(0)
    expect(scopeResult.result.inScope).toContain('Task creation and editing')
    expect(scopeResult.result.outOfScope).toContain('Advanced reporting')
  })
})

describe('PRDWriterAgent', () => {
  it('should generate PRD sections with o3 model', async () => {
    const agent = new PRDWriterAgent()
    
    expect(agent.name).toBe('PRDWriterAgent')
    expect(agent.purpose).toBe('Write specific sections of PRD with full context')
    expect(agent.model).toBe('o3')
    expect(agent.maxTokens).toBe(1200)

    // Mock a long, detailed PRD section response
    const mockContent = `# Executive Summary

## Overview
This Product Requirements Document outlines the development of a comprehensive task management system designed to streamline workflow organization and enhance team productivity. The system addresses critical user needs for efficient task creation, progress tracking, and collaborative project management.

## Strategic Rationale
Based on competitive analysis, our solution differentiates through intuitive user experience and AI-powered task prioritization, providing significant advantages over existing solutions like Asana and Trello. The system aligns with Q2 development goals and represents a strategic investment in user productivity tools.

## Key Benefits
- Streamlined task creation and management workflows
- Enhanced visibility into project progress and bottlenecks
- Improved team collaboration and communication
- Reduced time spent on administrative overhead
- Scalable architecture supporting future feature expansion

This initiative supports our broader product strategy of building comprehensive productivity solutions that empower teams to achieve their goals more effectively.`

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockContent } }],
      usage: { total_tokens: 250 }
    })
    
    const result = await agent.execute({ 
      sectionName: 'executive_summary',
      context: JSON.stringify({
        jobs: { jobs: [{ id: '1', description: 'Manage tasks efficiently', rank: 1 }] },
        competitive: { competitors: [{ name: 'Asana', summary: 'Task management', ourEdge: 'Better UX' }] }
      })
    })
    
    expect(result.success).toBe(true)
    expect(result.result.sectionName).toBe('executive_summary')
    expect(result.result.content.length).toBeGreaterThan(200)
    expect(result.result.content).toContain('Executive Summary')
    expect(result.result.content).toContain('task management system')
  })
})

describe('PRD Section Generation', () => {
  it('should generate sections with content > 200 characters', async () => {
    const orchestrator = new PRDOrchestrator()

    // Create a mock analysis bundle
    const analysisBundle = {
      jobs: { jobs: [{ id: '1', description: 'Manage tasks efficiently', rank: 1 }] },
      scope: { inScope: ['Task creation'], outOfScope: ['Mobile app'] },
      competitive: { competitors: [{ name: 'Asana', summary: 'Task management', ourEdge: 'Better UX' }] },
      roadmap: { quarter: 'Q2', rationale: 'Strategic fit', conflicts: [] },
      engineering: { storyPoints: 13, rolesNeeded: ['Developer'], risks: ['Complexity'] }
    }

    // Mock responses for both sections
    const executiveSummaryContent = `# Executive Summary

## Overview
This comprehensive task management system addresses critical workflow organization needs through intuitive design and powerful automation capabilities. Our solution provides significant competitive advantages through AI-powered prioritization and streamlined user experience.

## Strategic Value
The system supports Q2 strategic objectives while differentiating from competitors like Asana through superior user experience and intelligent task management features. This initiative represents a key investment in productivity infrastructure.

## Implementation Approach  
Development will focus on core task management capabilities with emphasis on user experience and system reliability. The phased rollout ensures maximum value delivery while minimizing implementation risks.`

    const problemStatementContent = `# Problem Statement

## Core Challenge
Teams struggle with inefficient task management processes that create bottlenecks and reduce overall productivity. Current solutions lack the intuitive design and intelligent automation needed for optimal workflow management.

## User Pain Points
- Manual task prioritization consumes valuable time and mental energy
- Limited visibility into project progress creates coordination challenges
- Existing tools require extensive configuration and training
- Poor integration between planning and execution phases
- Difficulty tracking individual and team performance metrics

## Business Impact
These workflow inefficiencies result in decreased team productivity, missed deadlines, and reduced overall project success rates. Organizations need comprehensive solutions that streamline task management while providing intelligent automation and clear progress visibility.

## Success Criteria
The solution must reduce task management overhead by 40% while improving project completion rates and team collaboration effectiveness.`

    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: executiveSummaryContent } }],
        usage: { total_tokens: 200 }
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: problemStatementContent } }],
        usage: { total_tokens: 250 }
      })

    const sections = await orchestrator.generateSections(analysisBundle)

    expect(sections).toHaveLength(2)
    
    // Verify executive_summary section
    const execSummary = sections.find(s => s.sectionName === 'executive_summary')
    expect(execSummary).toBeDefined()
    expect(execSummary!.content.length).toBeGreaterThan(200)
    expect(execSummary!.content).toContain('Executive Summary')

    // Verify problem_statement section  
    const problemStatement = sections.find(s => s.sectionName === 'problem_statement')
    expect(problemStatement).toBeDefined()
    expect(problemStatement!.content.length).toBeGreaterThan(200)
    expect(problemStatement!.content).toContain('Problem Statement')
  })
})

describe('ModelSelector', () => {
  it('should select gpt-4o-mini for extraction tasks', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o', { type: 'extraction' })
    expect(result).toBe('gpt-4o-mini')
  })

  it('should select gpt-4o-mini for classification tasks', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o', { type: 'classification' })
    expect(result).toBe('gpt-4o-mini')
  })

  it('should select gpt-4o-mini for analysis tasks with complexity < 0.7', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o', { 
      type: 'analysis', 
      criticality: 0.3,
      contextSize: 1000 
    })
    expect(result).toBe('gpt-4o-mini')
  })

  it('should select gpt-4o for analysis tasks with complexity >= 0.7', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o-mini', { 
      type: 'analysis', 
      criticality: 0.8,
      contextSize: 3000
    })
    expect(result).toBe('gpt-4o')
  })

  it('should select gpt-4o for synthesis tasks', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o-mini', { type: 'synthesis' })
    expect(result).toBe('gpt-4o')
  })

  it('should select o3 for generation tasks with high criticality', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o', { 
      type: 'generation', 
      criticality: 0.9 
    })
    expect(result).toBe('o3')
  })

  it('should select gpt-4o for generation tasks with low criticality', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o-mini', { 
      type: 'generation', 
      criticality: 0.5 
    })
    expect(result).toBe('gpt-4o')
  })

  it('should fall back to model hint when no task provided', () => {
    const selector = new ModelSelector()
    
    const result = selector.select('gpt-4o-mini')
    expect(result).toBe('gpt-4o-mini')
  })

  it('should assess complexity correctly', () => {
    const selector = new ModelSelector()
    
    // Simple extraction task
    const simpleComplexity = selector.assessComplexity({ type: 'extraction' })
    expect(simpleComplexity).toBeLessThan(0.5)
    
    // Complex generation task
    const complexComplexity = selector.assessComplexity({ 
      type: 'generation',
      criticality: 0.9,
      contextSize: 6000,
      outputComplexity: 0.8
    })
    expect(complexComplexity).toBeGreaterThan(0.8)
  })
})

describe('PRDOrchestrator', () => {
  it('should generate analysis bundle with all required keys', async () => {
    const orchestrator = new PRDOrchestrator()

    // Mock responses for all 5 agents in order of execution
    // Phase 1 parallel: jobsExtractor, competitiveLandscaper, roadmapPositioner
    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          jobs: [
            { id: '1', description: 'Create tasks efficiently', rank: 1 },
            { id: '2', description: 'Track progress visually', rank: 2 }
          ]
        }) } }],
        usage: { total_tokens: 100 }
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          competitors: [
            { name: 'Asana', summary: 'Task management platform', ourEdge: 'Better UX' },
            { name: 'Trello', summary: 'Kanban boards', ourEdge: 'More features' }
          ]
        }) } }],
        usage: { total_tokens: 150 }
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          quarter: 'Q2',
          rationale: 'Fits with Q2 development goals',
          conflicts: ['Resource conflict with project X']
        }) } }],
        usage: { total_tokens: 120 }
      })
      // Phase 2 sequential: scopeAnalyzer
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          inScope: ['Task creation', 'Basic tracking'],
          outOfScope: ['Advanced analytics', 'Mobile app']
        }) } }],
        usage: { total_tokens: 130 }
      })
      // Phase 3 sequential: engineeringEstimator  
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          storyPoints: 13,
          rolesNeeded: ['Frontend Dev', 'Backend Dev'],
          risks: ['API complexity', 'Browser compatibility']
        }) } }],
        usage: { total_tokens: 140 }
      })

    const result = await orchestrator.generateAnalysisBundle(
      'Build a task management system',
      {
        id: 1,
        user_email: 'test@example.com',
        vocabulary_glossary: {},
        decision_frameworks: { frameworks: [], approaches: [] },
        trade_off_preferences: { speedVsQuality: 'balanced', riskTolerance: 'medium', userFocus: 'external' },
        recurring_themes: [],
        domain_expertise: [],
        personal_context: {
          teamStrategy: 'Agile development with 2-week sprints'
        },
        total_sessions: 0,
        total_vocabulary_terms: 0,
        total_questions_answered: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    )

    // Verify all required keys exist
    expect(result).toHaveProperty('jobs')
    expect(result).toHaveProperty('scope')
    expect(result).toHaveProperty('competitive')
    expect(result).toHaveProperty('roadmap')
    expect(result).toHaveProperty('engineering')

    // Verify structure of each analysis result
    expect(result.jobs.jobs).toHaveLength(2)
    expect(result.scope.inScope).toHaveLength(2)
    expect(result.scope.outOfScope).toHaveLength(2)
    expect(result.competitive.competitors).toHaveLength(2)
    expect(result.roadmap.quarter).toBe('Q2')
    expect(result.engineering.storyPoints).toBe(13)
    expect(result.engineering.rolesNeeded).toHaveLength(2)
  })
})

describe('OutcomeAnalyzerAgent', () => {
  it('should analyze PRD outcomes and extract learnings', async () => {
    const agent = new OutcomeAnalyzerAgent()
    
    expect(agent.name).toBe('OutcomeAnalyzerAgent')
    expect(agent.purpose).toBe('Analyze PRD outcomes and extract learnings for continuous improvement')
    expect(agent.model).toBe('gpt-4o')
    expect(agent.maxTokens).toBe(1000)

    // Mock outcome analysis response
    const mockResponse = JSON.stringify({
      whatWorked: [
        'Clear job-to-be-done statements helped engineering understand requirements',
        'Competitive analysis provided good differentiation insights',
        'Engineering estimates were accurate within 20%'
      ],
      whatFailed: [
        'Scope definition was too broad, leading to feature creep',
        'Timeline assumptions were unrealistic for team size'
      ],
      agentTweaks: [
        'Improve scopeAnalyzer to be more restrictive with feature inclusion',
        'Add team capacity validation to engineeringEstimator',
        'Include risk assessment in roadmapPositioner'
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 300 }
    })
    
    const result = await agent.execute({ 
      prd: 'Sample PRD content about task management system...',
      feedback: 'Engineering found the requirements clear but timeline was tight',
      velocity: JSON.stringify({ estimated: 21, actual: 28 }),
      adoption: JSON.stringify({ targetUsers: 1000, actualUsers: 750 })
    })
    
    expect(result.success).toBe(true)
    expect(result.result.whatWorked).toHaveLength(3)
    expect(result.result.whatFailed).toHaveLength(2)
    expect(result.result.agentTweaks).toHaveLength(3)
    expect(result.result.whatWorked[0]).toContain('job-to-be-done')
    expect(result.result.whatFailed[0]).toContain('Scope definition')
    expect(result.result.agentTweaks[0]).toContain('scopeAnalyzer')
  })
})

describe('LearningSystem', () => {
  it('should analyze outcome and confirm profile updating', async () => {
    const learningSystem = new LearningSystem()

    // Mock outcome analyzer response
    const mockResponse = JSON.stringify({
      whatWorked: [
        'Detailed user personas led to better feature prioritization',
        'Clear success metrics helped track progress effectively'
      ],
      whatFailed: [
        'Underestimated integration complexity with existing systems'
      ],
      agentTweaks: [
        'Add integration complexity assessment to engineeringEstimator',
        'Include persona validation in jobsExtractor'
      ]
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockResponse } }],
      usage: { total_tokens: 250 }
    })

    const dummyOutcome = {
      prd: 'Sample PRD for user dashboard feature with personas and metrics...',
      feedback: 'Implementation went well but integration took longer than expected',
      velocity: { estimated: 15, actual: 18 },
      adoption: { targetUsers: 500, actualUsers: 420 }
    }

    const result = await learningSystem.analyzeOutcome('prd-123', dummyOutcome)

    expect(result.prdId).toBe('prd-123')
    expect(result.profileUpdated).toBe(true)
    expect(result.analysisResult.whatWorked).toHaveLength(2)
    expect(result.analysisResult.whatFailed).toHaveLength(1)
    expect(result.analysisResult.agentTweaks).toHaveLength(2)
    expect(result.analysisResult.whatWorked[0]).toContain('personas')
    expect(result.analysisResult.agentTweaks[0]).toContain('integration complexity')
  })

  it('should update PM profile with learnings', async () => {
    const learningSystem = new LearningSystem()

    const mockProfile = {
      id: 1,
      user_email: 'pm@example.com',
      vocabulary_glossary: {},
      decision_frameworks: { frameworks: [], approaches: [] },
      trade_off_preferences: { speedVsQuality: 'balanced', riskTolerance: 'medium', userFocus: 'external' },
      recurring_themes: ['User-centered design'],
      domain_expertise: ['B2B SaaS'],
      total_sessions: 5,
      total_vocabulary_terms: 10,
      total_questions_answered: 25,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    } as any

    const learnings = {
      whatWorked: ['Clear acceptance criteria', 'Regular stakeholder check-ins'],
      whatFailed: ['Insufficient user research', 'Unrealistic timeline']
    }

    const updatedProfile = await learningSystem.updatePMProfile(mockProfile, learnings)

    expect(updatedProfile.recurring_themes).toContain('User-centered design')
    expect(updatedProfile.recurring_themes).toContain('Clear acceptance criteria')
    expect(updatedProfile.recurring_themes).toContain('Regular stakeholder check-ins')
    expect(updatedProfile.updated_at).not.toBe('2024-01-01') // Should be updated
  })
})