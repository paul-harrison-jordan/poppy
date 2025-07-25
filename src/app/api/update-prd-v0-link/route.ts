import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driveLink, v0Link, chatId } = await request.json();
    
    if (!driveLink || !v0Link) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Update both v0-link and v0-chat-id if chatId is provided
    const updateData: { 'v0-link': string; 'v0-chat-id'?: string } = { 'v0-link': v0Link };
    if (chatId) {
      updateData['v0-chat-id'] = chatId;
    }

    const { error } = await supabase
      .from('prds')
      .update(updateData)
      .eq('drive-link', driveLink)
      .eq('user', session.user.email);
    
    if (error) {
      console.error('Error updating v0 link in database:', error);
      return NextResponse.json({ error: 'Failed to update PRD' }, { status: 500 });
    }

    console.log('Updated PRD with v0 demo link in database:', v0Link);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in update-prd-v0-link API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}