import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthServerSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const userEmail = session.user.email;

    console.log('Testing PM profile creation for user:', userEmail);

    // Step 1: Check if any knowledge data exists
    const [
      { data: sessions, error: sessionsError },
      { data: vocabDefinitions, error: vocabError },
      { data: questionResponses, error: questionsError }
    ] = await Promise.all([
      supabase.from('user_knowledge_sessions').select('*').eq('user_email', userEmail),
      supabase.from('vocabulary_definitions').select('*').eq('user_email', userEmail),
      supabase.from('question_responses').select('*').eq('user_email', userEmail)
    ]);

    if (sessionsError) {
      console.error('Sessions error:', sessionsError);
    }
    if (vocabError) {
      console.error('Vocab error:', vocabError);
    }
    if (questionsError) {
      console.error('Questions error:', questionsError);
    }

    console.log('Found data:', {
      sessions: sessions?.length || 0,
      vocabulary: vocabDefinitions?.length || 0,
      questions: questionResponses?.length || 0
    });

    // Step 2: Try to create a basic PM profile
    const { data: testProfile, error: createError } = await supabase
      .from('pm_preference_profiles')
      .upsert({
        user_email: userEmail,
        vocabulary_glossary: { 'test': 'definition' },
        decision_frameworks: { 'test_framework': 'test approach' },
        trade_off_preferences: { 'test_tradeoff': 'test preference' },
        product_philosophy: 'Test philosophy',
        recurring_themes: ['testing'],
        domain_expertise: ['testing'],
        total_sessions: sessions?.length || 0,
        total_vocabulary_terms: vocabDefinitions?.length || 0,
        total_questions_answered: questionResponses?.length || 0,
        last_activity_date: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      })
      .select()
      .single();

    if (createError) {
      console.error('Profile creation error:', createError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create PM profile',
        details: createError,
        data: {
          sessions: sessions?.length || 0,
          vocabulary: vocabDefinitions?.length || 0,
          questions: questionResponses?.length || 0
        }
      }, { status: 500 });
    }

    console.log('PM profile created successfully:', testProfile);

    return NextResponse.json({
      success: true,
      message: 'PM profile test successful',
      profile: testProfile,
      data: {
        sessions: sessions?.length || 0,
        vocabulary: vocabDefinitions?.length || 0,
        questions: questionResponses?.length || 0
      }
    });

  } catch (error) {
    console.error('PM profile test error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'PM profile test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 