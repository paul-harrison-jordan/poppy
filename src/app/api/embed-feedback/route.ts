import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getUserIndex } from '@/lib/pinecone';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

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

async function enrichFeedback(feedback: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are a system that analyzes customer feedback and extracts key themes, topics, and sentiment. 
        For the given feedback, identify the main topics, themes, and any specific product features or issues mentioned.
        Return a JSON object with the following structure:
        {
          "topics": ["topic1", "topic2", ...],
          "themes": ["theme1", "theme2", ...],
          "features": ["feature1", "feature2", ...],
          "sentiment": "positive" | "negative" | "neutral"
        }`
      },
      {
        role: "user",
        content: feedback
      }
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" }
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');
  return `${feedback}\n\nTopics: ${analysis.topics.join(', ')}\nThemes: ${analysis.themes.join(', ')}\nFeatures: ${analysis.features.join(', ')}\nSentiment: ${analysis.sentiment}`;
}

export const POST = withAuth(async (session, request: Request) => {
  try {

    const index = getUserIndex('feedback');
    const { rows } = await request.json();

    // Get embeddings for all feedback
    const feedbackTexts = rows
      .map((row: FeedbackRow) => row.NPS_VERBATIM)
      .filter((text: string | undefined) => text && typeof text === 'string' && text.trim().length > 0);

    if (feedbackTexts.length === 0) {
      return NextResponse.json({ error: 'No valid feedback texts to embed' }, { status: 400 });
    }

    // Enrich each feedback with keywords and analysis
    const enrichedFeedback = await Promise.all(
      feedbackTexts.map((text: string) => enrichFeedback(text))
    );

    const embeddings = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: enrichedFeedback,
    });

    // Create Pinecone records - only for rows with valid feedback
    const vectors = rows
      .filter((row: FeedbackRow) => row.NPS_VERBATIM && typeof row.NPS_VERBATIM === 'string' && row.NPS_VERBATIM.trim().length > 0)
      .map((row: FeedbackRow, i: number) => ({
        id: nanoid(),
        values: embeddings.data[i].embedding,
        metadata: {
          GMV: row.GMV,
          NPS_VERBATIM: row.NPS_VERBATIM,
          NPS_SCORE_RAW: row.NPS_SCORE_RAW,
          SURVEY_END_DATE: row.SURVEY_END_DATE,
          row_number: row.row_number,
          KLAVIYO_ACCOUNT_ID: row.KLAVIYO_ACCOUNT_ID,
          enriched_text: enrichedFeedback[i]
        }
      }));

    // Upsert to Pinecone
    await index.namespace('feedback').upsert(vectors);

    return NextResponse.json({
      message: 'Feedback embedded and stored successfully',
      count: vectors.length
    });
  } catch (error) {
    console.error('Error embedding feedback:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}); 
