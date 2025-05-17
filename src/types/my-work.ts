export interface Prd {
  id: string
  title: string
  status: 'Draft' | 'Review' | 'Final'
  due_date?: string | null
  owner_id: string
  created_at: string
}

export interface Reviewer {
  prd_id: string
  user_id: string
  role: string
}

export interface Task {
  id: string
  prd_id: string
  title: string
  is_done: boolean
  sort_order: number
}
