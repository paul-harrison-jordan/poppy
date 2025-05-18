import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';
import { generateContent, type GenerateContentRequest } from '@/lib/services/openaiService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthServerSession();
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as GenerateContentRequest;
    return await generateContent(body);
  } catch (err) {
    console.error('generate-content error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 },
    );
  }
}
