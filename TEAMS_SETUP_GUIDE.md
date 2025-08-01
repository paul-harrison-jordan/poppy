# Teams Feature Implementation Guide

## Overview

This implementation adds a comprehensive Teams feature to Poppy that enables:
- **Team Structure Management**: Organize engineers into teams with roles
- **AI-Powered Assignment Suggestions**: Get intelligent engineer recommendations
- **Performance Tracking**: Track and analyze engineer performance over time
- **Integration with Existing Workflows**: Seamless integration with current PRD/feature system

## Database Setup

### 1. Run the Schema Migration

Execute the SQL in `create-teams-schema.sql` against your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# Copy the contents of create-teams-schema.sql into the SQL Editor

# Option 2: Via CLI (if you have Supabase CLI installed)
supabase db reset --db-url "your-database-url"
```

### 2. Verify Tables Created

The migration creates these tables:
- `teams` - Team definitions and settings
- `team_members` - Engineer assignments to teams with roles
- `team_performance_metrics` - Performance tracking data

## Features Implemented

### 1. Team Management
- **Create Teams**: Define teams with capacity and utilization targets
- **Manage Members**: Add/remove engineers with specific roles:
  - Engineering Manager
  - Designer  
  - Tech Lead
  - Engineer
- **Role-Based Organization**: Primary/secondary team assignments

### 2. Enhanced Assignment Workflow
- **AI Suggestions**: `/api/teams/suggest-engineers` provides intelligent recommendations based on:
  - Skill matching
  - Historical performance
  - Current capacity
  - Role suitability
- **Team-Aware Assignments**: Assignments now consider team structure

### 3. Performance Foundation
- **Metrics Tracking**: Record completion times, quality ratings, complexity
- **Skill Development**: Track technology usage and improvement areas
- **Historical Analysis**: Build data for future AI improvements

## API Endpoints

### Teams Management
- `GET /api/teams` - List all teams
- `POST /api/teams` - Create new team
- `GET /api/teams/[id]` - Get team details
- `PUT /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team

### Team Members
- `GET /api/teams/[id]/members` - List team members
- `POST /api/teams/[id]/members` - Add member to team
- `PUT /api/teams/[id]/members/[memberId]` - Update member
- `DELETE /api/teams/[id]/members/[memberId]` - Remove member

### AI & Performance
- `POST /api/teams/suggest-engineers` - Get AI engineer suggestions
- `GET /api/teams/performance` - Get performance metrics
- `POST /api/teams/performance` - Record performance data

## UI Components Added

### 1. Navigation
- Added "Teams" to sidebar (`/teams` route)
- Professional OS-style design consistency

### 2. Teams Dashboard (`/src/app/teams/page.tsx`)
- Grid view of all teams
- Member counts and capacity display
- Quick actions for adding members
- Empty state with call-to-action

### 3. Create Team Modal (`/src/components/CreateTeamModal.tsx`)
- Form for team creation
- Capacity and utilization defaults
- Validation and error handling

## Integration Points

### Current System Integration
- **Engineers Table**: Leverages existing engineer data
- **Feature Assignments**: Enhanced with team context
- **RLS Security**: All new tables follow existing Row Level Security patterns
- **Auth System**: Uses existing NextAuth session management

### Future Enhancements Ready
- **Assignment UI Updates**: Integrate AI suggestions into assignment flow
- **Performance Dashboard**: Visualize team and individual metrics
- **Capacity Planning**: Real-time availability tracking
- **Advanced AI**: Machine learning for even better suggestions

## Data Migration Strategy

### For Existing Engineers
The system gracefully handles existing engineers:
1. Engineers can be added to teams retroactively
2. Historical assignments remain intact
3. Performance tracking starts from implementation date

### Backward Compatibility
- All existing APIs continue to work
- Feature assignments work with or without team context
- Progressive enhancement approach

## Next Steps

### Immediate (Post-Implementation)
1. **Add Existing Engineers to Teams**
   - Use the Teams UI to organize current engineers
   - Assign appropriate roles

2. **Start Using AI Suggestions**
   - Integrate suggest-engineers API into assignment workflow
   - Customize scoring weights based on your needs

### Short Term (1-2 weeks)
1. **Performance Data Collection**
   - Begin recording performance metrics for new features
   - Retroactively add data for recently completed features

2. **UI Enhancements**
   - Add team member management modals
   - Integrate suggestions into existing assignment UI

### Long Term (1-2 months)
1. **Advanced Analytics**
   - Performance dashboards
   - Team capacity visualization
   - Skill gap analysis

2. **Machine Learning Improvements**
   - Train models on accumulated performance data
   - Advanced workload balancing algorithms

## Configuration Options

### Team Settings
- `default_capacity_hours_per_week`: Default weekly capacity (40 hours)
- `default_utilization_target`: Target utilization percentage (0.80)

### Performance Tracking
- `complexity_rating`: 1-5 scale for feature complexity
- `quality_rating`: 1-5 scale for delivery quality
- `primary_technologies`: Technologies used in the feature
- `skill_improvement_areas`: Skills the engineer developed

### AI Suggestion Scoring
Current weights (customizable in code):
- Skill Match: 40%
- Performance History: 30% 
- Capacity: 20%
- Role Suitability: 10%

## Troubleshooting

### Common Issues
1. **Database Migration Fails**
   - Ensure Supabase connection is active
   - Check for existing table conflicts
   - Verify RLS is enabled on your database

2. **API Authentication Errors**
   - Verify NextAuth is working correctly
   - Check session.user.email is populated
   - Ensure RLS policies are applied

3. **Empty Teams List**
   - Create your first team using the UI
   - Verify API endpoints return data in browser network tab
   - Check Supabase logs for errors

### Performance Considerations
- Database indexes are included in migration
- API responses include only necessary data
- Lazy loading implemented for large team lists

## Security Notes

- All APIs protected by session authentication
- RLS policies prevent cross-user data access
- Team member operations validate ownership
- Performance data is user-scoped

This implementation provides a solid foundation for team-based product management while maintaining compatibility with your existing Poppy workflows.