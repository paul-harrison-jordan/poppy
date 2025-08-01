# Roadmap Feature Setup Checklist

## Database Migrations Required

Run the following SQL commands in your Supabase SQL editor:

### 1. Add New Columns to PRDs Table

```sql
-- Add roadmap functionality columns
ALTER TABLE prds 
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS estimated_weeks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_engineer TEXT;
```

### 2. Add Phase Completion Tracking

```sql
-- Add completion tracking to phases
ALTER TABLE prd_phases 
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;
```

### 3. Create Performance Indexes

```sql
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prds_release_date ON prds(release_date);
CREATE INDEX IF NOT EXISTS idx_prds_assigned_engineer ON prds(assigned_engineer);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);
CREATE INDEX IF NOT EXISTS idx_prd_phases_is_complete ON prd_phases(is_complete);
```

### 4. Clean Up Any Existing Data

```sql
-- Ensure consistent NULL handling
UPDATE prds SET assigned_engineer = NULL WHERE assigned_engineer = '';
```

## Verification Queries

Run these to verify everything is working:

```sql
-- Check PRDs table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prds' 
AND column_name IN ('release_date', 'estimated_weeks', 'assigned_engineer');

-- Check prd_phases table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prd_phases' 
AND column_name = 'is_complete';

-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('prds', 'prd_phases') 
AND indexname LIKE 'idx_%';
```

## Features Now Available

✅ **Feature Detail Page:**
- Release date picker
- Estimated weeks input  
- Engineer assignment dropdown
- Inline phase editing
- Add/delete phases
- Automatic status calculation

✅ **Roadmap Page:**
- Simplified, clean design
- "Shipping Soon" section
- Enhanced feature cards with engineer assignments
- Improved drag-and-drop priority ordering
- Better progress tracking

✅ **Status Logic:**
- "Planning" = No engineer assigned
- "Ready" = Engineer assigned, no dates set  
- "In Progress" = Within estimated work window

## API Endpoints Updated

- `PATCH /api/roadmap/prd/[id]` - Update roadmap details
- `POST /api/roadmap/prd/[id]/phases` - Create phases  
- `PATCH /api/roadmap/prd/[id]/phases/[phaseId]` - Update phases
- `DELETE /api/roadmap/prd/[id]/phases/[phaseId]` - Delete phases

All endpoints properly handle the new roadmap fields and phase completion tracking.