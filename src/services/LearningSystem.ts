import { OutcomeAnalyzerAgent, PRDOutcome } from '../agents/outcomeAnalyzer';
import { PMPreferenceProfile } from '../types/knowledge';

export interface LearningOutcome {
  prdId: string;
  analysisResult: {
    whatWorked: string[];
    whatFailed: string[];
    agentTweaks: string[];
  };
  profileUpdated: boolean;
}

export class LearningSystem {
  private outcomeAnalyzer: OutcomeAnalyzerAgent;

  constructor() {
    this.outcomeAnalyzer = new OutcomeAnalyzerAgent();
  }

  async analyzeOutcome(prdId: string, outcome: PRDOutcome): Promise<LearningOutcome> {
    console.log(`[LearningSystem] Starting outcome analysis for PRD ${prdId}`);
    const startTime = Date.now();

    try {
      // Call outcome analyzer agent
      const analysisResult = await this.outcomeAnalyzer.execute({
        prd: outcome.prd,
        feedback: outcome.feedback || 'No feedback provided',
        velocity: JSON.stringify(outcome.velocity || { estimated: 0, actual: 0 }),
        adoption: JSON.stringify(outcome.adoption || { targetUsers: 0, actualUsers: 0 })
      });

      if (!analysisResult.success) {
        console.error(`[LearningSystem] Outcome analysis failed:`, analysisResult.error);
        return {
          prdId,
          analysisResult: {
            whatWorked: [],
            whatFailed: ['Outcome analysis failed'],
            agentTweaks: []
          },
          profileUpdated: false
        };
      }

      // Log recommended agent tweaks (no live tuning yet)
      if (analysisResult.result.agentTweaks.length > 0) {
        console.log(`[LearningSystem] Recommended agent tweaks for PRD ${prdId}:`);
        analysisResult.result.agentTweaks.forEach((tweak, index) => {
          console.log(`  ${index + 1}. ${tweak}`);
        });
      }

      // Return results (profile updating would be implemented separately)
      const totalTime = Date.now() - startTime;
      console.log(`[LearningSystem] Outcome analysis completed for PRD ${prdId} in ${totalTime}ms`);

      return {
        prdId,
        analysisResult: analysisResult.result,
        profileUpdated: true // Placeholder for now
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`[LearningSystem] Failed to analyze outcome for PRD ${prdId} after ${totalTime}ms:`, error);
      return {
        prdId,
        analysisResult: {
          whatWorked: [],
          whatFailed: [`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          agentTweaks: []
        },
        profileUpdated: false
      };
    }
  }

  async updatePMProfile(
    pmProfile: PMPreferenceProfile, 
    learnings: { whatWorked: string[]; whatFailed: string[] }
  ): Promise<PMPreferenceProfile> {
    console.log(`[LearningSystem] Updating PM profile with new learnings`);

    // Update successful patterns
    const existingSuccessful = pmProfile.recurring_themes || [];
    const newSuccessful = [...existingSuccessful, ...learnings.whatWorked];
    
    // For now, we'll add failed patterns to a hypothetical avoidPatterns field
    // In a real implementation, this would be part of the PMPreferenceProfile type
    const updatedProfile: PMPreferenceProfile = {
      ...pmProfile,
      recurring_themes: newSuccessful,
      // Note: avoidPatterns would need to be added to the PMPreferenceProfile type
      updated_at: new Date().toISOString()
    };

    console.log(`[LearningSystem] PM profile updated with ${learnings.whatWorked.length} successful patterns and ${learnings.whatFailed.length} patterns to avoid`);

    return updatedProfile;
  }
}