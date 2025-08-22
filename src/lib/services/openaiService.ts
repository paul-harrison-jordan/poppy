import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai } from '../openai';
import { terms } from '../constants/terms';
import { PMPreferenceProfile } from '@/types/knowledge';
import { CompetitiveLandscaperAgent } from '@/agents/competitiveLandscaper';

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
  type: 'prd' | 'brand-messaging' | 'tech-doc';
  title: string;
  query: string;
  questions: string[];
  questionAnswers?: QuestionAnswer[];
  storedContext?: string;
  additionalContext: string;
  teamTerms: Record<string, string>;
  pmProfile?: PMPreferenceProfile;
  competitorUrls?: string[];
  // Tech doc specific fields
  prdContent?: string;
  prdUrl?: string;
  styleGuide?: {
    commonPhrases: string[];
    structurePattern: string[];
    toneIndicators: string[];
  };
  helpExamples?: Array<{
    title: string;
    structure: string;
    navigation: string[];
    limitations: string[];
    sample: string;
  }>;
}

export async function generateContent(opts: GenerateContentRequest) {
  const { type, title, query, questions, questionAnswers, storedContext, additionalContext, pmProfile, competitorUrls, prdContent, styleGuide, helpExamples } = opts;
  
  // Ensure teamTerms is always an object to prevent undefined errors
  const teamTerms = opts.teamTerms || {};
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
    
    // Get competitive analysis if competitor URLs provided
    let competitiveAnalysisText = '';
    if (competitorUrls && competitorUrls.length > 0) {
      try {
        console.log('Analyzing competitor help docs:', competitorUrls);
        const competitiveAgent = new CompetitiveLandscaperAgent();
        const competitiveResult = await competitiveAgent.analyzeWithHelpDocs(query, competitorUrls);
        
        competitiveAnalysisText = `

COMPETITIVE ANALYSIS (Based on actual help documentation):
${competitiveResult.competitors.map(comp => `
${comp.name}:
- Solution: ${comp.summary}
- Key Features: ${comp.features?.join(', ') || 'Not specified'}
- Our Differentiation Opportunity: ${comp.ourEdge}
- Source: ${comp.sourceUrl || 'Help documentation'}
`).join('\n')}

Searched URLs: ${competitiveResult.searchedUrls?.join(', ') || competitorUrls.join(', ')}
`;
      } catch (error) {
        console.error('Competitive analysis failed:', error);
        competitiveAnalysisText = `

COMPETITIVE ANALYSIS: Failed to analyze competitor documentation (${error instanceof Error ? error.message : 'Unknown error'})
`;
      }
    }

    const stream = await openai.chat.completions.create({
      model: 'o3',
      stream: true,
      messages: [
        {
          role: 'user',
          content:`I have  included a list of key terms that you may need to use to generate your response. Use this as background information to help you understand the rest of the prompt. ${Object.keys(terms).join(', ')}

I've also included a list of key terms that my team has defined for our product. Use this as background information to help you understand the rest of the prompt. ${teamTerms && Object.keys(teamTerms).length > 0 ? Object.keys(teamTerms).join(', ') : 'No custom team terms defined'}${pmProfileContext}

I've included instructions for how to think and write PRDs like a product manager with" ${ctx.examplesOfHowYouThink} "I've also included background on how to think like my product team" ${ctx.pillarGoalsKeyTermsBackground} "I've included an example document to demonstrate my personal philosophy on how we should approach building a product to cross sell to existing users" ${ctx.howYouThinkAboutProduct} "I've included a doc that outlines the strategic goals of the my product team for the rest of the year" ${ctx.teamStrategy} I've included example text from work that my team has already done that I want for you to use as additional context for relevant features and terms" ${additionalContext} "I've asked you to write a PRD for the following question" ${query} "I've also included a list of questions and answers about the PRD to provide additional clarity around how we should approach the PRD." ${
    questionAnswers && Array.isArray(questionAnswers) ? questionAnswers.map(qa => `Q: ${qa.question}${qa.reasoning ? ` (${qa.reasoning})` : ''}\nA: ${qa.answer}`).join('\n\n') : questions.join('\n')
  }${competitiveAnalysisText} "When I ask you to write a doc, I want you to evaluate the Job to be Done statement I provide from each perspective (Product Manager, My product team, and Building a product that grows with its users) before beginning to write the PRD. Once done with that step, I want you to write the document with a focus on narrow scope, highly detailed breakdowns of which feature will support which part of the JTBD, and an open questions section that interrogates the JTBD from each of your perspectives (my product team, Product Manager, my philosophy)${competitiveAnalysisText ? ' Include a competitive analysis section that references the actual competitor research provided above and explains how our solution will differentiate.' : ''} our edits should be returned in markdown format`,
        },
      ],
    });
    return streamTextResponse(stream);
  }

  // Tech documentation generation
  if (type === 'tech-doc') {
    if (!prdContent || !styleGuide || !helpExamples) {
      throw new Error('PRD content, style guide, and help examples are required for tech doc generation');
    }

    // Format Q&A for context
    const qaContext = questionAnswers && Array.isArray(questionAnswers) 
      ? questionAnswers.map(qa => `Q: ${qa.question}${qa.reasoning ? ` (${qa.reasoning})` : ''}\nA: ${qa.answer}`).join('\n\n')
      : questions.join('\n');

    const stream = await openai.chat.completions.create({
      model: 'o3',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are a technical documentation writer specializing in Klaviyo platform documentation. Write clear, user-friendly documentation that matches Klaviyo's style guide.`
        },
        {
          role: 'user',
          content: `You are a technical documentation expert. Create comprehensive technical documentation based on the following PRD and matching Klaviyo's documentation style.

PRD CONTENT:
${prdContent}

USER CONTEXT (from Q&A):
${qaContext}

RELEVANT KNOWLEDGE BASE CONTEXT:
${additionalContext || 'No additional context available'}

TEAM TERMS AND DEFINITIONS:
${Object.entries(teamTerms).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

KLAVIYO STYLE GUIDE (from scraped articles):
- Common phrases: ${styleGuide.commonPhrases.slice(0, 5).join(', ')}
- Structure patterns: ${styleGuide.structurePattern.join(', ')}
- Tone: ${styleGuide.toneIndicators.join(', ')}

REFERENCE DOCUMENTATION STRUCTURE:
${JSON.stringify(helpExamples, null, 2)}

Follow this Klaviyo technical writing template and guidelines:

---

# Klaviyo Help Center Article Prompt (Impact‑Driven, PM‑Ready)

> **System / Role**  
> You are a lead Klaviyo technical writer. Produce a **single help article** for the Klaviyo Help Center that matches house style and information architecture. Optimize for customer impact: **time‑to‑value, deliverability, list growth, revenue per recipient (RPR), and support‑ticket deflection**. Write in **second person**, **active voice**, with clear, concise sentences. Use **Klaviyo UI labels verbatim**.

> **Audience**  
> Practitioners (marketers, lifecycle managers, customer service leaders) and admins comfortable with Klaviyo basics; not necessarily experts.

## Output specification (produce all of the following)

### Article body (use these exact section headings)

1) **You will learn**  
   2–4 sentences stating what the reader will accomplish and the business impact (e.g., faster setup, higher deliverability, more sign‑ups). Use plain language.

2) **Before you begin**  
   - List prerequisites (integrations connected, data present, sender numbers verified/registered, permissions/roles, flags enabled).  
   - Call out regional/channel availability and plan limits (if any).  
   - If setup is restricted, state the roles that can perform it (e.g., **Owners, Admins, and Managers** for certain SMS setups).  
   - Time to complete (estimate).

3) **Overview** *(optional if brief)*  
   - What the feature does and when to use it vs. adjacent features (e.g., **campaigns vs. flows**).  
   - How it improves key metrics (tie capabilities to outcomes).

4) **Set it up** *(step‑by‑step)*  
   - Numbered steps with **exact UI paths** and **exact button/field names**.  
   - For each step, include the **expected outcome** and **success criteria**.  
   - Where useful, include short, bolded callouts like **Note**, **Tip**, **Warning**.

5) **Best practices**  
   - 3–7 bullets tied to **impact** (e.g., exit‑intent popups for list growth; send to engaged segments for deliverability; multi‑step forms for SMS consent).  
   - If SMS is involved, include consent collection and double opt‑in guidance at a high level.

6) **Measure success**  
   - Tell readers where to see results in Klaviyo (reporting pages/dashboards).  
   - Map setup choices to **metrics** (RPR, sign‑up conversion, open/click, unsubscribes, complaint rate).  
   - Provide a short checklist: **If metric is low, do X** (3–5 items).

7) **Troubleshooting**  
   - Use concise diagnosis blocks: **Symptom → Likely cause → Fix**.  
   - Include common checks such as message status (Draft/Manual/Live), configuration completeness, permissions, and flow change history.  
   - Reference deeper guides by title where applicable.

8) **FAQ** *(3–6 Q&A)*  
   - Prioritize eligibility, limits, and behavior clarifications.

9) **Next steps**  
    - Suggest adjacent tasks (e.g., enable a welcome flow, configure targeting, A/B test content/cadence).  
    - Include **Additional resources** (Help Center and Academy items by title) that deepen understanding.

## Writing & formatting rules (house‑style alignment)

- **Voice & POV:** Direct, practical, **"you"**; name the UI precisely; avoid passive constructions.  
- **Headings:** Use the exact section names above; keep H2/H3 hierarchy shallow; avoid unnecessary nesting.  
- **Sentences & lists:** Prefer short sentences and scannable bulleted steps.  
- **UI paths:** Use \`>\` between levels (e.g., *Audience > Lists & segments*).  
- **Callouts:** Use **Note / Tip / Warning** where they minimize risk or clarify behavior.  
- **Cross‑references:** Include 3–6 internal cross‑references by **article title**.  
- **Metrics language:** Tie setup choices to outcomes (e.g., "Using exit‑intent popups increases first‑session opt‑ins; monitor sign‑up conversion and RPR").  

Format the output in Markdown suitable for a technical documentation page following this structure exactly.`
        }
      ]
    });
    return streamTextResponse(stream);
  }

  // Brand messaging document generation
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are a brand messaging expert who helps create comprehensive brand messaging documents. Your role is to analyze the provided information and create a well-structured messaging document that aligns with the organization's goals and vision.

