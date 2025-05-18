import { NextResponse } from 'next/server';
import { getUserIndex } from '@/lib/pinecone';
import { getAuthServerSession } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { embedChunks } from '@/app/embed';
import { Question } from '@/types/question';


export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession();
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formattedUsername = authSession.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const indexName = `${formattedUsername}`;
    const index = getUserIndex(indexName);
    const { title, query, questions } = await request.json() as {
      title: string;
      query: string;
      questions: Question[];
    };

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

    // Format questions and answers for the prompt
    const qaContext = questions.map((q: Question) => 
      `Question: ${q.text}\nAnswer: ${q.answer}`
    ).join('\n\n');

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

          Here is some relevant context from similar brand messaging:
          ${relevantContext}
          
          I want you to return a brand messaging and positioning document based on this and return it in markdown format. 
          `
        },
        {
          role: "user",
          content: `Create a comprehensive brand messaging document based on the following information: ${title}${query} Questions and Answers:${qaContext}
          
          I want you to think hard about how to position the brand based on the information provided and return a brand messaging and positioning document based on this and return it in markdown format.
          `
        }
      ],
      model: "o3",
    });

    const response = completion.choices[0].message.content
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating brand messaging:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate brand messaging' },
      { status: 500 }
    );
  }
} 