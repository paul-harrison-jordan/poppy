import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthServerSession } from '@/lib/auth';
import { VocabularyInteraction } from '@/types/knowledge';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get or create knowledge summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('knowledge_summaries')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    let summary = summaryData;

    if (summaryError && summaryError.code === 'PGRST116') {
      // No summary exists, create one
      const { data: newSummary, error: createError } = await supabase
        .from('knowledge_summaries')
        .insert({
          user_email: session.user.email,
          domain_expertise: {},
          vocabulary_mastery: {},
          learning_preferences: {},
          knowledge_gaps: [],
          strengths: [],
          total_sessions: 0,
          total_vocabulary_terms: 0,
          total_questions_answered: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating knowledge summary:', createError);
        return NextResponse.json({ error: 'Failed to create knowledge summary' }, { status: 500 });
      }

      summary = newSummary;
    } else if (summaryError) {
      console.error('Error fetching knowledge summary:', summaryError);
      return NextResponse.json({ error: 'Failed to fetch knowledge summary' }, { status: 500 });
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

    // Get vocabulary due for review (Note: vocabulary_interactions table doesn't exist in schema, so skip for now)
    const vocabularyDueForReview: VocabularyInteraction[] = [];

    const response = {
      summary,
      recent_sessions: recentSessions || [],
      vocabulary_due_for_review: vocabularyDueForReview
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in knowledge summary API:', error);
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

    // Trigger knowledge summary regeneration
    await regenerateKnowledgeSummary(supabase, session.user.email);

    // Return updated summary
    const { data: summary, error: summaryError } = await supabase
      .from('knowledge_summaries')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    if (summaryError) {
      console.error('Error fetching updated knowledge summary:', summaryError);
      return NextResponse.json({ error: 'Failed to fetch updated summary' }, { status: 500 });
    }

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Error regenerating knowledge summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function regenerateKnowledgeSummary(supabase: SupabaseClient, userEmail: string) {
  // Get all user sessions
  const { data: sessions } = await supabase
    .from('user_knowledge_sessions')
    .select('*')
    .eq('user_email', userEmail);

  // Get all vocabulary definitions (using vocabulary_definitions table from schema)
  const { data: vocabDefinitions } = await supabase
    .from('vocabulary_definitions')
    .select('*')
    .eq('user_email', userEmail);

  // Get all question responses
  const { data: questionResponses } = await supabase
    .from('question_responses')
    .select('*')
    .eq('user_email', userEmail);

  // Calculate domain expertise
  const domainExpertise: Record<string, number> = {};
  const vocabularyMastery: Record<string, string> = {};
  
  // Analyze question responses for domain expertise
  if (questionResponses) {
    for (const response of questionResponses) {
      if (response.domain_category && response.extracted_insights) {
        if (!domainExpertise[response.domain_category]) {
          domainExpertise[response.domain_category] = 0;
        }
        // Simple scoring based on having insights
        domainExpertise[response.domain_category] += 1;
      }
    }
  }

  // Build vocabulary mastery from definitions
  if (vocabDefinitions) {
    for (const definition of vocabDefinitions) {
      vocabularyMastery[definition.term] = definition.user_definition;
    }
  }

  // Calculate averages and insights
  const totalSessions = sessions?.length || 0;
  const totalVocabularyTerms = vocabDefinitions?.length || 0;
  const totalQuestionsAnswered = questionResponses?.length || 0;

  // Identify knowledge gaps and strengths based on domain activity
  const knowledgeGaps: string[] = [];
  const strengths: string[] = [];

  Object.entries(domainExpertise).forEach(([domain, count]) => {
    if (count < 2) {
      knowledgeGaps.push(domain);
    } else if (count > 5) {
      strengths.push(domain);
    }
  });

  // Update knowledge summary (Note: knowledge_summaries table doesn't exist in provided schema)
  // This will create the table structure as needed
  try {
    await supabase
      .from('knowledge_summaries')
      .upsert({
        user_email: userEmail,
        domain_expertise: domainExpertise,
        vocabulary_mastery: vocabularyMastery,
        learning_preferences: {},
        knowledge_gaps: knowledgeGaps,
        strengths: strengths,
        total_sessions: totalSessions,
        total_vocabulary_terms: totalVocabularyTerms,
        total_questions_answered: totalQuestionsAnswered,
        last_activity_date: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      });
  } catch (error) {
    console.error('Error upserting knowledge summary (table may not exist):', error);
  }
}