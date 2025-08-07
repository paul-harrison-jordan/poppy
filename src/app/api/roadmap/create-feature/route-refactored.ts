import { NextRequest } from 'next/server';
import { withAuthentication } from '@/lib/services/supabaseService';

interface CreateFeatureData {
  title: string;
  description?: string;
}

interface PRD {
  id: string;
  'drive-link': string;
  'v0-link': string;
  user: string;
  title: string;
  description: string;
  status: string;
  priority_order: number;
  last_updated_by: string;
  created_at: string;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  return withAuthentication(async (service) => {
    const body = await request.json();
    const { title, description }: CreateFeatureData = body;
    
    if (!title?.trim()) {
      return { error: 'Title is required', status: 400 };
    }

    const userEmail = service.getUserEmail()!;

    const createData: Partial<PRD> = {
      'drive-link': '',
      'v0-link': '',
      'user': userEmail,
      'title': title.trim(),
      'description': description?.trim() || '',
      'status': 'planned',
      'priority_order': 0,
      'last_updated_by': userEmail
    };

    const result = await service.create<PRD>('prds', createData);
    
    if (result.error) {
      return result;
    }

    console.log('Feature created successfully:', result.data);
    return { 
      data: { success: true, data: result.data }, 
      status: 200 
    };
  });
}