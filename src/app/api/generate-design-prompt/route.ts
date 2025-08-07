import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { createServiceClient } from '@/utils/supabase/service';
import { generateDesignPrompt } from '@/lib/services/openaiService';

export async function POST(request: Request) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prdText } = await request.json();

    if (!prdText) {
      return NextResponse.json({ error: 'PRD text is required' }, { status: 400 });
    }

    // Fetch pm-profile from Supabase
    const supabase = createServiceClient();
    const { data: pmProfile } = await supabase
      .from('pm_preference_profiles')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    console.log('Generating design prompt for PRD with PM profile:', {
      prdLength: prdText.length,
      hasPmProfile: !!pmProfile,
      userEmail: session.user.email
    });

    // Generate design summary focused on value proposition
    const designData = await generateDesignPrompt({
      prdText,
      pmProfile
    });
    
    // Validate the generated data
    if (!designData.design_prompt) {
      throw new Error('No design prompt generated from OpenAI response');
    }
    
    if (!designData.design_summary) {
      console.warn('No design summary generated, using fallback');
      designData.design_summary = 'Design generated from PRD';
    }
    
    console.log('Design prompt generated:', {
      designSummary: designData.design_summary?.substring(0, 100) + '...',
      hasWorkflow: !!designData.primary_workflow,
      promptLength: designData.design_prompt?.length
    });

    return NextResponse.json({
      success: true,
      designSummary: designData.design_summary,
      primaryWorkflow: designData.primary_workflow,
      designPrompt: designData.design_prompt,
      pmProfileUsed: !!pmProfile
    });

  } catch (error) {
    console.error('Error generating design prompt:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate design prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 