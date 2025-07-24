import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { RecordQuestionResponseRequest } from '@/types/knowledge';
import { pmInsightService } from '@/lib/services/pmInsightService';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const body: RecordQuestionResponseRequest = await request.json();
    const {
      session_id,
      question_text,
      question_reasoning,
      user_answer,
      domain_category,
      context_data
    } = body;

    if (!session_id || !question_text || !user_answer) {
      return NextResponse.json({ 
        error: 'Session ID, question text, and user answer are required' 
      }, { status: 400 });
    }

    // Verify session exists and belongs to user
    const { data: knowledgeSession, error: sessionError } = await supabase
      .from('user_knowledge_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_email', session.user.email)
      .single();

    if (sessionError || !knowledgeSession) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Extract PM insights from the question-answer pair
    const extractedInsights = await pmInsightService.extractQuestionInsights(
      question_text,
      question_reasoning,
      user_answer,
      domain_category
    );

    const { data: questionResponse, error } = await supabase
      .from('question_responses')
      .insert({
        session_id,
        user_email: session.user.email,
        question_text,
        question_reasoning,
        user_answer,
        domain_category,
        context_data: context_data || {},
        extracted_insights: extractedInsights
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording question response:', error);
      return NextResponse.json({ error: 'Failed to record question response' }, { status: 500 });
    }

    return NextResponse.json({ questionResponse });

  } catch (error) {
    console.error('Error in question response API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const domainCategory = url.searchParams.get('domain_category');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = supabase
      .from('question_responses')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', parseInt(sessionId));
    }

    if (domainCategory) {
      query = query.eq('domain_category', domainCategory);
    }

    const { data: questionResponses, error } = await query;

    if (error) {
      console.error('Error fetching question responses:', error);
      return NextResponse.json({ error: 'Failed to fetch question responses' }, { status: 500 });
    }

    return NextResponse.json({ questionResponses });

  } catch (error) {
    console.error('Error in question responses API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}