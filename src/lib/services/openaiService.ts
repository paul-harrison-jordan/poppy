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

export interface QuestionAnswer {
  question: string;
  reasoning?: string;
  answer: string;
}

export interface GenerateContentRequest {
  type: 'prd' | 'brand-messaging';
  title: string;
  query: string;
  questions: string[];
  questionAnswers?: QuestionAnswer[];
  storedContext?: string;
  additionalContext: string;
  teamTerms: Record<string, string>;
  pmProfile?: any;
}

export async function generateContent(opts: GenerateContentRequest) {
  const { type, title, query, questions, questionAnswers, storedContext, additionalContext, teamTerms, pmProfile } = opts;
  const pmProfileContext = pmProfile ? `

  PM Profile Context:
  - Product Philosophy: ${pmProfile.product_philosophy || 'Not defined'}
  - Domain Expertise: ${pmProfile.domain_expertise?.join(', ') || 'Not defined'}
  - Recurring Themes: ${pmProfile.recurring_themes?.join(', ') || 'Not defined'}
  - Decision Frameworks: ${Object.keys(pmProfile.decision_frameworks || {}).join(', ') || 'Not defined'}
  - Trade-off Preferences: ${Object.keys(pmProfile.trade_off_preferences || {}).join(', ') || 'Not defined'}
  
  Use this PM profile to generate questions that align with their expertise, thinking style, and decision-making approach. Tailor questions to their domain expertise and recurring themes.` : '';
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

I've included instructions for how to think and write PRDs like a product manager with" ${ctx.examplesOfHowYouThink} "I've also included background on how to think like my product team" ${ctx.pillarGoalsKeyTermsBackground} "I've included an example document to demonstrate my personal philosophy on how we should approach building a product to cross sell to existing users" ${ctx.howYouThinkAboutProduct} "I've included a doc that outlines the strategic goals of the my product team for the rest of the year" ${ctx.teamStrategy} I've included example text from work that my team has already done that I want for you to use as additional context for relevant features and terms" ${additionalContext} "I've asked you to write a PRD for the following question" ${query} "I've also included a list of questions and answers about the PRD to provide additional clarity around how we should approach the PRD." ${
    questionAnswers && Array.isArray(questionAnswers) ? questionAnswers.map(qa => `Q: ${qa.question}${qa.reasoning ? ` (${qa.reasoning})` : ''}\nA: ${qa.answer}`).join('\n\n') : questions.join('\n')
  } "When I ask you to write a doc, I want you to evaluate the Job to be Done statement I provide from each perspective (Product Manager, My product team, and Building a product that grows with its users) before beginning to write the PRD. Once done with that step, I want you to write the document with a focus on narrow scope, highly detailed breakdowns of which feature will support which part of the JTBD, and an open questions section that interrogates the JTBD from each of your perspectives (my product team, Product Manager, my philosophy) our edits should be returned in markdown format`,
        },
      ],
    });
    return streamTextResponse(stream);
  }

  // Brand messaging document generation
  const stream = await openai.chat.completions.create({
    model: 'o3',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are a brand messaging expert who helps create comprehensive brand messaging documents. Your role is to analyze the provided information and create a well-structured messaging document that aligns with the organization's goals and vision.

You have access to the following context:
- Team terms and definitions: ${Object.keys(teamTerms).join(', ')}
- Additional context from previous work: ${additionalContext}

Your task is to create a comprehensive brand messaging document that includes:
1. Executive Summary
2. Brand Vision and Mission
3. Target Audience Analysis
4. Brand Positioning
5. Brand Values and Personality
6. Key Messaging Pillars
7. Implementation Strategy
8. Success Metrics

The document should be written in markdown format and should be clear, actionable, and aligned with the organization's goals.`,
      },
      {
        role: 'user',
        content: `Create a comprehensive brand messaging document in markdown.

Title: ${title}
Background query: ${query}
Q&A: ${
    questionAnswers && Array.isArray(questionAnswers) ? questionAnswers.map(qa => `Q: ${qa.question}${qa.reasoning ? ` (${qa.reasoning})` : ''}\nA: ${qa.answer}`).join('\n\n') : questions.join('\n')
  }

Please ensure the document is well-structured, actionable, and includes all necessary sections for a complete brand messaging strategy.`,
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
  type?: 'prd' | 'brand-messaging';
  pmProfile?: any;
}

export async function generateQuestions(opts: GenerateQuestionsRequest): Promise<QuestionsResponse> {
  const { title, query, matchedContext, storedContext, teamTerms, type = 'prd', pmProfile } = opts;
  
  // Build PM profile context string
  const pmProfileContext = pmProfile ? `

PM Profile Context:
- Product Philosophy: ${pmProfile.product_philosophy || 'Not defined'}
- Domain Expertise: ${pmProfile.domain_expertise?.join(', ') || 'Not defined'}
- Recurring Themes: ${pmProfile.recurring_themes?.join(', ') || 'Not defined'}
- Decision Frameworks: ${Object.keys(pmProfile.decision_frameworks || {}).join(', ') || 'Not defined'}
- Trade-off Preferences: ${Object.keys(pmProfile.trade_off_preferences || {}).join(', ') || 'Not defined'}

Use this PM profile to generate questions that align with their expertise, thinking style, and decision-making approach. Tailor questions to their domain expertise and recurring themes.` : '';

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: type === 'prd'
          ? `You are a system that helps a product manager write a PRD. You will be given a title and query for a new PRD, as well as relevant context from previous PRDs or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of terms over time.

You must respond with a JSON object containing two arrays:
1. questions: An array of question objects, each with id, text, and reasoning fields. you must return 5 questions. you must only return questions that are relevant to the user's query. these questions should be the most important questions that you need answers to in order to write a good PRD that solves the stated customer probelm in the job to be done statement. It's important that these questions steer the user towards the best possible PRD.
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
${Object.keys(terms).join(', ')}${pmProfileContext}`
          : `You are a system that helps a brand messaging expert write a brand messaging document. You will be given a title and query for a new brand messaging document, as well as relevant context from previous documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of brand messaging terms over time.

You must respond with a JSON object containing two arrays:
1. questions: An array of question objects, each with id, text, and reasoning fields
2. internalTerms: An array of terms that need clarification

Example JSON response:
{
  "questions": [
    {
      "id": "1",
      "text": "What is your brand's core purpose and mission?",
      "reasoning": "Understanding the fundamental purpose helps align all messaging decisions."
    },
    {
      "id": "2",
      "text": "Who is your target audience and what are their key needs?",
      "reasoning": "Identifying target audience and their needs helps shape brand messaging."
    },
    {
      "id": "3",
      "text": "What are your brand's core values and personality traits?",
      "reasoning": "Defining brand values and personality helps create consistent messaging."
    },
    {
      "id": "4",
      "text": "What is your unique value proposition in the market?",
      "reasoning": "Understanding your competitive advantage helps differentiate your brand messaging."
    },
    {
      "id": "5",
      "text": "What are your key brand messaging pillars?",
      "reasoning": "Identifying key messages helps create consistent communication."
    }
  ],
  "internalTerms": ["Brand positioning", "Value proposition", "Brand voice"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a brand messaging expert would ask.
${Object.keys(terms).join(', ')}${pmProfileContext}`,
      },
      {
        role: 'user',
        content: `\n          Title: ${title}\nQuery: ${query}, \nContext: ${matchedContext}, teamTerms: ${teamTerms}, storedContext: ${storedContext}: klaviyoTerms: ${terms}`,
      },
    ],
    model: 'o4-mini',
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
    
    const chatMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];
    
    const completion = await openai.chat.completions.create({
      model: 'o3',
      messages: chatMessages,
      response_format: { type: 'json_object' },
    });
    
    try {
      const response = JSON.parse(completion.choices[0].message.content || '{}');
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error parsing brainstorm summary response:', error);
      return NextResponse.json({ error: 'Failed to parse summary' }, { status: 500 });
    }
  } else {
    systemPrompt = `You are a tool being used by a product manager to brainstorm. You may get messages that are about an idea, a problem they're trying to solve, or a feature they're trying to build. Your mission is to expertly coax great ideas out of the user with short, pointed questions and comments that help them think through their idea. Over time, the user should be able to summarize the conversation and use it to draft a PRD.

PMs are trusting you to help them think through their ideas, and have shared some context from PRDs and features you have access to from ${additionalContext}

// Here are the team's key terms:
// ${formattedTeamTerms}

// Here is the user's personal context:
// ${storedContext}

Answer the user's question using the above context and terms. If the context is not enough, say so. You are meant to be a representation of the users work, so you should know the answers to the questions.

Your responses should be concise and to the point, and must be no more than 200 words. You should strive to be helpful, insightful, and concise. You must propose a single question or comment at a time.`;
    
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
}

