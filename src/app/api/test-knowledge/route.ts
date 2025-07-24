import { NextRequest, NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Test authentication
    const session = await getAuthServerSession();
    console.log('Auth session:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      email: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'No authentication session - this is expected when calling via curl',
        session: session ? 'exists but no email' : 'null',
        note: 'Auth test complete - database test skipped due to no auth'
      });
    }

    // Test database connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        db: {
          schema: 'public'
        }
      }
    );
    console.log('Supabase client created');

    // Try to query an existing table to test connection
    const { data: testQuery, error: testError } = await supabase
      .from('prds')
      .select('id')
      .limit(1);

    console.log('Test query result:', { data: testQuery, error: testError });

    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError
      });
    }

    // Test creating a knowledge session with proper RLS bypass
    // First, let's test if RLS is the issue by temporarily using a simple INSERT
    try {
      console.log('Testing direct insert without RLS expectations...');
      
      const { data: knowledgeSession, error: sessionError } = await supabase
        .from('user_knowledge_sessions')
        .insert({
          user_email: session.user.email,
          session_type: 'test',
          context_data: { test: true }
        })
        .select()
        .single();

      console.log('Knowledge session test:', { data: knowledgeSession, error: sessionError });
      
      // If successful, test vocabulary insert too
      if (!sessionError && knowledgeSession) {
        const { data: vocabTest, error: vocabError } = await supabase
          .from('vocabulary_definitions')
          .insert({
            session_id: knowledgeSession.id,
            user_email: session.user.email,
            term: 'test_term',
            user_definition: 'Test definition for debugging'
          })
          .select()
          .single();
          
        console.log('Vocabulary test:', { data: vocabTest, error: vocabError });
        
        return NextResponse.json({
          success: true,
          auth: {
            hasSession: !!session,
            email: session.user.email
          },
          database: {
            connectionTest: !testError,
            sessionCreation: !sessionError,
            vocabularyCreation: !vocabError,
            createdSessionId: knowledgeSession?.id,
            createdVocabId: vocabTest?.id
          },
          errors: {
            testError,
            sessionError,
            vocabError
          }
        });
      }
    } catch (debugError) {
      console.error('Debug test error:', debugError);
      return NextResponse.json({
        success: false,
        error: 'Debug test failed',
        details: debugError instanceof Error ? debugError.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      auth: {
        hasSession: !!session,
        email: session.user.email
      },
      database: {
        connectionTest: !testError,
        sessionCreation: !sessionError,
        createdSessionId: knowledgeSession?.id
      },
      errors: {
        testError,
        sessionError
      }
    });

  } catch (error) {
    console.error('Test knowledge API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}