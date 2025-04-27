'use client';

import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import DraftForm from '@/components/DraftForm';

export default function DraftPage() {
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
          <div className="flex justify-center">
            <div className="w-full max-w-4xl space-y-8">
              <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-hidden">
                <div className="p-6">
                  <h1 className="text-2xl font-bold text-[#232426] mb-2">Draft PRD</h1>
                  <p className="text-sm text-[#BBC7B6]">Add Context, your job to be done, and any feature specific information you think would help explain the problem and proposed solution.</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-hidden">
                <div className="p-6">
                  <DraftForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 