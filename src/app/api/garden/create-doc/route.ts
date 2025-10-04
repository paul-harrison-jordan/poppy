import { NextRequest, NextResponse } from 'next/server';

interface CreateDocRequest {
  title: string;
  content: string;
  documentType?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateDocRequest = await req.json();
    const { title, content, documentType = 'analysis' } = body;

    if (!title || !content) {
      return NextResponse.json({ 
        error: 'Title and content are required' 
      }, { status: 400 });
    }

    // For now, we'll create a simulated Google Doc response
    // In production, this would integrate with Google Docs API
    const docId = `garden_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    // Simulate Google Doc creation
    const result = {
      success: true,
      docId,
      docUrl,
      title,
      documentType,
      createdAt: new Date().toISOString(),
      // For demo purposes, we'll return the content as preview
      preview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      fullContent: content
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Google Doc creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create Google Doc', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}