'use client';

import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import ContextForm from '@/components/ContextForm';

export default function SetupPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
            <div className="w-full max-w-4xl space-y-8">
              <ContextForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 