You have access to the following context:
- Team terms and definitions: ${teamTerms && Object.keys(teamTerms).length > 0 ? Object.keys(teamTerms).join(', ') : 'No custom team terms defined'}
- Additional context from previous work: ${additionalContext || 'No additional context provided'}

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
  pmProfile?: PMPreferenceProfile;
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
    model: 'gpt-4o-mini',
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
      model: 'gpt-4o',
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
      model: 'gpt-4o',
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
  pmProfile?: PMPreferenceProfile;
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
    model: 'gpt-4o-mini', 
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

// Document Analysis Functions
export interface DocumentAnalysisRequest {
  documentBody: string;
  analysisPrompt?: string;
  model?: string;
  maxTokens?: number;
}

export async function analyzeDocument(opts: DocumentAnalysisRequest): Promise<string> {
  const { analysisPrompt, model = 'gpt-4-turbo-preview', maxTokens = 200 } = opts;

  const defaultPrompt = `Analyze the following document and its matches across different databases. 
  Provide a brief analysis of why these matches are relevant and what insights can be drawn.`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant that analyzes document matches and provides insights.',
      },
      {
        role: 'user',
        content: analysisPrompt || defaultPrompt,
      },
    ],
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content || 'No analysis available';
}

export interface GenerateEmbeddingRequest {
  input: string | string[];
  model?: string;
}

