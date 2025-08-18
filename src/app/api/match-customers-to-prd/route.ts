import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { searchVectorStore, createFeedbackVectorStore } from '@/lib/openai-vector';

let feedbackVectorStoreId: string | null = null;
let feedbackAssistantId: string | null = null;

async function getFeedbackStore() {
  if (!feedbackVectorStoreId) {
    feedbackVectorStoreId = await createFeedbackVectorStore();
    
    const assistant = await openai.beta.assistants.create({
      name: 'Feedback Assistant',
      instructions: 'You are a helpful assistant that searches through customer feedback.',
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [feedbackVectorStoreId]
        }
      }
    });
    
    feedbackAssistantId = assistant.id;
  }
  
  return { feedbackVectorStoreId, feedbackAssistantId };
}

interface CustomerFeedback {
  gmv: string;
  klaviyo_account_id: string;
  nps_score_raw: string;
  nps_verbatim: string;
  survey_end_date: string;
  match_score: number;
  row_number: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prdSummary } = await request.json();
    
    if (!prdSummary) {
      return NextResponse.json({ error: 'PRD summary is required' }, { status: 400 });
    }

    console.log('Searching for customer feedback matches:', { 
      summaryLength: prdSummary.length,
      summary: prdSummary.substring(0, 100) + '...'
    });

    // Get feedback store and search for matches
    const { feedbackAssistantId, feedbackVectorStoreId } = await getFeedbackStore();
    
    if (!feedbackAssistantId || !feedbackVectorStoreId) {
      return NextResponse.json({ error: 'Feedback store not initialized' }, { status: 500 });
    }

    const results = await searchVectorStore(
      feedbackAssistantId,
      feedbackVectorStoreId,
      prdSummary,
      10
    );

    if (!results || results.length === 0) {
      console.log('No customer feedback matches found');
      return NextResponse.json({ matches: [] });
    }

    // For now, return a simplified response since the new format doesn't have structured metadata
    // In the future, you may want to parse the content to extract structured feedback data
    const customerFeedback: CustomerFeedback[] = results.map((result, index) => ({
      gmv: '',  // Would need to parse from content
      klaviyo_account_id: `match-${index}`,
      nps_score_raw: '',  // Would need to parse from content
      nps_verbatim: result.content,
      survey_end_date: '',  // Would need to parse from content
      match_score: 0.8, // Static score since we don't have the numerical score
      row_number: index + 1
    }));

    console.log(`Found ${customerFeedback.length} customer feedback matches`);

    return NextResponse.json({
      success: true,
      matches: customerFeedback,
      matchCount: customerFeedback.length
    });

  } catch (error) {
    console.error('Error matching customer feedback:', error);
    return NextResponse.json({
      error: 'Failed to match customer feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}