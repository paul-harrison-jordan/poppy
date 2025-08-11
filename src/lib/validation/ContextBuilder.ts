import type { PMPreferenceProfile } from '@/types/knowledge';

export interface BaseContext {
  userId?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface PRDContext extends BaseContext {
  teamTerms: Record<string, string>;
  storedContext: {
    personalContext?: string;
    teamContext?: string;
    prdInstructions?: string;
    examplesOfHowYouThink?: string;
    pillarGoalsKeyTermsBackground?: string;
    howYouThinkAboutProduct?: string;
    teamStrategy?: string;
  };
  pmProfile?: PMPreferenceProfile;
  additionalContext?: string;
}

export interface ChatContext extends BaseContext {
  teamTerms: Record<string, string>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  storedContext?: string;
}

export interface AnalysisContext extends BaseContext {
  documentBody: string;
  analysisPrompt?: string;
  domain?: string;
}

export class ContextBuilder {
  private context: Partial<BaseContext> = {};

  static create(): ContextBuilder {
    return new ContextBuilder();
  }

  withUser(userId: string): this {
    this.context.userId = userId;
    return this;
  }

  withSession(sessionId: string): this {
    this.context.sessionId = sessionId;
    return this;
  }

  withTimestamp(timestamp?: Date): this {
    this.context.timestamp = timestamp || new Date();
    return this;
  }

  // Build PRD context from validated request data
  buildPRDContext(data: {
    teamTerms: Record<string, string>;
    storedContext?: string;
    pmProfile?: PMPreferenceProfile;
    additionalContext?: string;
  }): PRDContext {
    // Parse stored context if it's a JSON string
    let parsedStoredContext = {};
    if (data.storedContext) {
      try {
        parsedStoredContext = JSON.parse(data.storedContext);
      } catch (error) {
        console.warn('Failed to parse stored context, using as string:', error);
        parsedStoredContext = { raw: data.storedContext };
      }
    }

    return {
      ...this.getBaseContext(),
      teamTerms: data.teamTerms,
      storedContext: parsedStoredContext,
      pmProfile: data.pmProfile,
      additionalContext: data.additionalContext
    };
  }

  // Build chat context
  buildChatContext(data: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    teamTerms?: Record<string, string>;
    storedContext?: string;
  }): ChatContext {
    return {
      ...this.getBaseContext(),
      teamTerms: data.teamTerms || {},
      conversationHistory: data.messages,
      storedContext: data.storedContext
    };
  }

  // Build analysis context
  buildAnalysisContext(data: {
    documentBody: string;
    analysisPrompt?: string;
    domain?: string;
  }): AnalysisContext {
    return {
      ...this.getBaseContext(),
      documentBody: data.documentBody,
      analysisPrompt: data.analysisPrompt,
      domain: data.domain
    };
  }

  private getBaseContext(): BaseContext {
    return {
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      timestamp: this.context.timestamp || new Date()
    };
  }

  // Helper methods for common context transformations

  static formatTeamTermsForPrompt(teamTerms: Record<string, string>): string {
    if (!teamTerms || Object.keys(teamTerms).length === 0) {
      return 'No team-specific terms defined.';
    }

    return Object.entries(teamTerms)
      .map(([term, definition]) => `- **${term}**: ${definition}`)
      .join('\n');
  }

  static formatPMProfileForPrompt(pmProfile?: PMPreferenceProfile): string {
    if (!pmProfile) {
      return 'No PM profile available.';
    }

    const sections = [];

    if (pmProfile.product_philosophy) {
      sections.push(`**Product Philosophy**: ${pmProfile.product_philosophy}`);
    }

    if (pmProfile.domain_expertise?.length) {
      sections.push(`**Domain Expertise**: ${pmProfile.domain_expertise.join(', ')}`);
    }

    if (pmProfile.recurring_themes?.length) {
      sections.push(`**Recurring Themes**: ${pmProfile.recurring_themes.join(', ')}`);
    }

    if (pmProfile.decision_frameworks && Object.keys(pmProfile.decision_frameworks).length > 0) {
      sections.push(`**Decision Frameworks**: ${Object.keys(pmProfile.decision_frameworks).join(', ')}`);
    }

    return sections.length > 0 ? sections.join('\n') : 'No detailed PM profile available.';
  }

  static formatStoredContextForPrompt(storedContext: PRDContext['storedContext']): string {
    if (!storedContext || Object.keys(storedContext).length === 0) {
      return 'No stored context available.';
    }

    const sections = [];

    if (storedContext.personalContext) {
      sections.push(`**Personal Context**: ${storedContext.personalContext}`);
    }

    if (storedContext.teamContext) {
      sections.push(`**Team Context**: ${storedContext.teamContext}`);
    }

    if (storedContext.teamStrategy) {
      sections.push(`**Team Strategy**: ${storedContext.teamStrategy}`);
    }

    if (storedContext.examplesOfHowYouThink) {
      sections.push(`**Thinking Examples**: ${storedContext.examplesOfHowYouThink}`);
    }

    return sections.join('\n\n');
  }

  // Build comprehensive prompt context
  static buildPromptContext(context: PRDContext): {
    teamTermsSection: string;
    pmProfileSection: string;
    storedContextSection: string;
    metadataSection: string;
  } {
    return {
      teamTermsSection: this.formatTeamTermsForPrompt(context.teamTerms),
      pmProfileSection: this.formatPMProfileForPrompt(context.pmProfile),
      storedContextSection: this.formatStoredContextForPrompt(context.storedContext),
      metadataSection: `Session: ${context.sessionId || 'anonymous'} | Timestamp: ${context.timestamp.toISOString()}`
    };
  }

  // Validate context completeness
  static validatePRDContext(context: PRDContext): {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!context.teamTerms || Object.keys(context.teamTerms).length === 0) {
      warnings.push('No team terms provided - responses may lack domain-specific context');
    }

    if (!context.pmProfile) {
      warnings.push('No PM profile provided - responses may lack personalization');
    }

    if (!context.storedContext || Object.keys(context.storedContext).length === 0) {
      warnings.push('No stored context provided - responses may lack historical context');
    }

    if (!context.userId) {
      missingFields.push('userId');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }
}