export interface VocabularyRequest {
  title: string;
  query: string;
  matchedContext: string;
  type?: 'prd' | 'brand-messaging';
  teamTerms?: Record<string, string>;
  pmProfile?: any;
}

export type TeamTerms = string[];

export async function generateVocabulary(opts: VocabularyRequest): Promise<TeamTerms> {
  const startTime = Date.now();
  console.log('[generateVocabulary] Starting vocabulary generation');
  
  const { title, query, matchedContext, type = 'prd', pmProfile } = opts;
  
  // Build PM profile context string
  const pmProfileContext = pmProfile ? `

PM Profile Context:
- Product Philosophy: ${pmProfile.product_philosophy || 'Not defined'}
- Domain Expertise: ${pmProfile.domain_expertise?.join(', ') || 'Not defined'}
- Recurring Themes: ${pmProfile.recurring_themes?.join(', ') || 'Not defined'}
- Existing Vocabulary: ${Object.keys(pmProfile.vocabulary_glossary || {}).join(', ') || 'None defined yet'}
- Decision Frameworks: ${Object.keys(pmProfile.decision_frameworks || {}).join(', ') || 'Not defined'}

Use this PM profile to suggest vocabulary terms that align with their expertise, thinking style, and existing knowledge base. Avoid suggesting terms they've already defined unless they're highly relevant to the current query.` : '';

  console.log('[generateVocabulary] Making OpenAI API call...');
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: type === 'prd'
          ? `You are a system that helps a product manager write a PRD. You will be given a title and query for a new PRD, as well as relevant context from previous PRDs or documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of terms over time.

You must respond with a JSON object containing a terms_to_define array of terms that need definitions. you must only return 5 terms. you must only return terms that are relevant to the user's query. these terms should be the most important terms that the user is likely to use in the PRD. For example:
{
  "terms_to_define": ["Service Level Agreement (SLA)", "Round-robin Assignment", "Office Hours"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a product manager would ask.
${Object.keys(terms).join(', ')}${pmProfileContext}`
          : `You are a system that helps a brand messaging expert write a brand messaging document. You will be given a title and query for a new brand messaging document, as well as relevant context from previous documents that the user has shared with you.

Over time, you should become smarter and more proficient at your job, because of this, it's especially important that you build a better understanding of brand messaging terms over time.

You must respond with a JSON object containing a terms_to_define array of terms that need definitions. For example:
{
  "terms_to_define": ["Brand positioning", "Value proposition", "Brand voice", "Messaging pillars", "Brand personality"]
}

I have also included a list of key terms that you may need to use to generate questions. Use this as background information to help you understand the questions that a brand messaging expert would ask.
${Object.keys(terms).join(', ')}${pmProfileContext}`,
      },
      {
        role: 'user',
        content: `\n          Title: ${title}\nQuery: ${query}, \nContext: ${matchedContext}`,
      },
    ],
    model: 'o4-mini', 
    response_format: { type: 'json_object' },
  });
  
  console.log(`[generateVocabulary] OpenAI API call completed in ${Date.now() - startTime}ms`);
  
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
    console.log(`[generateVocabulary] Failed due to invalid format after ${Date.now() - startTime}ms`);
    return [];
  } catch (error) {
    console.error('Error parsing vocabulary response:', error);
    console.log(`[generateVocabulary] Failed due to parsing error after ${Date.now() - startTime}ms`);
    return [];
  }
}
