"use client";

import { useSession } from 'next-auth/react';
import ContextForm from '@/components/ContextForm';
import AppShell from '@/components/AppShell';
import Banner from '@/components/Banner';

export default function SetupPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral flex items-center justify-center">
        <div className="text-primary animate-pulse font-sans">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell>
      <Banner 
        title="Tune Poppy"
        description="Personalize and configure Poppy so it knows your team's goals, and product strategy, and how you think about your product area."
      />
      <div className="w-full max-w-3xl mx-auto space-y-10">
        <div className="text-center mt-8">
          <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Tune <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Personalize and configure Poppy so it knows your team&apos;s goals, and product strategy, and how you think about your product area.</p>
        </div>
        <div className="flex justify-center">
          <div className="bg-white/90 rounded-2xl shadow-sm p-8 w-full">
            <ContextForm />
          </div>
        </div>
      </div>
    </AppShell>
  );
} 