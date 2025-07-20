export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  created_at: string;
  resolved: boolean;
}

export interface Prd {
  id?: string;
  title?: string;
  metadata?: {
    comments?: Comment[];
    open_questions_summary?: string;
  };
}