import { NextRequest, NextResponse } from 'next/server';
import { GardenOrchestrator } from '@/services/garden/GardenOrchestrator';
import { GardenRequest } from '@/services/garden/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gardenRequest, humanResponses } = body as {
      gardenRequest: GardenRequest;
      humanResponses: Record<string, string>;
    };

    if (!gardenRequest || !humanResponses) {
      return NextResponse.json(
        { error: 'Missing required fields: gardenRequest and humanResponses' },
        { status: 400 }
      );
    }

    console.log('🔄 Continuing Garden workflow with human responses');
    console.log('Human responses received:', Object.keys(humanResponses).length);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const update of GardenOrchestrator.continueWithHumanResponses(
            gardenRequest,
            humanResponses
          )) {
            const chunk = encoder.encode(JSON.stringify(update) + '\n');
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          console.error('Garden workflow continuation error:', error);
          const errorUpdate = {
            type: 'error',
            agent: 'orchestrator',
            content: 'An error occurred while continuing the Garden workflow.'
          };
          controller.enqueue(encoder.encode(JSON.stringify(errorUpdate) + '\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Garden continuation API error:', error);
    return NextResponse.json(
      { error: 'Failed to continue Garden workflow' },
      { status: 500 }
    );
  }
}