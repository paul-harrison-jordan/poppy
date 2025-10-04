import { NextRequest } from 'next/server';
import { streamGardenWorkflow } from '@/lib/services/openaiService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, storedContext, teamTerms, existingDocument, version } = body;

    // Get user session for personalized vectorDB
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!query || typeof query !== 'string') {
      return new Response('Query is required', { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use new orchestrator by default, fallback to original if explicitly requested
          const workflowGenerator = version === 'v1'
            ? streamGardenWorkflow({
                query,
                storedContext,
                teamTerms,
                existingDocument
              })
            : (await import('@/services/garden/GardenOrchestrator')).GardenOrchestrator.streamWorkflow({
                query,
                storedContext,
                teamTerms,
                existingDocument
              }, userEmail || undefined);
          
          for await (const update of workflowGenerator) {
            const chunk = encoder.encode(`data: ${JSON.stringify(update)}\n\n`);
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          console.error('Garden workflow error:', error);
          const errorUpdate = {
            type: 'error',
            agent: 'system',
            content: 'An error occurred during the Garden workflow'
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Garden API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}