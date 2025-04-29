'use client';

import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import DraftForm from '@/components/DraftForm';
import SignIn from '@/app/auth/signin/page';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64 flex items-center justify-center min-h-screen">
        <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
            <div className="w-full max-w-4xl space-y-8">
            <div>
              <div className="text-4xl font-medium text-[#232426] mb-8 text-center">
                We&apos;re 1% Done
              </div>
              <div>
                  <DraftForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
