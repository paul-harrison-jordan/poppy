import {
  BatchPRDSession,
  FeatureInput,
  ProposedContent,
  PMPreferenceProfile
} from '@/types/knowledge';
import {
  searchTermDefinition,
  searchQuestionAnswer,
  generateTermDefinition,
  generateQuestionAnswer
} from '@/lib/services/googleSearchService';
import { generateQuestions } from '@/lib/services/openaiService';
import { openai } from '@/lib/openai';

export interface BatchGenerationProgress {
  featureId: string;
  featureName: string;
  status: 'pending' | 'generating_terms' | 'generating_questions' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export class BatchPRDOrchestrator {
  private progressCallbacks: Map<string, (progress: BatchGenerationProgress[]) => void> = new Map();

  /**
   * Generate proposed content for all features in a batch session
   */
  async generateBatchContent(
    session: BatchPRDSession,
    pmProfile?: PMPreferenceProfile,
    teamTerms?: Record<string, string>
  ): Promise<ProposedContent[]> {
    console.log(`[BatchPRDOrchestrator] Starting batch generation for ${session.features.length} features`);
    const startTime = Date.now();

    const progressMap: Map<string, BatchGenerationProgress> = new Map();

    // Initialize progress tracking
    session.features.forEach(feature => {
      progressMap.set(feature.id, {
        featureId: feature.id,
        featureName: feature.name,
        status: 'pending',
        progress: 0
      });
    });

    this.emitProgress(session.id, Array.from(progressMap.values()));

    try {
      // Process all features in parallel
      const results = await Promise.all(
        session.features.map(feature =>
          this.generateFeatureContent(feature, pmProfile, session.id, progressMap, teamTerms)
        )
      );

      const totalTime = Date.now() - startTime;
      console.log(`[BatchPRDOrchestrator] Batch generation completed in ${totalTime}ms`);

      return results;
    } catch (error) {
      console.error('[BatchPRDOrchestrator] Batch generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate proposed content for a single feature
   */
  private async generateFeatureContent(
    feature: FeatureInput,
    pmProfile: PMPreferenceProfile | undefined,
    sessionId: string,
    progressMap: Map<string, BatchGenerationProgress>,
    teamTerms?: Record<string, string>
  ): Promise<ProposedContent> {
    console.log(`[BatchPRDOrchestrator] Generating content for feature: "${feature.name}"`);

    try {
      // Update progress: generating terms
      this.updateProgress(sessionId, progressMap, feature.id, {
        status: 'generating_terms',
        progress: 10
      });

      // Step 1: Generate questions based on JTBD
      // Merge teamTerms from localStorage with PM profile
      const mergedTeamTerms = {
        ...teamTerms,
        ...pmProfile?.vocabulary_glossary
      };

      const personaContext = this.getPersonaContext(feature, pmProfile);
      const questionsResult = await generateQuestions({
        title: feature.name,
        query: feature.jtbd + (personaContext ? `\n\nContext: ${personaContext}` : ''),
        matchedContext: '',
        storedContext: '',
        teamTerms: JSON.stringify(mergedTeamTerms)
      });

      const questions = questionsResult.questions || [];
      console.log(`[BatchPRDOrchestrator] Generated ${questions.length} questions for "${feature.name}"`);

      this.updateProgress(sessionId, progressMap, feature.id, {
        status: 'generating_terms',
        progress: 30
      });

      // Step 2: Extract terms from questions and JTBD using AI
      const terms = await this.extractTerms(feature.jtbd, questions);
      console.log(`[BatchPRDOrchestrator] Extracted ${terms.length} terms for "${feature.name}"`);

      // Step 3: Search and generate term definitions in parallel
      const termPromises = terms.map(async (term) => {
        const searchResult = await searchTermDefinition(term);
        return generateTermDefinition(term, searchResult.results);
      });

      const proposedTerms = await Promise.all(termPromises);

      this.updateProgress(sessionId, progressMap, feature.id, {
        status: 'generating_questions',
        progress: 60
      });

      // Step 4: Search and generate question answers in parallel
      const questionPromises = questions.map(async (q) => {
        const searchResult = await searchQuestionAnswer(
          typeof q === 'string' ? q : q.text,
          feature.name,
          feature.jtbd
        );
        return generateQuestionAnswer(
          typeof q === 'string' ? q : q.text,
          searchResult.results,
          feature.name,
          feature.jtbd
        );
      });

      const proposedAnswers = await Promise.all(questionPromises);

      this.updateProgress(sessionId, progressMap, feature.id, {
        status: 'completed',
        progress: 100
      });

      console.log(
        `[BatchPRDOrchestrator] Completed content generation for "${feature.name}": ` +
        `${proposedTerms.length} terms, ${proposedAnswers.length} questions`
      );

      return {
        featureId: feature.id,
        terms: proposedTerms,
        questionAnswers: proposedAnswers,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[BatchPRDOrchestrator] Error generating content for "${feature.name}":`, error);

      this.updateProgress(sessionId, progressMap, feature.id, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return empty content on error
      return {
        featureId: feature.id,
        terms: [],
        questionAnswers: [],
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Extract technical terms from JTBD and questions using AI
   */
  private async extractTerms(jtbd: string, questions: Array<string | { text: string }>): Promise<string[]> {
    try {
      const questionsText = questions.map(q => typeof q === 'string' ? q : q.text).join('\n');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a technical vocabulary expert helping identify terms that need definitions in a PRD.
Extract 5-7 technical, product, or business terms that would benefit from definitions.
Focus on:
- Technical terms specific to the feature or domain
- Business terminology that may be unclear
- Product concepts that need explanation
- Industry-specific jargon
- Terms from e-commerce, marketing automation, or product development

Do NOT extract:
- Common words (e.g., "when", "today", "this", "what", "how")
- Generic verbs or adjectives
- Pronouns or articles

Return ONLY the terms as a JSON array of strings.`
          },
          {
            role: 'user',
            content: `Extract key technical terms that need definitions from this PRD content:

JTBD:
${jtbd}

Questions:
${questionsText}

Return a JSON array of 5-7 specific technical terms that would benefit from definitions.
Example format: ["API Integration", "Webhook", "OAuth", "Rate Limiting", "Async Processing"]`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content || '{"terms": []}';
      const parsed = JSON.parse(content);

      // Handle both {"terms": [...]} and direct array responses
      const terms = Array.isArray(parsed) ? parsed : (parsed.terms || []);

      console.log(`[BatchPRDOrchestrator] AI extracted ${terms.length} terms:`, terms);

      return terms.slice(0, 7); // Cap at 7 terms
    } catch (error) {
      console.error('[BatchPRDOrchestrator] Error extracting terms with AI:', error);
      // Fallback to empty array
      return [];
    }
  }

  /**
   * Get persona context for content generation
   */
  private getPersonaContext(feature: FeatureInput, pmProfile?: PMPreferenceProfile): string {
    if (!pmProfile?.personal_context?.productAreaPersonas) {
      return '';
    }

    const personas = pmProfile.personal_context.productAreaPersonas;
    const areaPersona = personas[feature.productArea];

    return areaPersona
      ? `Product Area Context: ${feature.productArea}\nApplied Persona: ${areaPersona}`
      : '';
  }

  /**
   * Register progress callback
   */
  onProgress(sessionId: string, callback: (progress: BatchGenerationProgress[]) => void): void {
    this.progressCallbacks.set(sessionId, callback);
  }

  /**
   * Update and emit progress
   */
  private updateProgress(
    sessionId: string,
    progressMap: Map<string, BatchGenerationProgress>,
    featureId: string,
    update: Partial<BatchGenerationProgress>
  ): void {
    const current = progressMap.get(featureId);
    if (current) {
      progressMap.set(featureId, { ...current, ...update });
      this.emitProgress(sessionId, Array.from(progressMap.values()));
    }
  }

  /**
   * Emit progress to registered callback
   */
  private emitProgress(sessionId: string, progress: BatchGenerationProgress[]): void {
    const callback = this.progressCallbacks.get(sessionId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Clear progress callback
   */
  clearProgress(sessionId: string): void {
    this.progressCallbacks.delete(sessionId);
  }
}
