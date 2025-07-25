import { openai } from '../openai';
import { QuestionResponse } from '@/types/knowledge';

export class PMInsightService {
  
  /**
   * Extract insights from a single question-answer pair
   */
  async extractQuestionInsights(
    questionText: string,
    questionReasoning: string | undefined,
    userAnswer: string,
    domainCategory: string | undefined
  ): Promise<Record<string, any>> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing product manager decision-making patterns and preferences. 

Analyze the PM's response to extract:
1. Decision-making frameworks they use
2. Trade-off preferences (speed vs quality, user research vs speed, technical debt vs features, etc.)
3. Mental models and approaches to product thinking
4. Values and priorities they demonstrate
5. Recurring themes in their reasoning

Return a JSON object with these keys:
- "frameworks": Array of mental models/frameworks used
- "tradeoff_preferences": Object mapping tradeoff types to their preferred approach
- "values": Array of core values demonstrated  
- "themes": Array of recurring themes
- "reasoning_style": Description of their problem-solving approach

Focus on extracting actionable insights that would help generate better PRDs aligned with their thinking.`,
          },
          {
            role: 'user',
            content: `Question: ${questionText}
${questionReasoning ? `Reasoning: ${questionReasoning}` : ''}
PM's Answer: ${userAnswer}
${domainCategory ? `Domain: ${domainCategory}` : ''}

Extract insights about this PM's decision-making patterns and preferences.`,
          },
        ],
      });

      const response = completion.choices[0].message.content;
      if (!response) return {};

      const insights = JSON.parse(response);
      return insights;
    } catch (error) {
      console.error('Error extracting question insights:', error);
      return {};
    }
  }

  /**
   * Generate comprehensive PM preference summary from all sessions
   */
  async generatePMPreferenceSummary(
    questionResponses: QuestionResponse[],
    vocabularyTerms: Record<string, string>
  ): Promise<{
    product_philosophy: string;
    decision_frameworks: Record<string, any>;
    trade_off_preferences: Record<string, any>;
    recurring_themes: string[];
  }> {
    try {
      // Prepare context from all question responses
      const qaContext = questionResponses.map(qr => 
        `Q: ${qr.question_text}\nA: ${qr.user_answer}\n${qr.extracted_insights ? `Insights: ${JSON.stringify(qr.extracted_insights)}` : ''}`
      ).join('\n\n');

      const vocabContext = Object.entries(vocabularyTerms)
        .map(([term, definition]) => `${term}: ${definition}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: 'o4-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert at understanding product manager thinking patterns and preferences. Your goal is to take in information, and generate durable and valuable insights about how the PM thinks about building products and making decisions. This will be used to generate future PRDs that align with their thinking style and preferences.

Analyze this PM's complete question-answer history and vocabulary to create a comprehensive preference profile.

Generate:
1. PRODUCT_PHILOSOPHY: A 2-3 sentence summary of their overall approach to product management
2. DECISION_FRAMEWORKS: They will always use Jobs-to-be-done framework to make decisions. But how do they use it, how are they honing in and prioritizing the jobs to be done?  
3. TRADE_OFF_PREFERENCES: How they typically navigate common PM trade-offs (speed vs quality, research vs intuition, technical debt vs features, etc.). Specific examples are helpful.
4. RECURRING_THEMES: Common patterns across their answers (e.g., "data-driven decisions", "user empathy", "technical feasibility focus"). Help the PM build a more complete picture of their thinking style.

This profile will be used to generate future PRDs that align with their thinking style and preferences.

Return JSON with keys: product_philosophy, decision_frameworks, trade_off_preferences, recurring_themes`,
          },
          {
            role: 'user',
            content: `PM Question & Answer History:
${qaContext}

PM's Vocabulary Definitions:
${vocabContext}

Generate a comprehensive preference profile for this product manager.`,
          },
        ],
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('No response from OpenAI');

      const summary = JSON.parse(response);
      return {
        product_philosophy: summary.product_philosophy || '',
        decision_frameworks: summary.decision_frameworks || {},
        trade_off_preferences: summary.trade_off_preferences || {},
        recurring_themes: Array.isArray(summary.recurring_themes) ? summary.recurring_themes : []
      };
    } catch (error) {
      console.error('Error generating PM preference summary:', error);
      return {
        product_philosophy: '',
        decision_frameworks: {},
        trade_off_preferences: {},
        recurring_themes: []
      };
    }
  }

  /**
   * Extract domain expertise areas from vocabulary and Q&A patterns
   */
  async extractDomainExpertise(
    questionResponses: QuestionResponse[],
    vocabularyTerms: Record<string, string>
  ): Promise<string[]> {
    try {
      const content = [
        ...questionResponses.map(qr => `${qr.question_text} ${qr.user_answer}`),
        ...Object.keys(vocabularyTerms)
      ].join(' ');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Analyze this PM's questions, answers, and vocabulary to identify their domain expertise areas.

Common PM domains include: 
- Mobile apps, Web platforms, API/Developer tools, E-commerce, B2B SaaS, Consumer products
- Growth/Marketing, Analytics/Data, Infrastructure/Platform, AI/ML, Marketplace, Fintech
- Early-stage startup, Scale-up, Enterprise, etc.

Return JSON with key "domains" containing an array of 3-5 specific expertise areas.`,
          },
          {
            role: 'user',
            content: `PM Content: ${content.substring(0, 4000)}`, // Limit content length
          },
        ],
      });

      const response = completion.choices[0].message.content;
      if (!response) return [];

      const result = JSON.parse(response);
      return Array.isArray(result.domains) ? result.domains : [];
    } catch (error) {
      console.error('Error extracting domain expertise:', error);
      return [];
    }
  }

  /**
   * Generate enhanced vocabulary suggestions based on PM's existing glossary
   */
  async generateContextualVocabulary(
    existingVocabulary: Record<string, string>,
    currentContext: string,
    domain: string
  ): Promise<string[]> {
    try {
      const vocabContext = Object.keys(existingVocabulary).join(', ');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are helping a PM build their domain-specific vocabulary glossary.

Given their existing vocabulary and current PRD context, suggest 5 relevant terms they should define that:
1. Are commonly used in their domain but not yet in their glossary
2. Are relevant to the current PRD context
3. Would improve consistency and clarity in future PRDs
4. Build on their existing vocabulary

Return JSON with key "terms" containing an array of suggested terms.`,
          },
          {
            role: 'user',
            content: `Domain: ${domain}
Current PRD Context: ${currentContext}
Existing Vocabulary: ${vocabContext}

Suggest 5 new terms for their glossary.`,
          },
        ],
      });

      const response = completion.choices[0].message.content;
      if (!response) return [];

      const result = JSON.parse(response);
      return Array.isArray(result.terms) ? result.terms : [];
    } catch (error) {
      console.error('Error generating contextual vocabulary:', error);
      return [];
    }
  }
}

// Export singleton instance
export const pmInsightService = new PMInsightService();