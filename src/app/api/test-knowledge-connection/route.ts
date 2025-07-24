import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Test if we can create a knowledge session (this will verify RLS bypass)
    const { data: testSession, error } = await supabase
      .from('user_knowledge_sessions')
      .insert({
        user_email: session.user.email,
        session_type: 'brainstorm',
        context_data: { test: true },
        completion_status: 'in_progress'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 });
    }

    // Clean up the test session
    await supabase
      .from('user_knowledge_sessions')
      .delete()
      .eq('id', testSession.id);

    return NextResponse.json({
      success: true,
      message: 'Service role key is working! Knowledge tracking should now work properly.',
      testSessionId: testSession.id
    });

  } catch (error) {
    console.error('Knowledge connection test error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test knowledge connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 