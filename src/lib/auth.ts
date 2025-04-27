import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
 
export async function getAuthServerSession() {
  return await getServerSession(authOptions);
} 