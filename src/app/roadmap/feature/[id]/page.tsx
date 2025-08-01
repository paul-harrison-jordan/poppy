import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import FeatureDetailView from './FeatureDetailView';

interface Feature {
  id: number;
  title?: string;
  description?: string;
  'drive-link': string;
  'v0-link': string;
  user: string;
  shipped: boolean;
  created_at?: string;
  roadmap?: {
    priority_order?: number;
    status?: string;
    target_quarter?: string;
    estimated_effort_points?: number;
    business_value_score?: number;
    technical_complexity_score?: number;
    dependencies?: string[];
    risks?: string[];
    success_metrics?: string[];
    roadmap_notes?: string;
  };
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

  return <FeatureDetailView feature={feature} />;
}