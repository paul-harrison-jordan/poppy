// Testing mode configuration and dummy data
export const TESTING_MODE = process.env.NODE_ENV === 'development';

export const DUMMY_VOCABULARY = [
  {
    id: 'test-1',
    term: 'User Engagement',
    definition: 'The level of interaction and involvement users have with our product, measured through daily active users, session duration, and feature adoption rates.'
  },
  {
    id: 'test-2', 
    term: 'Conversion Funnel',
    definition: 'The step-by-step process users follow from initial awareness to becoming paying customers, including signup, onboarding, trial, and purchase stages.'
  },
  {
    id: 'test-3',
    term: 'Product-Market Fit',
    definition: 'The degree to which our product satisfies strong market demand, evidenced by sustainable growth, high retention, and positive user feedback.'
  },
  {
    id: 'test-4',
    term: 'Technical Debt',
    definition: 'The implied cost of future refactoring work required due to choosing quick solutions now instead of better approaches that would take longer.'
  },
  {
    id: 'test-5',
    term: 'MVP',
    definition: 'Minimum Viable Product - the version of a new product with enough features to attract early-adopter customers and validate product hypotheses.'
  }
];

export const DUMMY_QUESTIONS = [
  {
    id: 'test-q1',
    text: 'What is the primary user problem you are trying to solve with this product feature?',
    reasoning: 'Understanding the core problem ensures we build solutions that address real user pain points rather than perceived needs.'
  },
  {
    id: 'test-q2', 
    text: 'How will you measure the success of this feature after launch?',
    reasoning: 'Defining success metrics upfront helps ensure we can objectively evaluate feature performance and ROI.'
  },
  {
    id: 'test-q3',
    text: 'What are the main technical constraints or dependencies for implementing this feature?',
    reasoning: 'Identifying technical limitations early helps with realistic timeline planning and resource allocation.'
  },
  {
    id: 'test-q4',
    text: 'Which user segments will benefit most from this feature and why?',
    reasoning: 'Understanding target segments helps prioritize development effort and tailor the user experience appropriately.'
  },
  {
    id: 'test-q5',
    text: 'What alternative solutions did you consider and why did you choose this approach?',
    reasoning: 'Documenting alternative approaches shows thorough analysis and helps future teams understand decision rationale.'
  }
];

export const DUMMY_ANSWERS = {
  'test-q1': 'Users are struggling with inefficient workflow management, spending 2-3 hours daily on manual task coordination. This creates bottlenecks and reduces team productivity by an estimated 30%.',
  'test-q2': 'Success will be measured by: 1) 25% reduction in task coordination time, 2) 40% improvement in team productivity scores, 3) 80% user adoption within 3 months, 4) Net Promoter Score of 8+ for the feature.',
  'test-q3': 'Main constraints include: integration with existing Slack/Teams APIs, real-time synchronization requirements, database migration for legacy task data, and ensuring mobile app parity with web features.',
  'test-q4': 'Primary beneficiaries are mid-size teams (10-50 people) in tech companies who currently use multiple tools for project management. Secondary segment is remote-first companies needing better async coordination.',
  'test-q5': 'Considered: 1) Building Slack bot only (limited functionality), 2) Partnering with existing PM tools (dependency risk), 3) White-label solution (less control). Chose custom solution for better integration and user experience.'
};

export const DUMMY_TEAM_TERMS = {
  'test-t1': 'We define "user engagement" as daily active users who complete at least one meaningful action per session.',
  'test-t2': 'Our "conversion funnel" tracks users from signup through first paid invoice within 30 days.',
  'test-t3': 'For us, "product-market fit" means 80%+ of users would be very disappointed if we discontinued the product.',
  'test-t4': 'We consider "technical debt" any code that requires >2x normal development time for feature additions.',
  'test-t5': 'Our "MVP" standard is the minimum feature set that delivers core value and can generate meaningful user feedback.'
};

export const DUMMY_PRD_CONTENT = `# Smart Workflow Automation PRD

## Problem Statement
Teams waste 2-3 hours daily on manual task coordination, creating bottlenecks that reduce overall productivity by 30%. Current solutions are fragmented across multiple tools, making it difficult to maintain visibility and ensure accountability.

## Solution Overview
Build an intelligent workflow automation system that integrates with existing tools (Slack, Teams, Jira) to automatically coordinate tasks, send smart reminders, and provide real-time progress visibility.

## Target Users
- Primary: Mid-size teams (10-50 people) in tech companies
- Secondary: Remote-first companies needing better async coordination
- Tertiary: Project managers seeking unified dashboard views

## Key Features
1. **Smart Task Routing**: AI-powered assignment based on workload and expertise
2. **Automated Progress Tracking**: Real-time status updates across integrated tools
3. **Intelligent Reminders**: Context-aware notifications that don't create noise
4. **Unified Dashboard**: Single pane view of all team activities and blockers

## Success Metrics
- 25% reduction in task coordination time
- 40% improvement in team productivity scores  
- 80% user adoption within 3 months
- Net Promoter Score of 8+ for the feature

## Technical Requirements
- Integration with Slack/Teams APIs
- Real-time synchronization capabilities
- Database migration for legacy task data
- Mobile app parity with web features

## Timeline
- Phase 1 (MVP): Q1 2024 - Core automation + Slack integration
- Phase 2: Q2 2024 - Teams integration + mobile app
- Phase 3: Q3 2024 - AI-powered insights + advanced analytics`;

export const DUMMY_DESIGN_PROMPT = `Create a modern, intuitive workflow automation dashboard with the following requirements:

**Design System:**
- Use a clean, professional design language similar to Linear or Notion
- Primary colors: Blue (#0066CC) and neutral grays
- Typography: Inter or similar modern sans-serif
- Consistent 8px grid system

**Key Components:**
1. **Header Navigation**: Logo, search bar, user profile, notifications
2. **Sidebar Menu**: Dashboard, Tasks, Teams, Analytics, Settings
3. **Main Dashboard**: Task overview cards, progress charts, team activity feed
4. **Task Cards**: Status indicators, assignee avatars, due dates, priority levels
5. **Quick Actions**: Add task, create team, schedule meeting buttons

**Layout Requirements:**
- Responsive design (desktop-first, mobile-optimized)
- Left sidebar navigation (collapsible)
- Main content area with card-based layout
- Right panel for task details/notifications

**Interactive Elements:**
- Drag-and-drop task management
- Hover states for all clickable elements
- Loading states for async operations
- Empty states with helpful illustrations

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- High contrast mode compatibility
- Screen reader optimization

Please create a modern, user-friendly interface that feels familiar to users of tools like Asana, Monday.com, or Linear.`;

export function populateTestingData() {
  return {
    vocabulary: DUMMY_VOCABULARY,
    questions: DUMMY_QUESTIONS,
    answers: DUMMY_ANSWERS,
    teamTerms: DUMMY_TEAM_TERMS,
    prdContent: DUMMY_PRD_CONTENT,
    designPrompt: DUMMY_DESIGN_PROMPT
  };
}