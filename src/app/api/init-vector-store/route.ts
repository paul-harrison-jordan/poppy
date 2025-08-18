import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { createUserVectorStore } from '@/lib/openai-vector';

export const POST = withAuth<NextResponse, Session, []>(async (session) => {
  try {
    if (!session.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!session.user.name) {
      return NextResponse.json({ error: 'User name not found' }, { status: 401 });
    }

    const formattedUsername = session.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const { vectorStoreId, assistantId } = await createUserVectorStore(formattedUsername);

    return NextResponse.json({
      message: 'Vector store created successfully',
      username: session.user.name,
      vectorStoreId,
      assistantId,
    });
  } catch (error) {
    console.error('Error initializing vector store:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize vector store' },
      { status: 500 }
    );
  }
});