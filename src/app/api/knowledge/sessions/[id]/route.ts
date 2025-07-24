import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { UpdateSessionRequest } from '@/types/knowledge';
import { getAuthServerSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const resolvedParams = await params;

    const sessionId = parseInt(resolvedParams.id);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const body: UpdateSessionRequest = await request.json();
    const updateData: any = {};

    if (body.duration_seconds !== undefined) {
      updateData.duration_seconds = body.duration_seconds;
    }
    if (body.completion_status !== undefined) {
      updateData.completion_status = body.completion_status;
    }
    if (body.context_data !== undefined) {
      updateData.context_data = body.context_data;
    }

    const { data: knowledgeSession, error } = await supabase
      .from('user_knowledge_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_email', session.user.email)
      .select()
      .single();

    if (error) {
      console.error('Error updating knowledge session:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    if (!knowledgeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: knowledgeSession });

  } catch (error) {
    console.error('Error in knowledge session update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const resolvedParams = await params;

    const sessionId = parseInt(resolvedParams.id);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const { data: knowledgeSession, error } = await supabase
      .from('user_knowledge_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_email', session.user.email)
      .single();

    if (error) {
      console.error('Error fetching knowledge session:', error);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!knowledgeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: knowledgeSession });

  } catch (error) {
    console.error('Error in knowledge session fetch API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}