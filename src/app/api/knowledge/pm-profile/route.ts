import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { GetPMProfileResponse, DecisionFrameworks, TradeOffPreferences } from '@/types/knowledge';
import { pmInsightService } from '@/lib/services/pmInsightService';
import { getAuthServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get or create PM preference profile
    const { data: initialProfile, error: profileError } = await supabase
      .from('pm_preference_profiles')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    let profile = initialProfile;
    
    if (profileError && profileError.code === 'PGRST116') {
      // No profile exists, create one
      const { data: newProfile, error: createError } = await supabase
        .from('pm_preference_profiles')
        .insert({
          user_email: session.user.email,
          vocabulary_glossary: {},
          decision_frameworks: {},
          trade_off_preferences: {},
          recurring_themes: [],
          domain_expertise: [],
          personal_context: null,
          total_sessions: 0,
          total_vocabulary_terms: 0,
          total_questions_answered: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating PM profile:', createError);
        return NextResponse.json({ error: 'Failed to create PM profile' }, { status: 500 });
      }

      profile = newProfile;
    } else if (profileError) {
      console.error('Error fetching PM profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch PM profile' }, { status: 500 });
    }

    // Get recent sessions
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('user_knowledge_sessions')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(10);

    if (sessionsError) {
      console.error('Error fetching recent sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch recent sessions' }, { status: 500 });
    }

    // Get vocabulary glossary
    const { data: vocabularyGlossary, error: vocabError } = await supabase
      .from('vocabulary_definitions')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false });

    if (vocabError) {
      console.error('Error fetching vocabulary glossary:', vocabError);
      return NextResponse.json({ error: 'Failed to fetch vocabulary glossary' }, { status: 500 });
    }

    const response: GetPMProfileResponse = {
      profile,
      recent_sessions: recentSessions || [],
      vocabulary_glossary: vocabularyGlossary || []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in PM profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Trigger PM preference profile regeneration
    await regeneratePMProfile(supabase, session.user.email);

    // Return updated profile
    const { data: profile, error: profileError } = await supabase
      .from('pm_preference_profiles')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    if (profileError) {
      console.error('Error fetching updated PM profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch updated profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Error regenerating PM profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function regeneratePMProfile(supabase: ReturnType<typeof createServiceClient>, userEmail: string) {
  try {
    // Get all user data
    const [
      { data: sessions },
      { data: vocabDefinitions },
      { data: questionResponses }
    ] = await Promise.all([
      supabase.from('user_knowledge_sessions').select('*').eq('user_email', userEmail),
      supabase.from('vocabulary_definitions').select('*').eq('user_email', userEmail),
      supabase.from('question_responses').select('*').eq('user_email', userEmail)
    ]);

    // Build vocabulary glossary
    const vocabularyGlossary: Record<string, string> = {};
    if (vocabDefinitions) {
      for (const def of vocabDefinitions) {
        vocabularyGlossary[def.term] = def.user_definition;
      }
    }

    // Generate comprehensive PM insights using OpenAI (with fallbacks)
    let pmSummary = {
      product_philosophy: '',
      decision_frameworks: { frameworks: [], approaches: [] } as DecisionFrameworks,
      trade_off_preferences: { speedVsQuality: 'balanced' as const, riskTolerance: 'medium' as const, userFocus: 'balanced' as const } as TradeOffPreferences,
      recurring_themes: [] as string[]
    };
    
    let domainExpertise: string[] = [];

    try {
      console.log('Generating PM preference summary for user:', userEmail);
      console.log('Question responses count:', questionResponses?.length || 0);
      console.log('Vocabulary terms count:', Object.keys(vocabularyGlossary).length);
      
      if (questionResponses && questionResponses.length > 0) {
        pmSummary = await pmInsightService.generatePMPreferenceSummary(
          questionResponses,
          vocabularyGlossary
        );
        console.log('PM summary generated successfully:', pmSummary);
      } else {
        console.log('No question responses found, using default PM summary');
      }

      // Extract domain expertise
      if (questionResponses && questionResponses.length > 0) {
        domainExpertise = await pmInsightService.extractDomainExpertise(
          questionResponses,
          vocabularyGlossary
        );
        console.log('Domain expertise extracted:', domainExpertise);
      } else {
        console.log('No data for domain expertise extraction');
      }
    } catch (aiError) {
      console.error('AI service error, using fallback values:', aiError);
      // Continue with default values if AI services fail
    }

    // Calculate totals
    const totalSessions = sessions?.length || 0;
    const totalVocabularyTerms = vocabDefinitions?.length || 0;
    const totalQuestionsAnswered = questionResponses?.length || 0;

    // Update PM preference profile
    console.log('Upserting PM profile for user:', userEmail);
    const { data: upsertedProfile, error: upsertError } = await supabase
      .from('pm_preference_profiles')
      .upsert({
        user_email: userEmail,
        vocabulary_glossary: vocabularyGlossary,
        decision_frameworks: pmSummary.decision_frameworks,
        trade_off_preferences: pmSummary.trade_off_preferences,
        product_philosophy: pmSummary.product_philosophy,
        recurring_themes: pmSummary.recurring_themes,
        domain_expertise: domainExpertise,
        total_sessions: totalSessions,
        total_vocabulary_terms: totalVocabularyTerms,
        total_questions_answered: totalQuestionsAnswered,
        last_activity_date: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting PM profile:', upsertError);
      throw upsertError;
    }
    
    console.log('PM profile upserted successfully:', upsertedProfile?.id);

  } catch (error) {
    console.error('Error in regeneratePMProfile:', error);
    throw error;
  }
}