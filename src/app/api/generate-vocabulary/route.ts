import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { generateVocabulary } from '@/lib/services/openaiService';
import { createServiceClient } from '@/utils/supabase/service';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  const startTime = Date.now();
  try {
    const { title, query, matchedContext, type, teamTerms } = await request.json();
    console.log(`[generate-vocabulary] Request parsed in ${Date.now() - startTime}ms`);
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Fetch pm-profile from Supabase
    const dbStart = Date.now();
    const supabase = createServiceClient();
    const { data: pmProfile } = await supabase
      .from('pm_preference_profiles')
      .select('*')
      .eq('user_email', session.user?.email)
      .single();
    console.log(`[generate-vocabulary] DB query took ${Date.now() - dbStart}ms`);

    const vocabStart = Date.now();
    const result = await generateVocabulary({ 
      title, 
      query, 
      matchedContext, 
      type, 
      teamTerms,
      pmProfile 
    });
    console.log(`[generate-vocabulary] Vocabulary generation took ${Date.now() - vocabStart}ms`);
    console.log(`[generate-vocabulary] Total request time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating vocabulary:', error);
    console.log(`[generate-vocabulary] Error after ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate vocabulary' },
      { status: 500 }
    );
  }
});