export async function generateEmbedding(opts: GenerateEmbeddingRequest) {
  const { input, model = 'text-embedding-3-small' } = opts;

  const response = await openai.embeddings.create({
    model,
    input,
  });

  return response;
}

export interface DesignPromptRequest {
  prdText: string;
  pmProfile?: PMPreferenceProfile;
}

export interface DesignPromptResponse {
  design_summary: string;
  primary_workflow?: string;
  design_prompt: string;
}

export async function generateDesignPrompt(opts: DesignPromptRequest): Promise<DesignPromptResponse> {
  const { prdText, pmProfile } = opts;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: `Extract key design requirements from a PRD to create a focused design prompt.

Focus on:
1. Core value proposition 
2. Primary user workflow
3. Key UI requirements

${pmProfile?.domain_expertise ? `Domain context: ${pmProfile.domain_expertise.join(', ')}` : ''}

Return JSON with:
- "design_summary": 1-2 sentence summary
- "primary_workflow": Single most important user workflow
- "design_prompt": Concise prompt for v0 (max 200 words)`,
      },
      {
        role: 'user',
        content: `Extract design requirements from this PRD:

${prdText}`,
      },
    ],
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error('No response from OpenAI');
  }

  try {
    return JSON.parse(response) as DesignPromptResponse;
  } catch (parseError) {
    throw new Error(`Failed to parse design data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
}

export interface SummarizePRDRequest {
  prdContent: string;
  title?: string;
  model?: string;
}

export async function summarizePRD(opts: SummarizePRDRequest): Promise<string> {
  const { prdContent, title, model = 'gpt-4o-mini' } = opts;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a product manager assistant that creates concise summaries of PRDs specifically for matching against customer feedback.

Focus on:
1. Core user problems and pain points addressed
2. Key features and functionality described
3. User experience improvements mentioned
4. Specific use cases and scenarios
5. Target user types and personas

Create a clear, searchable summary that would match well against customer feedback about related problems, requests, or experiences. Use natural language that customers might use when describing these issues.

Keep the summary under 200 words but comprehensive enough to capture the essence of what customers might have feedback about.`
      },
      {
        role: 'user',
        content: `Please summarize this PRD for customer feedback matching:

Title: ${title || 'Untitled PRD'}

Content:
${prdContent}`
      }
    ]
  });

  const summary = completion.choices[0].message.content;
  if (!summary) {
    throw new Error('No summary generated from OpenAI');
  }

  return summary;
}

