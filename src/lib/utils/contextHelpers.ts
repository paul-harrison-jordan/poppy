import { DEFAULT_ANNOTATED_PRD } from '@/lib/constants/defaultPRDTemplate';

export function getEnrichedPersonalContext(): string {
  const storedContext = localStorage.getItem('personalContext');
  
  if (!storedContext) {
    return '';
  }
  
  try {
    const context = JSON.parse(storedContext);
    
    // Combine user context with default PRD template
    const enrichedContext = {
      ...context,
      examplesOfHowYouThink: DEFAULT_ANNOTATED_PRD,
      _note: 'The annotated PRD example above is a system default that demonstrates best practices.'
    };
    
    // Return as formatted string for the AI
    return `
Personal Context:
- Team Strategy: ${enrichedContext.teamStrategy || 'Not provided'}
- How You Think About Product: ${enrichedContext.howYouThinkAboutProduct || 'Not provided'}
- Pillar Goals & Key Terms: ${enrichedContext.pillarGoalsKeyTermsBackground || 'Not provided'}

Example Annotated PRD (System Default):
${enrichedContext.examplesOfHowYouThink}
`;
  } catch (error) {
    console.error('Error parsing personal context:', error);
    return storedContext || '';
  }
}

export function isOnboardingComplete(): boolean {
  // Check explicit onboarding marker first
  if (localStorage.getItem('onboardingComplete') === 'true') {
    return true;
  }
  
  // Check if required fields are present
  const personalContext = localStorage.getItem('personalContext');
  const syncedDocs = localStorage.getItem('syncedDocs');
  
  if (!personalContext || !syncedDocs) {
    return false;
  }
  
  try {
    const context = JSON.parse(personalContext);
    const docs = JSON.parse(syncedDocs);
    
    const contextComplete = !!(
      context.teamStrategy && 
      context.howYouThinkAboutProduct && 
      context.pillarGoalsKeyTermsBackground
    );
    
    const docsComplete = Array.isArray(docs) && docs.length > 0;
    
    return contextComplete && docsComplete;
  } catch {
    return false;
  }
}