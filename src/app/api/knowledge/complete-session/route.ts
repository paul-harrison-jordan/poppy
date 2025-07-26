import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthServerSession } from '@/lib/auth';
import { SessionContextData } from '@/types/knowledge';

interface CompleteSessionRequest {
  sessionId: number;
  vocabularyAnswers?: Array<{
    term: string;
    definition: string;
    domain_tags?: string[];
    usage_context?: string;
  }>;
  questionAnswers?: Array<{
    question: string;
    reasoning?: string;
    answer: string;
    domain_category?: string;
  }>;
  contextData?: SessionContextData;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CompleteSessionRequest = await request.json();
    const { sessionId, vocabularyAnswers, questionAnswers, contextData } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify session exists and belongs to user
    const { data: knowledgeSession, error: sessionError } = await supabase
      .from('user_knowledge_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_email', session.user.email)
      .single();

    if (sessionError || !knowledgeSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Store vocabulary answers if provided
    if (vocabularyAnswers && vocabularyAnswers.length > 0) {
      const vocabInserts = vocabularyAnswers.map(vocab => ({
        session_id: sessionId,
        user_email: session.user!.email,
        term: vocab.term,
        user_definition: vocab.definition,
        domain_tags: vocab.domain_tags || [],
        usage_context: vocab.usage_context,
        related_terms: []
      }));

      const { error: vocabError } = await supabase
        .from('vocabulary_definitions')
        .upsert(vocabInserts, { onConflict: 'user_email,term' });

      if (vocabError) {
        console.error('Error storing vocabulary definitions:', vocabError);
      }
    }

    // Store question answers if provided
    if (questionAnswers && questionAnswers.length > 0) {
      const questionInserts = questionAnswers.map(qa => ({
        session_id: sessionId,
        user_email: session.user!.email,
        question_text: qa.question,
        question_reasoning: qa.reasoning,
        user_answer: qa.answer,
        domain_category: qa.domain_category,
        context_data: {},
        extracted_insights: {} // This could be enhanced with AI extraction
      }));

      const { error: questionError } = await supabase
        .from('question_responses')
        .insert(questionInserts);

      if (questionError) {
        console.error('Error storing question responses:', questionError);
      }
    }

    // Update session as completed
    const { error: updateError } = await supabase
      .from('user_knowledge_sessions')
      .update({
        completion_status: 'completed',
        context_data: { ...knowledgeSession.context_data, ...contextData },
        duration_seconds: Math.floor((Date.now() - new Date(knowledgeSession.created_at).getTime()) / 1000)
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
    }

    // Trigger PM profile regeneration
    try {
      const profileResponse = await fetch(new URL('/api/knowledge/pm-profile', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (profileResponse.ok) {
        console.log('PM profile regenerated successfully');
      }
    } catch (profileError) {
      console.error('Error regenerating PM profile:', profileError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Session completed and profile updated' 
    });

  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}