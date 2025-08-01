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
    let completion;
    try {
      completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `Extract key design requirements from a PRD to create a focused design prompt.

Focus on:
1. Core value proposition 
2. Primary user workflow
3. Key UI requirements

${pmProfile?.domain_expertise ? `Domain context: ${pmProfile.domain_expertise.join(', ')}` : ''}

Return JSON with:
- "design_summary": 1-2 sentence summary
- "primary_workflow": Single most important user workflow
- "design_prompt": Concise prompt for v0 (max 200 words)`,
        },
        {
          role: 'user',
          content: `Extract design requirements from this PRD:

${prdText}`,
        },
      ],
    });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw new Error(`OpenAI API failed: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`);
    }

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let designData;
    try {
      designData = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', response);
      throw new Error(`Failed to parse design data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }
    
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