import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { generateContent, type GenerateContentRequest } from '@/lib/services/openaiService';
import { createServiceClient } from '@/utils/supabase/service';
import { Session } from 'next-auth';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (session: Session, request: Request) => {
  try {
    const body = (await request.json()) as GenerateContentRequest;
    
    // Fetch pm-profile from Supabase
    const supabase = createServiceClient();
    const { data: pmProfile } = await supabase
      .from('pm_preference_profiles')
      .select('*')
      .eq('user_email', session.user?.email)
      .single();

    return await generateContent({ ...body, pmProfile });
  } catch (err) {
    console.error('generate-content error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 },
    );
  }
});
