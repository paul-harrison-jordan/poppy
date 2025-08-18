import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { enrichFeedback } from '@/lib/services/openaiService';
import { openai, createFeedbackVectorStore } from '@/lib/openai-vector';

interface FeedbackRow {
  RECIPIENT_EMAIL: string;
  GMV: string;
  NPS_VERBATIM: string;
  NPS_SCORE_RAW: string;
  SURVEY_END_DATE: Date;
  row_number: number;
  KLAVIYO_ACCOUNT_ID: string;
  FIRST_NAME: string;
}

let feedbackVectorStoreId: string | null = null;

async function getFeedbackVectorStore() {
  if (!feedbackVectorStoreId) {
    feedbackVectorStoreId = await createFeedbackVectorStore();
  }
  return feedbackVectorStoreId;
}

export const POST = withAuth(async (session, request: Request) => {
  try {
    const { rows } = await request.json();
    
    const feedbackTexts = rows
      .filter((row: FeedbackRow) => row.NPS_VERBATIM && typeof row.NPS_VERBATIM === 'string' && row.NPS_VERBATIM.trim().length > 0);

    if (feedbackTexts.length === 0) {
      return NextResponse.json({ error: 'No valid feedback texts to embed' }, { status: 400 });
    }

    const vectorStoreId = await getFeedbackVectorStore();
    
    // Process each feedback item
    const uploadResults = await Promise.all(
      feedbackTexts.map(async (row: FeedbackRow) => {
        // Enrich feedback with keywords and analysis
        const { enrichedText } = await enrichFeedback(row.NPS_VERBATIM);
        
        // Create a structured document for the feedback
        const documentContent = `
Customer Feedback:
${row.NPS_VERBATIM}

Enriched Analysis:
${enrichedText}

Metadata:
- NPS Score: ${row.NPS_SCORE_RAW}
- GMV: ${row.GMV}
- Survey Date: ${row.SURVEY_END_DATE}
- Customer: ${row.FIRST_NAME || 'Unknown'}
- Account ID: ${row.KLAVIYO_ACCOUNT_ID}
`;
        
        // Upload to vector store
        const file = await openai.files.create({
          file: new Blob([documentContent], { type: 'text/plain' }),
          purpose: 'assistants'
        });
        
        const vectorStoreFile = await openai.beta.vectorStores.files.createAndPoll(
          vectorStoreId,
          { file_id: file.id }
        );
        
        return {
          fileId: vectorStoreFile.id,
          rowNumber: row.row_number
        };
      })
    );

    return NextResponse.json({
      message: 'Feedback embedded and stored successfully',
      count: uploadResults.length,
      vectorStoreId
    });
  } catch (error) {
    console.error('Error embedding feedback:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});