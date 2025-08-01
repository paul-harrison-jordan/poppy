import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();
    
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Use service client for database operations
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('prds')
      .insert([
        {
          'drive-link': '', // Empty initially - can be added later
          'v0-link': '',
          'user': session.user.email,
          'title': title.trim(),
          'description': description?.trim() || '',
          'status': 'planned',
          'priority_order': 0,
          'last_updated_by': session.user.email
        }
      ])
      .select();
    
    if (error) {
      console.error('Supabase error creating feature:', error);
      return NextResponse.json({ 
        error: 'Failed to create feature', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('Feature created successfully:', data);
    
    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error('Error in create-feature API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}