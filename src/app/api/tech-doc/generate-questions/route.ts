import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { openai } from '@/lib/openai';

export const POST = withAuth(async (_session: Session, request: Request) => {
  try {
    const { prdContent, prdTitle } = await request.json();
    
    if (!prdContent || !prdTitle) {
      return NextResponse.json(
        { error: 'PRD content and title are required' },
        { status: 400 }
      );
    }

    // Extract feature name from PRD
    const featureNameMatch = prdTitle.match(/PRD[:\s-]*(.*?)(?:\s*-|$)/i) || 
                            prdContent.match(/feature[:\s]*(.*?)[\n.]/i);
    const featureName = featureNameMatch ? featureNameMatch[1].trim() : prdTitle;

    const prompt = `
    You are a technical documentation expert. Based on this PRD, generate 5 contextual questions that will help create comprehensive technical documentation.
    
    PRD Title: ${prdTitle}
    PRD Content (first 2000 chars): ${prdContent.substring(0, 2000)}
    
    Generate exactly 5 questions that cover:
    1. Primary user/persona for this feature
    2. Key setup or configuration steps
    3. Common issues or edge cases
    4. Feature limitations or constraints
    5. Related features or dependencies
    
    Make the questions specific to the feature described in the PRD. Use the actual feature name when possible.
    
    Return as JSON array with format:
    [
      {
        "id": "q1",
        "text": "Question text here",
        "placeholder": "Example answer to guide the user"
      }
    ]
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a technical documentation expert who generates targeted questions for creating user-facing documentation.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    const questions = parsed.questions || parsed;

    // Ensure we have an array of questions
    const formattedQuestions = Array.isArray(questions) ? questions : [questions];
    
    // Add feature-specific context to questions
    const contextualQuestions = formattedQuestions.map((q: { id?: string; text: string; placeholder?: string }, index: number) => ({
      id: q.id || `q${index + 1}`,
      text: q.text.replace(/\[feature\]/gi, featureName),
      placeholder: q.placeholder || 'Please provide detailed information...'
    }));

    return NextResponse.json({ questions: contextualQuestions });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate questions' },
      { status: 500 }
    );
  }
});