export interface FeedbackAnalysis {
  topics: string[];
  themes: string[];
  features: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export async function enrichFeedback(feedback: string): Promise<{ enrichedText: string; analysis: FeedbackAnalysis }> {
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

  const analysis: FeedbackAnalysis = JSON.parse(completion.choices[0].message.content || '{}');
  const enrichedText = `${feedback}\n\nTopics: ${analysis.topics.join(', ')}\nThemes: ${analysis.themes.join(', ')}\nFeatures: ${analysis.features.join(', ')}\nSentiment: ${analysis.sentiment}`;
  
  return { enrichedText, analysis };
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  storedContext?: string;
  teamTerms?: Record<string, string>;
  model?: string;
}

export async function streamChat(opts: ChatRequest) {
  const { messages, storedContext = '', teamTerms = {}, model = 'gpt-4' } = opts;

  // Format team terms for the prompt
  const formattedTeamTerms = Object.entries(teamTerms)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  // Construct system prompt
  const systemPrompt = `
    You are Poppy, an AI assistant helping product managers with their work. You have access to the following context:

    Here are the team's key terms:
    ${formattedTeamTerms}

    Here is the user's personal context:
    ${storedContext}

    Answer the user's questions using the above context. If the context is not enough, say so. You are meant to be a representation of the user's work, so you should know the answers to the questions.

    Your responses should be helpful, insightful, and concise. You should strive to be direct and to the point.
  `;

  // Call OpenAI with message history
  const chatMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ 
      role: m.role, 
      content: m.content 
    } as ChatCompletionMessageParam)),
  ];

  const stream = await openai.chat.completions.create({
    model,
    messages: chatMessages,
    stream: true,
  });

  return streamTextResponse(stream, 'text/plain');
}

export interface DecomposePRDRequest {
  content: string;
  prompt?: string;
  model?: string;
}

export async function decomposePRD(opts: DecomposePRDRequest) {
  const { content, prompt, model = 'o3' } = opts;

  const defaultPrompt = `# PRD Decomposition Prompt for Phased Releases

You are a product strategist specializing in breaking down Product Requirement Documents (PRDs) into sequential, narrow releases that enable faster development and early learning. Your goal is to transform a comprehensive PRD into a phased release plan that delivers value incrementally while reducing risk.

## Input
Here is a Product Requirement Document  ${content}

## Your Task
Analyze the PRD and create a phased release plan that:
1. Breaks down the full scope into 3-7 sequential phases
2. Each phase should be independently valuable and testable
3. Earlier phases should de-risk and inform later phases
4. Focus on product maturity milestones, not just technical implementation

## IMPORTANT: Response Format
Respond with ONLY a valid JSON array of phase objects. Each phase object should have this structure:
{
  "name": "Phase name",
  "description": "Detailed description of what this phase accomplishes",
  "customer_value": "Justification and explination of customer value achieved by releasing this phase"
  "priority": 1
}

Do not include any markdown formatting, explanations, or text outside the JSON array. Return only the JSON array.`;

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a product management expert who excels at breaking down complex features into manageable release phases. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt || defaultPrompt
      }
    ],
    stream: true,
  });

  return streamTextResponse(stream);
}
