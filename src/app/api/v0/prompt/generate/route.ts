import { NextRequest, NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';

interface Feature {
  id: number;
  title?: string;
  description?: string;
}

// Helper function to generate design prompt from PRD content
function generateDesignPromptFromPRD(feature: Feature, prdContent: string): string {
  const title = feature.title || `Feature #${feature.id}`;
  const description = feature.description || '';
  
  // Extract key information from PRD (lightweight parsing)
  const prdLines = prdContent.split('\n').filter(line => line.trim());
  const objectives = prdLines.filter(line => 
    line.toLowerCase().includes('objective') || 
    line.toLowerCase().includes('goal') ||
    line.toLowerCase().includes('purpose')
  ).slice(0, 2);
  
  const userStories = prdLines.filter(line => 
    line.toLowerCase().includes('user') || 
    line.toLowerCase().includes('customer') ||
    line.toLowerCase().includes('as a')
  ).slice(0, 3);

  const requirements = prdLines.filter(line => 
    line.toLowerCase().includes('requirement') || 
    line.toLowerCase().includes('must') ||
    line.toLowerCase().includes('should')
  ).slice(0, 3);

  return `Create a modern, professional SaaS interface for "${title}".

${description ? `Feature Overview: ${description}` : ''}

${objectives.length > 0 ? `Key Objectives:\n${objectives.map(obj => `• ${obj.trim()}`).join('\n')}\n` : ''}

${userStories.length > 0 ? `User Stories:\n${userStories.map(story => `• ${story.trim()}`).join('\n')}\n` : ''}

${requirements.length > 0 ? `Key Requirements:\n${requirements.map(req => `• ${req.trim()}`).join('\n')}\n` : ''}

Design Guidelines:
• Clean, modern interface with intuitive navigation
• Professional SaaS application aesthetic
• Clear visual hierarchy and consistent spacing
• Accessible design with proper contrast and typography
• Responsive layout optimized for desktop use
• Include relevant interactive elements and clear CTAs
• Focus on the primary user workflow

Please create a complete, functional interface that demonstrates the core user experience.`;
}

export async function POST(request: NextRequest) {
  try {
    // Fast auth check
    const session = await getAuthServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Input validation
    const { feature, prdContent } = await request.json();
    if (!feature) {
      return NextResponse.json({ error: 'Feature data required' }, { status: 400 });
    }

    console.log('Generating design prompt for feature:', feature.id);

    // Fast prompt generation
    const designPrompt = prdContent 
      ? generateDesignPromptFromPRD(feature, prdContent)
      : `Create a modern, professional SaaS interface for "${feature.title || `Feature #${feature.id}`}".

${feature.description ? `Description: ${feature.description}` : ''}

Design Guidelines:
• Clean, modern interface with intuitive navigation
• Professional SaaS application aesthetic  
• Clear visual hierarchy and consistent spacing
• Accessible design with proper contrast and typography
• Responsive layout optimized for desktop use
• Include relevant interactive elements and clear CTAs

Please create a complete, functional interface that demonstrates the core user experience.`;

    // Fast response with generated prompt
    return NextResponse.json({
      prompt: designPrompt,
      hasPRDContext: !!prdContent,
      featureId: feature.id
    });

  } catch (error) {
    console.error('Prompt generation error:', error);
    
    return NextResponse.json({
      error: 'Failed to generate prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}