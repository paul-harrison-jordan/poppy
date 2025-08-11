import { z } from 'zod';

// Base schemas
export const emailSchema = z.string().email();
export const nonEmptyStringSchema = z.string().min(1, 'Cannot be empty');
export const positiveIntSchema = z.number().int().positive();
export const optionalPositiveIntSchema = z.number().int().positive().optional();

// PMProfile schema
export const pmProfileSchema = z.object({
  product_philosophy: z.string().optional(),
  domain_expertise: z.array(z.string()).optional(),
  recurring_themes: z.array(z.string()).optional(),
  decision_frameworks: z.record(z.unknown()).optional(),
  trade_off_preferences: z.record(z.unknown()).optional(),
  vocabulary_glossary: z.record(z.string()).optional(),
  personal_context: z.object({
    teamStrategy: z.string().optional(),
    examplesOfHowYouThink: z.string().optional(),
    pillarGoalsKeyTermsBackground: z.string().optional(),
    howYouThinkAboutProduct: z.string().optional(),
  }).optional(),
}).optional();

// Question/Answer schemas
export const questionAnswerSchema = z.object({
  question: nonEmptyStringSchema,
  reasoning: z.string().optional(),
  answer: nonEmptyStringSchema,
});

export const questionSchema = z.object({
  id: z.string().optional(),
  text: nonEmptyStringSchema,
  reasoning: nonEmptyStringSchema,
});

// Message schemas
export const brainstormMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: nonEmptyStringSchema,
});

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: nonEmptyStringSchema,
});

// API Request schemas
export const generateContentRequestSchema = z.object({
  type: z.enum(['prd', 'brand-messaging']),
  title: nonEmptyStringSchema,
  query: nonEmptyStringSchema,
  questions: z.array(z.string()),
  questionAnswers: z.array(questionAnswerSchema).optional(),
  storedContext: z.string().optional(),
  additionalContext: nonEmptyStringSchema,
  teamTerms: z.record(z.string()),
  pmProfile: pmProfileSchema,
});

export const generateQuestionsRequestSchema = z.object({
  title: nonEmptyStringSchema,
  query: nonEmptyStringSchema,
  matchedContext: nonEmptyStringSchema,
  storedContext: nonEmptyStringSchema,
  teamTerms: nonEmptyStringSchema,
  type: z.enum(['prd', 'brand-messaging']).optional(),
  pmProfile: pmProfileSchema,
});

export const brainstormRequestSchema = z.object({
  messages: z.array(brainstormMessageSchema),
  additionalContext: nonEmptyStringSchema,
  teamTerms: z.record(z.string()),
  storedContext: nonEmptyStringSchema,
  startPrd: z.boolean().optional(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
  storedContext: z.string().optional(),
  teamTerms: z.record(z.string()).optional(),
  model: z.string().optional(),
});

export const generateVocabularyRequestSchema = z.object({
  title: nonEmptyStringSchema,
  query: nonEmptyStringSchema,
  matchedContext: nonEmptyStringSchema,
  type: z.enum(['prd', 'brand-messaging']).optional(),
  teamTerms: z.record(z.string()).optional(),
  pmProfile: pmProfileSchema,
});

export const analyzeDocumentRequestSchema = z.object({
  documentBody: nonEmptyStringSchema,
  analysisPrompt: z.string().optional(),
  model: z.string().optional(),
  maxTokens: positiveIntSchema.optional(),
});

export const generateDesignPromptRequestSchema = z.object({
  prdText: nonEmptyStringSchema,
  pmProfile: pmProfileSchema,
});

export const summarizePrdRequestSchema = z.object({
  prdContent: nonEmptyStringSchema,
  title: z.string().optional(),
  model: z.string().optional(),
});

export const decomposePrdRequestSchema = z.object({
  content: nonEmptyStringSchema,
  prompt: z.string().optional(),
  model: z.string().optional(),
});

// Roadmap/PRD specific schemas
export const createPrdSlackChannelSchema = z.object({
  channel_name: nonEmptyStringSchema,
  channel_id: nonEmptyStringSchema,
  workspace_id: z.string().optional(),
  is_private: z.boolean().optional(),
  added_by: emailSchema.optional(),
});

export const createPrdJiraTicketSchema = z.object({
  ticket_key: nonEmptyStringSchema,
  ticket_url: z.string().url(),
  title: nonEmptyStringSchema,
  status: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.enum(['lowest', 'low', 'medium', 'high', 'highest']).optional(),
  added_by: emailSchema.optional(),
});

export const teamPerformanceMetricsSchema = z.object({
  team_member_id: positiveIntSchema,
  prd_id: positiveIntSchema,
  estimated_weeks: z.number().positive().optional(),
  actual_weeks: z.number().positive().optional(),
  complexity_rating: z.number().int().min(1).max(5).optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  primary_technologies: z.array(z.string()).default([]),
  skill_improvement_areas: z.array(z.string()).default([]),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
});

// Google Docs/Drive schemas
export const fetchDocsRequestSchema = z.object({
  driveFolderId: z.string().default(''),
  documentId: z.string().default(''),
});

export const fetchSheetsRequestSchema = z.object({
  documentId: nonEmptyStringSchema,
});

export const createGoogleDocRequestSchema = z.object({
  title: nonEmptyStringSchema,
  content: nonEmptyStringSchema,
});

export const getGoogleDocContentRequestSchema = z.object({
  docId: nonEmptyStringSchema,
});

// Embedding schemas
export const embedRequestSchema = z.object({
  // Multiple possible formats - validate based on structure
  input: z.string().optional(),
  text: z.string().optional(),
  query: z.string().optional(),
  title: z.string().optional(),
}).refine(
  data => data.input || data.text || data.query,
  { message: 'Must provide input, text, or query' }
);

// Save PRD schema
export const savePrdRequestSchema = z.object({
  url: z.string().url(),
  title: nonEmptyStringSchema,
});

// Agent Mode schemas
export const deploySquadRequestSchema = z.object({
  directive: nonEmptyStringSchema,
  urgency: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  context: z.string().optional(),
});

// Export type inference helpers
export type GenerateContentRequest = z.infer<typeof generateContentRequestSchema>;
export type GenerateQuestionsRequest = z.infer<typeof generateQuestionsRequestSchema>;
export type BrainstormRequest = z.infer<typeof brainstormRequestSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type GenerateVocabularyRequest = z.infer<typeof generateVocabularyRequestSchema>;
export type AnalyzeDocumentRequest = z.infer<typeof analyzeDocumentRequestSchema>;
export type GenerateDesignPromptRequest = z.infer<typeof generateDesignPromptRequestSchema>;
export type SummarizePrdRequest = z.infer<typeof summarizePrdRequestSchema>;
export type DecomposePrdRequest = z.infer<typeof decomposePrdRequestSchema>;
export type CreatePrdSlackChannelRequest = z.infer<typeof createPrdSlackChannelSchema>;
export type CreatePrdJiraTicketRequest = z.infer<typeof createPrdJiraTicketSchema>;
export type TeamPerformanceMetricsRequest = z.infer<typeof teamPerformanceMetricsSchema>;
export type DeploySquadRequest = z.infer<typeof deploySquadRequestSchema>;