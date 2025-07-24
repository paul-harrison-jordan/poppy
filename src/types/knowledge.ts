export interface UserKnowledgeSession {
  id: number;
  user_email: string;
  session_type: 'vocabulary' | 'questions' | 'brainstorm' | 'prd_generation';
  context_data?: Record<string, any>;
  duration_seconds?: number;
  completion_status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface VocabularyDefinition {
  id: number;
  session_id: number;
  user_email: string;
  term: string;
  user_definition: string;
  domain_tags?: string[];
  usage_context?: string;
  related_terms?: string[];
  created_at: string;
  updated_at: string;
}

export interface QuestionResponse {
  id: number;
  session_id: number;
  user_email: string;
  question_text: string;
  question_reasoning?: string;
  user_answer: string;
  domain_category?: string;
  context_data?: Record<string, any>;
  extracted_insights?: Record<string, any>; // AI-extracted preferences and patterns
  created_at: string;
  updated_at: string;
}

export interface PMPreferenceProfile {
  id: number;
  user_email: string;
  vocabulary_glossary: Record<string, string>; // term -> definition mapping
  decision_frameworks: Record<string, any>; // extracted mental models
  trade_off_preferences: Record<string, any>; // preference patterns (speed vs quality, etc)
  product_philosophy?: string; // overall product approach summary
  recurring_themes: string[]; // common themes across decisions
  domain_expertise: string[]; // areas of focus/expertise
  personal_context?: Record<string, any>; // PRD writing context (examplesOfHowYouThink, teamStrategy, etc)
  total_sessions: number;
  total_vocabulary_terms: number;
  total_questions_answered: number;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
}

export interface LearningAnalytics {
  id: number;
  user_email: string;
  metric_type: 'session_duration' | 'completion_rate' | 'knowledge_growth' | 'engagement_score';
  metric_value: number;
  context_data?: Record<string, any>;
  date_recorded: string;
  created_at: string;
}

// API request/response types
export interface CreateSessionRequest {
  session_type: UserKnowledgeSession['session_type'];
  context_data?: Record<string, any>;
}

export interface CreateSessionResponse {
  session: UserKnowledgeSession;
}

export interface RecordVocabularyDefinitionRequest {
  session_id: number;
  term: string;
  user_definition: string;
  domain_tags?: string[];
  usage_context?: string;
  related_terms?: string[];
}

export interface RecordQuestionResponseRequest {
  session_id: number;
  question_text: string;
  question_reasoning?: string;
  user_answer: string;
  domain_category?: string;
  context_data?: Record<string, any>;
}

export interface UpdateSessionRequest {
  duration_seconds?: number;
  completion_status?: UserKnowledgeSession['completion_status'];
  context_data?: Record<string, any>;
}

export interface GetPMProfileResponse {
  profile: PMPreferenceProfile;
  recent_sessions: UserKnowledgeSession[];
  vocabulary_glossary: VocabularyDefinition[];
}

// Enhanced types for existing question system
export interface EnhancedQuestion {
  id: string;
  text: string;
  reasoning?: string;
  domain_category?: string;
  complexity_level?: number;
}

export interface EnhancedQuestionContext {
  questions: EnhancedQuestion[];
  session_id?: number;
}

// PM-aware vocabulary generation  
export interface PMAwareVocabularyRequest {
  pm_profile?: PMPreferenceProfile;
  exclude_defined_terms?: boolean;
  focus_domains?: string[];
}

// PM-aware questioning types
export interface PMAwareQuestionRequest {
  pm_profile?: PMPreferenceProfile;
  explore_new_areas?: boolean;
  build_on_expertise?: boolean;
}

// PRD generation with PM preference integration
export interface PMAwarePRDRequest {
  pm_profile?: PMPreferenceProfile;
  use_pm_vocabulary?: boolean;
  apply_decision_frameworks?: boolean;
  incorporate_preferences?: boolean;
}

// Additional types for ChatInterface compatibility
export interface Question {
  id: string;
  text: string;
  reasoning: string;
}

export interface TeamTerm {
  id: string;
  term: string;
  definition: string;
}

export interface MatchedContext {
  metadata: {
    NPS_VERBATIM: string;
    NPS_SCORE_RAW: string;
    SURVEY_END_DATE: string;
    RECIPIENT_EMAIL: string;
    GMV: string;
    KLAVIYO_ACCOUNT_ID: string;
    row_number: number;
  };
}