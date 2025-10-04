import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
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

    console.log('Generating design prompt for PRD:', {
      prdLength: prdText.length,
      userEmail: session.user.email
    });

    // Generate design summary focused on value proposition
    const designData = await generateDesignPrompt({
      prdText
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
      designPrompt: designData.design_prompt
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