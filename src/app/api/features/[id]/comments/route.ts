import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const featureId = parseInt(resolvedParams.id);

    if (isNaN(featureId)) {
      return NextResponse.json(
        { error: 'Invalid feature ID' },
        { status: 400 }
      );
    }

    const { data: comments, error } = await supabase
      .from('feature_comments')
      .select('*')
      .eq('feature_id', featureId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error in GET /api/features/[id]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const featureId = parseInt(resolvedParams.id);

    if (isNaN(featureId)) {
      return NextResponse.json(
        { error: 'Invalid feature ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, user_email, user_name } = body;

    if (!content || !user_email || !user_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the feature exists
    const { data: feature, error: featureError } = await supabase
      .from('prds')
      .select('id')
      .eq('id', featureId)
      .single();

    if (featureError || !feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    const { data: comment, error } = await supabase
      .from('feature_comments')
      .insert([
        {
          feature_id: featureId,
          user_email,
          user_name,
          content,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/features/[id]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}