import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { CreateSessionRequest, CreateSessionResponse } from '@/types/knowledge';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const body: CreateSessionRequest = await request.json();
    const { session_type, context_data } = body;

    if (!session_type) {
      return NextResponse.json({ error: 'Session type is required' }, { status: 400 });
    }

    const { data: knowledgeSession, error } = await supabase
      .from('user_knowledge_sessions')
      .insert({
        user_email: session.user.email,
        session_type,
        context_data: context_data || {},
        completion_status: 'in_progress'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating knowledge session:', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const response: CreateSessionResponse = { session: knowledgeSession };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in knowledge sessions API:', error);
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
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const sessionType = url.searchParams.get('session_type');

    let query = supabase
      .from('user_knowledge_sessions')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionType) {
      query = query.eq('session_type', sessionType);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching knowledge sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error in knowledge sessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}