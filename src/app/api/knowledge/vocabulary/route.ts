import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { RecordVocabularyDefinitionRequest } from '@/types/knowledge';
import { getAuthServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const body: RecordVocabularyDefinitionRequest = await request.json();
    const { session_id, term, user_definition, domain_tags, usage_context, related_terms } = body;

    if (!session_id || !term || !user_definition) {
      return NextResponse.json({ error: 'Session ID, term, and definition are required' }, { status: 400 });
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

    // Insert or update vocabulary definition (upsert for PM glossary)
    const { data: vocabularyDefinition, error } = await supabase
      .from('vocabulary_definitions')
      .upsert({
        session_id,
        user_email: session.user.email,
        term,
        user_definition,
        domain_tags: domain_tags || [],
        usage_context,
        related_terms: related_terms || []
      }, {
        onConflict: 'user_email,term'
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording vocabulary definition:', error);
      return NextResponse.json({ error: 'Failed to record vocabulary definition' }, { status: 500 });
    }

    return NextResponse.json({ vocabularyDefinition });

  } catch (error) {
    console.error('Error in vocabulary interaction API:', error);
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
    const term = url.searchParams.get('term');
    const domain = url.searchParams.get('domain');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = supabase
      .from('vocabulary_definitions')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (term) {
      query = query.ilike('term', `%${term}%`);
    }

    if (domain) {
      query = query.contains('domain_tags', [domain]);
    }

    const { data: vocabularyDefinitions, error } = await query;

    if (error) {
      console.error('Error fetching vocabulary definitions:', error);
      return NextResponse.json({ error: 'Failed to fetch vocabulary definitions' }, { status: 500 });
    }

    return NextResponse.json({ vocabularyDefinitions });

  } catch (error) {
    console.error('Error in vocabulary interactions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}