import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

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

    // Create embedding for the PRD summary
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: prdSummary,
    });

    // Query Pinecone feedback index for similar feedback
    const index = pc.index('feedback');
    const queryResponse = await index.namespace('feedback').query({
      vector: embedding.data[0].embedding,
      topK: 10,
      includeMetadata: true
    });

    if (!queryResponse?.matches || queryResponse.matches.length === 0) {
      console.log('No customer feedback matches found');
      return NextResponse.json({ matches: [] });
    }

    // Process matches and extract the required fields
    const customerFeedback: CustomerFeedback[] = queryResponse.matches
      .map(match => {
        const metadata = match.metadata as Record<string, unknown>;
        return {
          gmv: (metadata.GMV as string) || '',
          klaviyo_account_id: (metadata.KLAVIYO_ACCOUNT_ID as string) || '',
          nps_score_raw: (metadata.NPS_SCORE_RAW as string) || '',
          nps_verbatim: (metadata.NPS_VERBATIM as string) || '',
          survey_end_date: (metadata.SURVEY_END_DATE as string) || '',
          match_score: match.score || 0,
          row_number: (metadata.row_number as number) || 0
        };
      })
      // Filter out any matches without essential data
      .filter(feedback => feedback.nps_verbatim && feedback.klaviyo_account_id);

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