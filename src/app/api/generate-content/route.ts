import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { OpenAI } from 'openai';
import { writeSummary } from '@/app/search';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ContentType = 'prd' | 'brand';

interface GenerateContentRequest {
  type: ContentType;
  title: string;
  query: string;
  questions: string[];
  storedContext?: string; // Only used for PRD generation
  additionalContext: string;
}

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { type, title, query, questions, storedContext, additionalContext } = await request.json() as GenerateContentRequest;
    
    let content: string;

    if (type === 'prd') {
      if (!storedContext) {
        return NextResponse.json({ error: 'Stored context required for PRD generation' }, { status: 400 });
      }

      const parsed = JSON.parse(storedContext);
      const summary = await writeSummary(
        query,
        additionalContext,
        parsed.teamStrategy,
        parsed.howYouThinkAboutProduct,
        parsed.pillarGoalsKeyTermsBackground,
        parsed.examplesOfHowYouThink,
        questions, // Convert questions to array of strings
         // Convert matchedContext to array of strings
      );
      
      if (!summary) {
        throw new Error('Failed to generate PRD content');
      }
      content = summary;
    } else {
      // Brand messaging generation
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a brand messaging expert helping to create effective brand messaging. Based on the provided questions and answers, create a comprehensive brand messaging document.

            Be a brand clarity creator. Your job is to create clarity about the brand's identity, values, and messaging goals. It is your job to reduce ambiguity and ensure the messaging aligns with the brand's vision.

            Know the brand. You need to understand the brand's identity, values, and target audience to create effective messaging. Learn about the brand so you can help craft messaging that resonates.

            Be strategic. You have your own point of view on how the brand should communicate, but you listen and adapt as you learn more about the brand. Think: Strong opinions, loosely held.

            Be detail oriented. You care deeply about the details of brand messaging, but know that messaging will evolve. You pay thorough attention to details while guiding towards effective communication.

            Push the envelope. You think beyond what already exists and what people are talking about today. You imagine what the brand can become tomorrow based on the trajectories you observe today.
            `
          },
          {
            role: "user",
            content: `Create a comprehensive brand messaging document based on the following information: ${title}${query} Questions and Answers: ${questions}
            
            I want you to think hard about how to position the brand based on the information provided and return a brand messaging and positioning document based on this and return it in markdown format.
            `
          }
        ],
        model: "o3",
      });

      const generatedContent = completion.choices[0].message.content;
      if (!generatedContent) {
        throw new Error('Failed to generate brand messaging content');
      }
      content = generatedContent;
    }

    return NextResponse.json({ content, title });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
} 