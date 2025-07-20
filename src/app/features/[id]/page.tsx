import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import FeatureDetailClient from './FeatureDetailClient';

interface Feature {
  id: number;
  'drive-link': string;
  'v0-link': string;
  user: string;
  shipped: boolean;
  created_at?: string;
}

interface Comment {
  id: number;
  feature_id: number;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const featureId = parseInt(resolvedParams.id);

  if (isNaN(featureId)) {
    notFound();
  }

  // Fetch feature details
  const { data: feature } = await supabase
    .from('prds')
    .select('*')
    .eq('id', featureId)
    .single() as { data: Feature | null };

  if (!feature) {
    notFound();
  }

  // Fetch comments for this feature
  const { data: comments } = await supabase
    .from('feature_comments')
    .select('*')
    .eq('feature_id', featureId)
    .order('created_at', { ascending: true }) as { data: Comment[] | null };

  return (
    <FeatureDetailClient 
      feature={feature} 
      initialComments={comments || []} 
    />
  );
}