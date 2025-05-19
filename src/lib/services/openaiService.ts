import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai } from '../openai';
import { terms } from '../constants/terms';

export { terms };

export function streamTextResponse(iterable: AsyncIterable<OpenAI.ChatCompletionChunk>, contentType = 'text/markdown') {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of iterable) {
        controller.enqueue(encoder.encode(chunk.choices[0]?.delta?.content ?? ''));
      }
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Cache-Control': 'no-cache',
    },
  });
}

export interface GenerateContentRequest {
  type: 'prd' | 'brand';
  title: string;
  query: string;
  questions: string[];
  storedContext?: string;
  additionalContext: string;
  teamTerms: Record<string, string>;
}

export async function generateContent(opts: GenerateContentRequest) {
  const { type, title, query, questions, storedContext, additionalContext, teamTerms } = opts;
  if (type === 'prd') {
    if (!storedContext) throw new Error('Stored context required for PRD generation');
    const ctx = JSON.parse(storedContext);
    const stream = await openai.chat.completions.create({
      model: 'o3',
      stream: true,
      messages: [
        {
          role: 'user',
          content:`I have  included a list of key terms that you may need to use to generate your response. Use this as background information to help you understand the rest of the prompt. ${Object.keys(terms).join(', ')}

I've also included a list of key terms that my team has defined for our product. Use this as background information to help you understand the rest of the prompt. ${Object.keys(teamTerms).join(', ')}

I've included instructions for how to think and write PRDs like a product manager with" ${ctx.examplesOfHowYouThink} "I've also included background on how to think like my product team" ${ctx.pillarGoalsKeyTermsBackground} "I've included an example document to demonstrate my personal philosophy on how we should approach building a product to cross sell to existing users" ${ctx.howYouThinkAboutProduct} "I've included a doc that outlines the strategic goals of the my product team for the rest of the year" ${ctx.teamStrategy} I've included example text from work that my team has already done that I want for you to use as additional context for relevant features and terms" ${additionalContext} "I've asked you to write a PRD for the following question" ${query} "I've also included a list of questions and answers about the PRD to provide additional clarity around how we should approach the PRD." ${questions.join('\n')} "When I ask you to write a doc, I want you to evaluate the Job to be Done statement I provide from each perspective (Product Manager, My product team, and Building a product that grows with its users) before beginning to write the PRD. Once done with that step, I want you to write the document with a focus on narrow scope, highly detailed breakdowns of which feature will support which part of the JTBD, and an open questions section that interrogates the JTBD from each of your perspectives (my product team, Product Manager, my philosophy) our edits should be returned in markdown format`,
        },
      ],
    });
    return streamTextResponse(stream);
  }

  const stream = await openai.chat.completions.create({
    model: 'o3',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are a brand-messaging expert …`,
      },
      {
        role: 'user',
        content: `Create a comprehensive brand-messaging doc in markdown.\n\nTitle: ${title}\nBackground query: ${query}\nQ&A: ${questions.join('\n')}`,
      },
    ],
  });
  return streamTextResponse(stream);
}

export interface Question { id?: string; text: string; reasoning: string; }
export interface QuestionsResponse { questions: Question[]; internalTerms: string[]; }
export interface GenerateQuestionsRequest {
  title: string;
  query: string;
  matchedContext: string;
  storedContext: string;
  teamTerms: string;
  type?: string;
}

export async function generateQuestions(opts: GenerateQuestionsRequest): Promise<QuestionsResponse> {
  const { title, query, matchedContext, storedContext, teamTerms, type = 'prd' } = opts;
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: type === 'prd'
          ? `You are a system that helps a product manager write a PRD. You will be given a title and query for a new PRD, as well as relevant context from previous PRDs or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of terms over time.

You must respond with a JSON object containing two arrays:
1. questions: An array of question objects, each with id, text, and reasoning fields
2. internalTerms: An array of terms that need clarification

Example JSON response:
{
  "questions": [
    {
      "id": "1",
      "text": "What is the primary problem this feature solves?",
      "reasoning": "Understanding the core problem helps ensure we're building the right solution."
    },
    {
      "id": "2",
      "text": "Who are the primary users of this feature?",
      "reasoning": "Identifying target users helps tailor the solution to their needs."
    }
  ],
  "internalTerms": ["Profile", "Active profile", "Suppressed profile"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
${Object.keys(terms).join(', ')}`
          : `You are a system that helps a strategic leader write a strategy document. You will be given a title and query for a new strategy, as well as relevant context from previous strategies or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of strategic terms over time.

You must respond with a JSON object containing two arrays:
1. questions: An array of question objects, each with id, text, and reasoning fields
2. internalTerms: An array of terms that need clarification

Example JSON response:
{
  "questions": [
    {
      "id": "1",
      "text": "What is the long-term vision for this strategic initiative?",
      "reasoning": "Understanding the long-term vision helps align all stakeholders and guide decision-making."
    },
    {
      "id": "2",
      "text": "What are the key market opportunities and challenges?",
      "reasoning": "Identifying market dynamics helps shape the strategic approach."
    }
  ],
  "internalTerms": ["Market penetration", "Competitive advantage"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a strategic leader would ask.
${Object.keys(terms).join(', ')}`,
      },
      {
        role: 'user',
        content: `\n          Title: ${title}\nQuery: ${query}, \nContext: ${matchedContext}, teamTerms: ${teamTerms}, storedContext: ${storedContext}: klaviyoTerms: ${terms}`,
      },
    ],
    model: 'o3',
    response_format: { type: 'json_object' },
  });

  try {
    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Validate the response structure
    if (!response.questions || !Array.isArray(response.questions)) {
      console.error('Invalid questions response format:', response);
      return { questions: [], internalTerms: [] };
    }

    // Ensure each question has the required fields
    const validQuestions = response.questions.filter((q: { id?: string; text?: string; reasoning?: string }) => 
      q && typeof q === 'object' && 
      typeof q.id === 'string' && 
      typeof q.text === 'string' && 
      typeof q.reasoning === 'string'
    );

    // Ensure internalTerms is an array
    const internalTerms = Array.isArray(response.internalTerms) ? response.internalTerms : [];

    return {
      questions: validQuestions,
      internalTerms
    };
  } catch (error) {
    console.error('Error parsing questions response:', error);
    return { questions: [], internalTerms: [] };
  }
}

export interface BrainstormMessage { role: 'user' | 'assistant'; content: string; }
export interface BrainstormRequest {
  messages: BrainstormMessage[];
  additionalContext: string;
  teamTerms: Record<string, string>;
  storedContext: string;
  startPrd?: boolean;
}

export async function brainstorm(opts: BrainstormRequest) {
  const { messages, additionalContext, teamTerms, storedContext, startPrd } = opts;
  const formattedTeamTerms = Object.entries(teamTerms)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  const ctx = JSON.parse(storedContext);
  let systemPrompt = '';
  if (startPrd) {
    systemPrompt = `You are an expert product manager. Review and analyze the conversation between the user and the assistant. Summarize the conversation so that it can be used to draft a PRD. When reviewing, make sure to evaluate it from each of the users perspectives.

Here is the user's personal context:
${ctx.personalContext}

Here is the user's team context:
${ctx.teamContext}

Here is how the user wants you think about writing the PRD:
${ctx.prdInstructions}

Here is a list of key terms about core features of our company:
${terms}

Your summary should be a few paragraphs that capture the key questions and information the user was working with, and the decisions they made during the conversation. Your Summary must include the best Job to be done statement that the user is trying to achieve.

you must also add a title to the PRD that captures the key idea of the PRD.

your summary must be returned in JSON format as follows:
{
  "title": "<title of the PRD>",
  "summary": "<summary of the PRD>"
}`;
  } else {
    systemPrompt = `You are a tool being used by a product manager to brainstorm. You may get messages that are about an idea, a problem they're trying to solve, or a feature they're trying to build. Your mission is to expertly coax great ideas out of the user with short, pointed questions and comments that help them think through their idea. Over time, the user should be able to summarize the conversation and use it to draft a PRD.

PMs are trusting you to help them think through their ideas, and have shared some context from PRDs and features you have access to from ${additionalContext}

// Here are the team's key terms:
// ${formattedTeamTerms}

// Here is the user's personal context:
// ${storedContext}

Answer the user's question using the above context and terms. If the context is not enough, say so. You are meant to be a representation of the users work, so you should know the answers to the questions.

Your responses should be concise and to the point, and must be no more than 200 words. You should strive to be helpful, insightful, and concise. You must propose a single question or comment at a time.`;
  }
  const chatMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];
  const stream = await openai.chat.completions.create({
    model: 'o3',
    messages: chatMessages,
    stream: true,
  });
  return streamTextResponse(stream, 'text/plain');
}

export interface VocabularyRequest {
  title: string;
  query: string;
  matchedContext: string;
  type?: string;
  teamTerms?: Record<string, string>;
}

export type TeamTerms = string[];

export async function generateVocabulary(opts: VocabularyRequest): Promise<TeamTerms> {
  const { title, query, matchedContext, type = 'prd' } = opts;
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: type === 'prd'
          ? `You are a system that helps a product manager write a PRD. You will be given a title and query for a new PRD, as well as relevant context from previous PRDs or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of terms over time.

You must respond with a JSON object containing a terms_to_define array of terms that need definitions. For example:
{
  "terms_to_define": ["Service Level Agreement (SLA)", "Round-robin Assignment", "Office Hours"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
${Object.keys(terms).join(', ')}`
          : `You are a system that helps a strategic leader write a strategy document. You will be given a title and query for a new strategy, as well as relevant context from previous strategies or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of strategic terms over time.

You must respond with a JSON object containing a terms_to_define array of terms that need definitions. For example:
{
  "terms_to_define": ["Market penetration", "Competitive advantage", "Strategic initiative"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a strategic leader would ask.
${Object.keys(terms).join(', ')}`,
      },
      {
        role: 'user',
        content: `\n          Title: ${title}\nQuery: ${query}, \nContext: ${matchedContext}`,
      },
    ],
    model: 'o4-mini',
    response_format: { type: 'json_object' },
  });
  
  try {
    const response = JSON.parse(completion.choices[0].message.content || '[]');
    // If the response is an array, return it directly
    if (Array.isArray(response)) {
      return response;
    }
    // If the response is an object with a terms_to_define array, return that
    if (response.terms_to_define && Array.isArray(response.terms_to_define)) {
      return response.terms_to_define;
    }
    // If the response is an object with a terms array, return that
    if (response.terms && Array.isArray(response.terms)) {
      return response.terms;
    }
    // If the response is an object with a teamTerms array, return that
    if (response.teamTerms && Array.isArray(response.teamTerms)) {
      return response.teamTerms;
    }
    // If we can't find an array in the response, return an empty array
    console.error('Invalid response format from vocabulary generation:', response);
    return [];
  } catch (error) {
    console.error('Error parsing vocabulary response:', error);
    return [];
  }
}
