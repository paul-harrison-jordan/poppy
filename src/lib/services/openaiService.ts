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

I've included instructions for how to think and write PRDs like a product manager with" ${ctx.examplesOfHowYouThink} "I've also included background on how to think like my product team" ${ctx.pillarGoalsKeyTermsBackground} "I've included an example document to demonstrate my personal philosophy on how we should approach building a product to cross sell to existing users" ${ctx.howYouThinkAboutProduct} "I've included a doc that outlines the strategic goals of the my product team for the rest of the year" ${ctx.teamStrategy}

"I've included example text from work that my team has already done that I want for you to use as additional context for relevant features and terms" ${additionalContext} "I've asked you to write a PRD for the following question" ${query} "I've also included a list of questions and answers about the PRD to provide additional clarity around how we should approach the PRD." ${questions.join('\n')} "When I ask you to write a doc, I want you to evaluate the Job to be Done statement I provide from each perspective (Product Manager, My product team, and Building a product that grows with its users) before beginning to write the PRD. Once done with that step, I want you to write the document with a focus on narrow scope, highly detailed breakdowns of which feature will support which part of the JTBD, and an open questions section that interrogates the JTBD from each of your perspectives (my product team, Product Manager, my philosophy) our edits should be returned in markdown format`,
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

If the title, query, or context have words or terms you aren't 100% certain about, include them in the internalTerms array. You must always return the internalTerms array with string values of internal terms that you are unsure about.

Example JSON object:
{
  "questions": [
    {"id": "1","text": "What is the primary problem this feature solves?","reasoning": "Understanding the core problem helps ensure we're building the right solution."},
    {"id": "2","text": "Who are the primary users of this feature?","reasoning": "Identifying target users helps tailor the solution to their needs."},
    {"id": "3","text": "What are the key success metrics for this feature?","reasoning": "Defining success metrics helps measure the impact of the feature."}
  ],
  "internalTerms": ["Profile","Active profile","Suppressed profile","Activity feed"]
}
I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
${Object.keys(terms).join(', ')}
you must respond with a JSON object containing an array of teamTerms you need definitions of.`
          : `You are a system that helps a strategic product leader write a Strategic Document. You will be given a title and query for a new strategy, as well as relevant context from previous strategic documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of strategic terms over time.

If the title, query, or context have words or terms you aren't 100% certain about, include them in the internalTerms array. You must always return the internalTerms array with string values of internal terms that you are unsure about.

Example JSON object:
{
  "questions": [
    {"id": "1","text": "What is the long-term vision for this strategic initiative?","reasoning": "Understanding the long-term vision helps align all stakeholders and guide decision-making."},
    {"id": "2","text": "What are the key market opportunities and challenges?","reasoning": "Identifying market dynamics helps shape the strategic approach."},
    {"id": "3","text": "What are the critical success factors for this strategy?","reasoning": "Defining success factors helps measure the effectiveness of the strategy."}
  ],
  "internalTerms": ["Market penetration","Competitive advantage","Strategic initiative","Value proposition"]
}
I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a strategic leader would ask.
${Object.keys(terms).join(', ')}
you must respond with a JSON object containing an array of teamTerms you need definitions of.`,
      },
      {
        role: 'user',
        content: `\n          Title: ${title}\nQuery: ${query}, \nContext: ${matchedContext}, teamTerms: ${teamTerms}, storedContext: ${storedContext}: klaviyoTerms: ${terms}`,
      },
    ],
    model: 'o3',
    response_format: { type: 'json_object' },
  });
  const response = JSON.parse(completion.choices[0].message.content || '{}');
  return { questions: response.questions as Question[], internalTerms: response.internalTerms as string[] };
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

If the title, query, or context have words or terms you aren't 100% certain about, include them in the internalTerms array. You must always return the internalTerms array with string values of internal terms that you are unsure about.

Example JSON object:
{
  "internalTerms": ["Profile","Active profile","Suppressed profile","Activity feed"]
}
I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
${Object.keys(terms).join(', ')}
you must respond with a JSON object containing an array of teamTerms you need definitions of.`
          : `You are a system that helps a strategic product leader write a Strategic Document. You will be given a title and query for a new strategy, as well as relevant context from previous strategic documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of strategic terms over time.

If the title, query, or context have words or terms you aren't 100% certain about, include them in the internalTerms array. You must always return the internalTerms array with string values of internal terms that you are unsure about.

Example JSON object:
{
  "internalTerms": ["Market penetration","Competitive advantage","Strategic initiative","Value proposition"]
}
I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a strategic leader would ask.
${Object.keys(terms).join(', ')}
you must respond with a JSON object containing an array of teamTerms you need definitions of.`,
      },
      {
        role: 'user',
        content: `\n          Title: ${title}\nQuery: ${query}, \nContext: ${matchedContext}`,
      },
    ],
    model: 'o4-mini',
    response_format: { type: 'json_object' },
  });
  const response = JSON.parse(completion.choices[0].message.content || '{}');
  return response.teamTerms as TeamTerms;
}
