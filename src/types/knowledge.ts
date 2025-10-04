// Context data interfaces for better typing
export interface SessionContextData {
  [key: string]: string | number | boolean | string[] | number[];
}

export interface ExtractedInsights {
  preferences: string[];
  patterns: string[];
  [key: string]: string | number | boolean | string[] | number[];
}

export interface DecisionFrameworks {
  frameworks: string[];
  approaches: string[];
  [key: string]: string | number | boolean | string[] | number[];
}

export interface TradeOffPreferences {
  speedVsQuality: 'speed' | 'quality' | 'balanced';
  riskTolerance: 'low' | 'medium' | 'high';
  userFocus: 'internal' | 'external' | 'balanced';
  [key: string]: string | number | boolean | string[] | number[];
}

export interface PersonalContext {
  examplesOfHowYouThink?: string[];
  teamStrategy?: string;
  productVision?: string;
  productAreaPersonas?: ProductAreaPersonas;
  [key: string]: string | number | boolean | string[] | number[] | ProductAreaPersonas | undefined;
}

export interface ProductAreaPersonas {
  customerFacing?: string; // e.g., segment builder persona
  customerImpacting?: string; // e.g., campaign sender persona
  infrastructure?: string; // e.g., internal databases persona
}

export type ProductArea = 'customerFacing' | 'customerImpacting' | 'infrastructure';

export interface MetricContextData {
  sessionType?: string;
  completionRate?: number;
  engagement?: number;
  [key: string]: string | number | boolean | string[] | number[] | undefined;
}

export interface QuestionContextData {
  previousAnswers?: string[];
  relatedTopics?: string[];
  difficultyLevel?: number;
  [key: string]: string | number | boolean | string[] | number[] | undefined;
}

export interface UserKnowledgeSession {
  id: number;
  user_email: string;
  session_type: 'vocabulary' | 'questions' | 'brainstorm' | 'prd_generation';
  context_data?: SessionContextData;
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
  context_data?: QuestionContextData;
  extracted_insights?: ExtractedInsights; // AI-extracted preferences and patterns
  created_at: string;
  updated_at: string;
}

export interface PMPreferenceProfile {
  id: number;
  user_email: string;
  vocabulary_glossary: Record<string, string>; // term -> definition mapping
  decision_frameworks: DecisionFrameworks; // extracted mental models
  trade_off_preferences: TradeOffPreferences; // preference patterns (speed vs quality, etc)
  product_philosophy?: string; // overall product approach summary
  recurring_themes: string[]; // common themes across decisions
  domain_expertise: string[]; // areas of focus/expertise
  personal_context?: PersonalContext; // PRD writing context (examplesOfHowYouThink, teamStrategy, etc)
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
  context_data?: MetricContextData;
  date_recorded: string;
  created_at: string;
}

// API request/response types
export interface CreateSessionRequest {
  session_type: UserKnowledgeSession['session_type'];
  context_data?: SessionContextData;
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
  context_data?: QuestionContextData;
}

export interface UpdateSessionRequest {
  duration_seconds?: number;
  completion_status?: UserKnowledgeSession['completion_status'];
  context_data?: SessionContextData;
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

// Vocabulary interaction tracking
export interface VocabularyInteraction {
  id: number;
  session_id: number;
  user_email: string;
  term: string;
  user_definition: string;
  review_count: number;
  last_reviewed?: string;
  next_review_date?: string;
  confidence_level?: number;
  created_at: string;
  updated_at: string;
}

// Knowledge summary for analytics
export interface KnowledgeSummary {
  id: number;
  user_email: string;
  total_vocabulary_terms: number;
  total_questions_answered: number;
  total_sessions: number;
  knowledge_areas: string[];
  recent_activity_summary: string;
  created_at: string;
  updated_at: string;
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

// Batch PRD Types
export interface BatchPRDSession {
  id: string;
  user_email: string;
  features: FeatureInput[];
  status: 'defining_jtbd' | 'generating' | 'reviewing' | 'approved' | 'generating_prds' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface FeatureInput {
  id: string;
  name: string;
  jtbd: string;
  productArea: ProductArea;
  appliedPersonas: string[];
}

export interface ProposedTerm {
  term: string;
  definition: string;
  source: string;
  confidence: number;
  approved?: boolean;
  edited?: boolean;
}

export interface ProposedQuestionAnswer {
  question: string;
  answer: string;
  reasoning: string;
  sources: string[];
  confidence: number;
  approved?: boolean;
  edited?: boolean;
}

export interface ProposedContent {
  featureId: string;
  terms: ProposedTerm[];
  questionAnswers: ProposedQuestionAnswer[];
  generatedAt: string;
}

export interface BatchReviewData {
  sessionId: string;
  proposedContent: ProposedContent[];
  status: 'pending_review' | 'reviewed' | 'approved';
}