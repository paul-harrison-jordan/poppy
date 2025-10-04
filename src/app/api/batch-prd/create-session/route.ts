import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';
import { BatchPRDSession } from '@/types/knowledge';

export const POST = withAuth<NextResponse, Session, [Request]>(async (session, request) => {
  try {
    const { features } = await request.json() as { features: Array<{ name: string }> };

    if (!features || features.length === 0) {
      return NextResponse.json(
        { error: 'At least one feature is required' },
        { status: 400 }
      );
    }

    // Create batch PRD session
    const batchSession: BatchPRDSession = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_email: session.user?.email || 'unknown',
      features: features.map((f, idx) => ({
        id: `feature-${idx}-${Date.now()}`,
        name: f.name,
        jtbd: '',
        productArea: 'customerFacing',
        appliedPersonas: []
      })),
      status: 'defining_jtbd',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(`[create-session] Created batch session ${batchSession.id} with ${features.length} features`);

    return NextResponse.json({ session: batchSession });
  } catch (error) {
    console.error('[create-session] Error creating batch session:', error);
    return NextResponse.json(
      { error: 'Failed to create batch session' },
      { status: 500 }
    );
  }
});
