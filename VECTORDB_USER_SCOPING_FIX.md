# Vector Database User Scoping - Critical Fix

## Problem Identified ⚠️

The current Garden Mode V2 implementation has a **critical privacy and personalization flaw**:

### Issues:
1. **No User Context**: VectorDB queries search across ALL users' data
2. **Privacy Violation**: Users can see each other's PRDs and knowledge sessions  
3. **No Personalization**: System can't learn from individual user patterns
4. **Cross-contamination**: User A's PRDs influence User B's suggestions

## Root Cause
```typescript
// ❌ WRONG: Global search across all users
const { data: prds } = await supabase.rpc('match_documents', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 5,
  filter: { type: 'prd' }  // No user filtering!
});
```

## Solution Implemented ✅

### 1. Updated Orchestrator Methods
- Added `userEmail` parameter to all vectorDB operations
- User-scoped queries only return that user's documents
- Graceful fallback when no user email provided

### 2. Enhanced API Route
```typescript
// ✅ CORRECT: Get user session
const session = await getServerSession(authOptions);
const userEmail = session?.user?.email;

// Pass to orchestrator
GardenOrchestratorV2.streamWorkflow({...}, userEmail)
```

### 3. New Database Functions
Created `match_user_documents()` function that enforces user scoping:

```sql
-- ✅ User-scoped search
SELECT * FROM match_user_documents(
  embedding,
  threshold,
  limit,
  'user@company.com',  -- Only this user's docs
  'prd'
);
```

### 4. Database Schema Updates
- Added `user_email` column to documents table
- Created indexes for efficient user-scoped queries  
- Added Row Level Security (RLS) policies
- Created team-sharing functions for collaboration

## How It Now Works

### User Journey:
1. **User A** creates PRD about "email deliverability"
2. **System** stores it with `user_email: 'userA@klaviyo.com'`
3. **User B** asks about "email deliverability" 
4. **System** only searches User B's documents
5. **User A's PRD** is invisible to User B

### Benefits:
- **Privacy**: Each user's data stays private
- **Personalization**: System learns individual patterns
- **Quality**: Suggestions based on user's own context
- **Compliance**: Proper data isolation

## Migration Steps Required

### 1. Run Database Migration
```bash
psql -d your_database -f user-scoped-vectordb-migration.sql
```

### 2. Handle Existing Documents
```sql
-- Assign existing documents to appropriate users
-- (Run carefully - this is destructive!)
UPDATE documents 
SET user_email = 'admin@klaviyo.com' 
WHERE user_email IS NULL;
```

### 3. Test User Scoping
1. Create PRDs with different user accounts
2. Verify each user only sees their own documents
3. Check vectorDB search results are user-scoped

## Team Sharing (Optional Enhancement)

For teams that want to share knowledge:

```typescript
// Search team documents (same email domain)
const { data: teamDocs } = await supabase.rpc('match_team_documents', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 5,
  user_email: 'user@klaviyo.com',
  team_domain: 'klaviyo.com'  // Share within company
});
```

## Security Considerations

### Row Level Security
- Enabled RLS on documents table
- Users can only access documents where `user_email = current_user`
- Additional protection beyond application logic

### Sharing Controls
- Documents have `sharing_preferences` metadata
- Control team vs private document sharing
- Audit trail of document access

## Testing Checklist

- [ ] User A's PRDs don't appear in User B's searches
- [ ] Knowledge sessions are user-scoped
- [ ] Document storage includes user_email
- [ ] API passes correct user session
- [ ] Error handling for missing user context
- [ ] Team sharing works correctly (if enabled)

## Performance Impact

### Positive:
- Smaller search space = faster queries
- Better index utilization with user filtering
- More relevant results = better quality

### Monitoring:
- Query performance with user filtering
- Index efficiency on `user_email` column
- Cache hit rates for user-specific queries

## Rollback Plan

If issues arise:
1. Revert API changes to remove userEmail parameter
2. Use original `match_documents` function temporarily  
3. Disable RLS policies
4. Investigate and fix issues
5. Re-enable user scoping

## Next Steps

1. **Immediate**: Run database migration
2. **Test**: Verify user isolation works
3. **Monitor**: Check performance and query patterns
4. **Enhance**: Add team sharing if needed
5. **Document**: Update API documentation

This fix transforms Garden Mode from a global system to a personalized, privacy-respecting tool that learns from each user's unique patterns and context.