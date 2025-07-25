import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: featureId } = await params;
    
    if (!featureId) {
      return NextResponse.json({ error: 'Feature ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch the feature's design data
    const { data: feature, error } = await supabase
      .from('prds')
      .select('id, "v0-link", "v0-chat-id", "drive-link", title')
      .eq('id', featureId)
      .eq('user', session.user.email)
      .single();
    
    if (error) {
      console.error('Error fetching feature design data:', error);
      return NextResponse.json({ error: 'Failed to fetch feature' }, { status: 500 });
    }

    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // Return the design data
    return NextResponse.json({
      success: true,
      feature: {
        id: feature.id,
        title: feature.title,
        demoUrl: feature['v0-link'],
        chatId: feature['v0-chat-id'],
        driveLink: feature['drive-link']
      }
    });

  } catch (error) {
    console.error('Error in feature design API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}