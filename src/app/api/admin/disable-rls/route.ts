import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    // This is a temporary admin endpoint to disable RLS for debugging
    // In production, this should be removed or protected with admin auth
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Try to disable RLS on knowledge tables using SQL
    const queries = [
      'ALTER TABLE user_knowledge_sessions DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE vocabulary_definitions DISABLE ROW LEVEL SECURITY', 
      'ALTER TABLE question_responses DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE pm_preference_profiles DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE learning_analytics DISABLE ROW LEVEL SECURITY'
    ];

    const results = [];
    
    for (const query of queries) {
      const { data, error } = await supabase.rpc('exec_sql', { sql: query });
      results.push({ query, data, error });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attempted to disable RLS',
      results 
    });

  } catch (error) {
    console.error('Error disabling RLS:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to disable RLS',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}