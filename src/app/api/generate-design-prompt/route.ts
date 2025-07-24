import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { getAuthServerSession } from '@/lib/auth';
import { createServiceClient } from '@/utils/supabase/service';

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
    const completion = await openai.chat.completions.create({
      model: 'o4-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert UX designer and PM who creates design prompts for user testing.

Your goal is to analyze a PRD and create a design prompt that:
1. Highlights the core value proposition of the feature
2. Shows key user workflows and interactions
3. Makes the feature's benefits immediately clear to users in testing
4. Focuses on usability and value demonstration over visual polish

${pmProfile ? `
PM Profile Context:
- Product Philosophy: ${pmProfile.product_philosophy || 'Not specified'}
- Decision Frameworks: ${JSON.stringify(pmProfile.decision_frameworks || {})}
- Trade-off Preferences: ${JSON.stringify(pmProfile.trade_off_preferences || {})}
- Domain Expertise: ${(pmProfile.domain_expertise || []).join(', ')}
- Vocabulary: ${Object.keys(pmProfile.vocabulary_glossary || {}).join(', ')}

Use this PM's specific terminology and align with their decision-making style.
` : ''}

Return JSON with:
- "design_summary": 2-3 sentence summary of what to design and why
- "value_props": Array of 3-5 key value propositions this design should demonstrate
- "user_workflows": Array of 2-3 critical user workflows to show
- "testing_focus": What specific aspects should be emphasized for user testing
- "design_prompt": Complete prompt for v0 design generation`,
        },
        {
          role: 'user',
          content: `Analyze this PRD and create a design prompt focused on demonstrating feature value for user testing:

${prdText}`,
        },
      ],
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const designData = JSON.parse(response);
    
    console.log('Design prompt generated:', {
      designSummary: designData.design_summary?.substring(0, 100) + '...',
      valuePropsCount: designData.value_props?.length || 0,
      workflowsCount: designData.user_workflows?.length || 0
    });

    return NextResponse.json({
      success: true,
      designSummary: designData.design_summary,
      valueProps: designData.value_props,
      userWorkflows: designData.user_workflows,
      testingFocus: designData.testing_focus,
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