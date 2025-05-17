export interface Prd {
  id: string
  title: string
  status: 'Draft' | 'Review' | 'Final'
  due_date?: string | null
  owner_id: string
  created_at: string
  last_edited_at?: string
  metadata?: PrdMetadata
  url?: string
}

export interface PrdMetadata {
  comments: Comment[]
  edit_history: Edit[]
  open_questions_summary?: string
}

export interface Comment {
  id: string
  prd_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  resolved: boolean
}

export interface Edit {
  id: string
  prd_id: string
  user_id: string
  user_name: string
  timestamp: string
  section: string
  change_type: 'add' | 'modify' | 'delete'
}

export interface Reviewer {
  id: string
  prd_id: string
  user_id: string
  user_name: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface Task {
  id: string
  prd_id: string
  title: string
  is_done: boolean
  sort_order: number
}
