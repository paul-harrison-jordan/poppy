import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { reviewWithPersona, type PersonaReviewRequest } from '@/lib/services/openaiService';

export const POST = withAuth(async (_session: Session, request: Request) => {
  try {
    const requestData: PersonaReviewRequest = await request.json();
    
    // Get user's configured persona from request or construct from localStorage data
    // The frontend should pass this, but we'll handle it here for now
    let userPersona = '';
    
    // If persona data is provided, use it to construct the persona context
    if (requestData.personaData) {
      const { role, experience, goals, painPoints, industry } = requestData.personaData;
      userPersona = `
CUSTOMER PERSONA:
- Role/Title: ${role || 'Not specified'}
- Experience Level: ${experience || 'Not specified'}
- Industry/Domain: ${industry || 'Not specified'}
- Primary Goals: ${goals || 'Not specified'}
- Pain Points: ${painPoints || 'Not specified'}
`.trim();
    }
    
    // Use the user's persona instead of the generic personaOutline
    const updatedRequestData = {
      ...requestData,
      personaOutline: userPersona || requestData.personaOutline
    };
    
    const result = await reviewWithPersona(updatedRequestData);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error reviewing document with persona:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to review document' },
      { status: 500 }
    );
  }
});