import { createServiceClient } from '@/utils/supabase/service';
import { 
  UserKnowledgeSession, 
  QuestionResponse, 
  QuestionContextData,
  SessionContextData,
  VocabularyDefinition,
  PMPreferenceProfile,
  VocabularyInteraction,
  KnowledgeSummary
} from '@/types/knowledge';

export class KnowledgeTrackingService {
  private static getSupabaseClient() {
    return createServiceClient();
  }

  static async startSession(
    userEmail: string,
    sessionType: UserKnowledgeSession['session_type'],
    contextData?: SessionContextData
  ): Promise<UserKnowledgeSession | null> {
    try {
      const supabase = this.getSupabaseClient();
      const { data: session, error } = await supabase
        .from('user_knowledge_sessions')
        .insert({
          user_email: userEmail,
          session_type: sessionType,
          context_data: contextData || {},
          completion_status: 'in_progress'
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting knowledge session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error in startSession:', error);
      return null;
    }
  }

  static async updateSession(
    sessionId: number,
    userEmail: string,
    updates: {
      duration_seconds?: number;
      completion_status?: UserKnowledgeSession['completion_status'];
      context_data?: SessionContextData;
    }
  ): Promise<UserKnowledgeSession | null> {
    try {
      const supabase = this.getSupabaseClient();
      const { data: session, error } = await supabase
        .from('user_knowledge_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_email', userEmail)
        .select()
        .single();

      if (error) {
        console.error('Error updating knowledge session:', error);
        return null;
      }

      // Trigger knowledge summary regeneration if session is completed
      if (updates.completion_status === 'completed') {
        await this.regenerateKnowledgeSummary(userEmail);
      }

      return session;
    } catch (error) {
      console.error('Error in updateSession:', error);
      return null;
    }
  }

  static async recordVocabularyInteraction(
    sessionId: number,
    userEmail: string,
    term: string,
    userDefinition?: string,
    confidenceLevel?: number,
    domainTags?: string[]
  ): Promise<VocabularyInteraction | null> {
    try {
      // Calculate next review date based on confidence level
      const nextReviewDate = this.calculateNextReviewDate(confidenceLevel || 1, 1.0);

      const supabase = this.getSupabaseClient();
      const { data: interaction, error } = await supabase
        .from('vocabulary_interactions')
        .insert({
          session_id: sessionId,
          user_email: userEmail,
          term,
          user_definition: userDefinition,
          confidence_level: confidenceLevel,
          domain_tags: domainTags || [],
          next_review_date: nextReviewDate.toISOString(),
          review_count: 0,
          spaced_repetition_score: 1.0
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording vocabulary interaction:', error);
        return null;
      }

      return interaction;
    } catch (error) {
      console.error('Error in recordVocabularyInteraction:', error);
      return null;
    }
  }

  static async recordQuestionResponse(
    sessionId: number,
    userEmail: string,
    questionText: string,
    userAnswer: string,
    questionReasoning?: string,
    domainCategory?: string,
    complexityLevel?: number,
    responseTimeSeconds?: number,
    contextData?: QuestionContextData
  ): Promise<QuestionResponse | null> {
    try {
      // Calculate answer quality score
      const answerQualityScore = this.calculateAnswerQualityScore(userAnswer, complexityLevel);

      const supabase = this.getSupabaseClient();
      const { data: response, error } = await supabase
        .from('question_responses')
        .insert({
          session_id: sessionId,
          user_email: userEmail,
          question_text: questionText,
          question_reasoning: questionReasoning,
          user_answer: userAnswer,
          answer_quality_score: answerQualityScore,
          domain_category: domainCategory,
          complexity_level: complexityLevel,
          response_time_seconds: responseTimeSeconds,
          context_data: contextData || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording question response:', error);
        return null;
      }

      return response;
    } catch (error) {
      console.error('Error in recordQuestionResponse:', error);
      return null;
    }
  }

  static async getVocabularyDueForReview(userEmail: string, limit: number = 20): Promise<VocabularyInteraction[]> {
    try {
      const now = new Date().toISOString();
      const supabase = KnowledgeTrackingService.getSupabaseClient();
      const { data: vocabulary, error } = await supabase
        .from('vocabulary_interactions')
        .select('*')
        .eq('user_email', userEmail)
        .lte('next_review_date', now)
        .order('next_review_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error getting vocabulary due for review:', error);
        return [];
      }

      return vocabulary || [];
    } catch (error) {
      console.error('Error in getVocabularyDueForReview:', error);
      return [];
    }
  }

  static async updateVocabularyReview(
    interactionId: number,
    userEmail: string,
    confidenceLevel: number,
    isCorrect?: boolean
  ): Promise<VocabularyInteraction | null> {
    try {
      // Get current interaction
      const supabase = this.getSupabaseClient();
      const { data: currentInteraction, error: fetchError } = await supabase
        .from('vocabulary_interactions')
        .select('*')
        .eq('id', interactionId)
        .eq('user_email', userEmail)
        .single();

      if (fetchError || !currentInteraction) {
        console.error('Error fetching vocabulary interaction:', fetchError);
        return null;
      }

      // Calculate new spaced repetition score and next review date
      const newScore = this.updateSpacedRepetitionScore(
        currentInteraction.spaced_repetition_score,
        confidenceLevel,
        isCorrect
      );
      const nextReviewDate = this.calculateNextReviewDate(confidenceLevel, newScore);

      const { data: updatedInteraction, error } = await supabase
        .from('vocabulary_interactions')
        .update({
          confidence_level: confidenceLevel,
          is_correct: isCorrect,
          spaced_repetition_score: newScore,
          next_review_date: nextReviewDate.toISOString(),
          review_count: currentInteraction.review_count + 1
        })
        .eq('id', interactionId)
        .eq('user_email', userEmail)
        .select()
        .single();

      if (error) {
        console.error('Error updating vocabulary review:', error);
        return null;
      }

      return updatedInteraction;
    } catch (error) {
      console.error('Error in updateVocabularyReview:', error);
      return null;
    }
  }

  static async regenerateKnowledgeSummary(userEmail: string): Promise<KnowledgeSummary | null> {
    try {
      const supabase = this.getSupabaseClient();
      // Get all user data
      const [
        { data: sessions },
        { data: vocabInteractions },
        { data: questionResponses }
      ] = await Promise.all([
        supabase.from('user_knowledge_sessions').select('*').eq('user_email', userEmail),
        supabase.from('vocabulary_interactions').select('*').eq('user_email', userEmail),
        supabase.from('question_responses').select('*').eq('user_email', userEmail)
      ]);

      // Calculate domain expertise
      const domainExpertise: Record<string, number> = {};
      const vocabularyMastery: Record<string, number> = {};

      // Analyze question responses for domain expertise
      if (questionResponses) {
        const domainScores: Record<string, number[]> = {};
        
        for (const response of questionResponses) {
          if (response.domain_category && response.answer_quality_score !== null) {
            if (!domainScores[response.domain_category]) {
              domainScores[response.domain_category] = [];
            }
            domainScores[response.domain_category].push(response.answer_quality_score);
          }
        }

        // Average the scores for each domain
        Object.entries(domainScores).forEach(([domain, scores]) => {
          domainExpertise[domain] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
      }

      // Analyze vocabulary interactions for mastery
      if (vocabInteractions) {
        for (const interaction of vocabInteractions) {
          if (interaction.confidence_level) {
            vocabularyMastery[interaction.term] = interaction.confidence_level / 5; // Normalize to 0-1
          }
        }
      }

      // Calculate averages and insights
      const totalSessions = sessions?.length || 0;
      const totalVocabularyTerms = vocabInteractions?.length || 0;
      const totalQuestionsAnswered = questionResponses?.length || 0;

      const avgConfidenceScore = vocabInteractions?.length
        ? vocabInteractions.reduce((sum, vi) => sum + (vi.confidence_level || 0), 0) / vocabInteractions.length
        : null;

      // Identify knowledge gaps and strengths
      const knowledgeGaps: string[] = [];
      const strengths: string[] = [];

      Object.entries(domainExpertise).forEach(([domain, score]) => {
        if (score < 0.5) {
          knowledgeGaps.push(domain);
        } else if (score > 0.8) {
          strengths.push(domain);
        }
      });

      // Update knowledge summary
      const { data: summary, error } = await supabase
        .from('knowledge_summaries')
        .upsert({
          user_email: userEmail,
          domain_expertise: domainExpertise,
          vocabulary_mastery: vocabularyMastery,
          learning_preferences: {}, // Could be enhanced with learning pattern analysis
          knowledge_gaps: knowledgeGaps,
          strengths: strengths,
          total_sessions: totalSessions,
          total_vocabulary_terms: totalVocabularyTerms,
          total_questions_answered: totalQuestionsAnswered,
          average_confidence_score: avgConfidenceScore,
          last_activity_date: new Date().toISOString()
        }, {
          onConflict: 'user_email'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating knowledge summary:', error);
        return null;
      }

      return summary;
    } catch (error) {
      console.error('Error in regenerateKnowledgeSummary:', error);
      return null;
    }
  }

  private static calculateNextReviewDate(confidenceLevel: number, spacedRepetitionScore: number = 1.0): Date {
    const baseIntervals = [1, 3, 7, 14, 30]; // days
    const confidenceMultiplier = Math.max(0.5, confidenceLevel / 5); // 0.1 to 1.0
    const scoreMultiplier = Math.max(0.5, spacedRepetitionScore); // minimum 0.5x
    
    const intervalIndex = Math.min(confidenceLevel - 1, baseIntervals.length - 1);
    const intervalDays = baseIntervals[intervalIndex] * confidenceMultiplier * scoreMultiplier;
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + Math.ceil(intervalDays));
    return nextDate;
  }

  private static updateSpacedRepetitionScore(
    currentScore: number,
    confidenceLevel: number,
    isCorrect?: boolean
  ): number {
    const confidenceBonus = (confidenceLevel - 3) * 0.1; // -0.2 to +0.2
    const correctnessBonus = isCorrect === true ? 0.1 : isCorrect === false ? -0.2 : 0;
    
    const newScore = Math.max(0.1, Math.min(3.0, currentScore + confidenceBonus + correctnessBonus));
    return Math.round(newScore * 100) / 100; // Round to 2 decimal places
  }

  private static calculateAnswerQualityScore(answer: string, complexityLevel?: number): number {
    const baseScore = Math.min(
      (answer.trim().length / 200) * 0.4 + // Length factor (max 0.4)
      (answer.split(' ').length / 50) * 0.3 + // Word count factor (max 0.3)
      0.3, // Base score
      1.0 // Cap at 1.0
    );

    // Adjust based on complexity level
    if (complexityLevel) {
      const complexityBonus = (complexityLevel - 3) * 0.05; // -0.1 to +0.1
      return Math.max(0.1, Math.min(1.0, baseScore + complexityBonus));
    }

    return baseScore;
  }

  static async getUserVocabularyDefinitions(userEmail: string): Promise<Record<string, string>> {
    try {
      const supabase = this.getSupabaseClient();
      const { data: vocabularyDefinitions, error } = await supabase
        .from('vocabulary_definitions')
        .select('term, user_definition')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user vocabulary definitions:', error);
        return {};
      }

      // Convert to object for easy lookup
      const vocabularyMap: Record<string, string> = {};
      vocabularyDefinitions?.forEach((def) => {
        if (def.term && def.user_definition) {
          vocabularyMap[def.term] = def.user_definition;
        }
      });

      return vocabularyMap;
    } catch (error) {
      console.error('Error in getUserVocabularyDefinitions:', error);
      return {};
    }
  }

  static async getPMProfile(userEmail: string): Promise<PMPreferenceProfile | null> {
    try {
      const supabase = this.getSupabaseClient();
      const { data: pmProfile, error } = await supabase
        .from('pm_preference_profiles')
        .select('*')
        .eq('user_email', userEmail)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile exists yet, return null
        return null;
      }

      if (error) {
        console.error('Error fetching PM profile:', error);
        return null;
      }

      return pmProfile;
    } catch (error) {
      console.error('Error in getPMProfile:', error);
      return null;
    }
  }
}

// Export class for static method access
export const knowledgeTracker = KnowledgeTrackingService;