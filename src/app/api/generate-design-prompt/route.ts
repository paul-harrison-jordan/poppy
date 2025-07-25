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
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
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

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const designData = JSON.parse(response);
    
    console.log('Design prompt generated:', {
      designSummary: designData.design_summary?.substring(0, 100) + '...',
      hasWorkflow: !!designData.primary_workflow
    });

    // Now call v0 to create the design with the generated prompt
    console.log('Calling v0 to create design with prompt:', designData.design_prompt?.substring(0, 100) + '...');
    
    const v0Response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/v0-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: designData.design_prompt
      }),
    });

    if (!v0Response.ok) {
      const errorData = await v0Response.json();
      throw new Error(errorData.error || 'Failed to create v0 design');
    }

    const v0Result = await v0Response.json();
    
    console.log('V0 design created:', {
      chatId: v0Result.chatId,
      demoUrl: v0Result.demoUrl ? 'Present' : 'Not available'
    });

    return NextResponse.json({
      success: true,
      designSummary: designData.design_summary,
      primaryWorkflow: designData.primary_workflow,
      designPrompt: designData.design_prompt,
      pmProfileUsed: !!pmProfile,
      // v0 response data
      chatId: v0Result.chatId,
      chatUrl: v0Result.chatUrl,
      demoUrl: v0Result.demoUrl
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