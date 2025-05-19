import { NextResponse } from 'next/server';
import { getUserIndex } from '@/lib/pinecone';

import { withAuth } from '@/lib/api';
import { OpenAI } from 'openai';

import { embedChunks } from '@/app/embed';


export interface Question {
  id?: string;
  text: string;
  reasoning: string;
}

export interface QuestionsResponse {
  questions: Question[];
}

export const POST = withAuth(async (session, request: Request) => {
  try {

    const formattedUsername = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const indexName = `${formattedUsername}`;
    const index = getUserIndex(indexName);
    const { title, query } = await request.json();

    const embeddings = await embedChunks([`${title}\n${query}`]);
    const embedding = embeddings[0]['embedding'];

    if (!Array.isArray(embedding) || !embedding.every(n => typeof n === 'number')) {
      console.error('Invalid embedding format:', embedding);
      throw new Error('Invalid embedding format');
    }

    const queryResponse = await index.namespace('ns1').query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    const relevantContext = queryResponse.matches
      ?.map(match => match.metadata?.text || '')
      .join('\n\n') || '';

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a brand messaging expert helping to create effective brand messaging. Please generate 3 specific questions in JSON format that would help create impactful brand messaging based on the title and initial query. Make the questions focused on understanding the brand's identity, target audience, and messaging goals.

          Be a brand clarity creator. Your job is to create clarity about the brand's identity, values, and messaging goals. It is your job to reduce ambiguity and ensure the messaging aligns with the brand's vision.

          Know the brand. You need to understand the brand's identity, values, and target audience to create effective messaging. Learn about the brand so you can help craft messaging that resonates.

          Be strategic. You have your own point of view on how the brand should communicate, but you listen and adapt as you learn more about the brand. Think: Strong opinions, loosely held.

          Be detail oriented. You care deeply about the details of brand messaging, but know that messaging will evolve. You pay thorough attention to details while guiding towards effective communication.

          Push the envelope. You think beyond what already exists and what people are talking about today. You imagine what the brand can become tomorrow based on the trajectories you observe today.

          Here is some relevant context from similar brand messaging:
          ${relevantContext}

          Please respond with a JSON object containing an array of questions, where each question has an 'id' and 'text' property. The JSON object should also have a reasoning property, where you outline why you asked the question. For example:
          {
            "questions": [
              {
                "id": "q1",
                "text": "What is your brand's unique value proposition?",
                "reasoning": "This question helps understand what makes the brand unique and how to communicate that effectively."
              },
              {
                "id": "q2",
                "text": "Who is your primary target audience?",
                "reasoning": "This question helps tailor the messaging to resonate with the right audience."
              },
              {
                "id": "q3",
                "text": "What emotions do you want your brand to evoke?",
                "reasoning": "This question helps create messaging that connects emotionally with the audience."
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Our goal is to return 3 questions that a brand messaging expert would ask to help create effective brand messaging. Use the following as background for the types of answers your questions should elicit. I want you to think like an experienced brand messaging expert.

          Title: ${title}\nQuery: ${query}`
        }
      ],
      model: "o4-mini",
      response_format: { type: "json_object" },
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    const questions = Array.isArray(response.questions) 
      ? response.questions.slice(0, 3).map((q: Question) => ({
          id: q.text,
          text: q.text,
          reasoning: q.reasoning,
        }))
      : [];

    return NextResponse.json({ questions: questions as QuestionsResponse });
  } catch (error) {
    console.error('Error generating brand messaging questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate brand messaging questions' },
      { status: 500 }
    );
  }
}); 
