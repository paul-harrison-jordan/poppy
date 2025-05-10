'use client';

import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import DraftForm from '@/components/DraftForm';
import SignIn from '@/app/auth/signin/page';
import { useEffect, useState } from 'react';
import PastWork from '@/components/PastWork';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [showPastWorkFull, setShowPastWorkFull] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializePinecone = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/init-pinecone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            console.error('Failed to initialize Pinecone index');
          }
        } catch (error) {
          console.error('Error initializing Pinecone index:', error);
        }
      }
    };

    initializePinecone();
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral flex items-center justify-center">
        <div className="text-primary animate-pulse font-sans">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral flex items-center justify-center">
        <SignIn />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto space-y-12">
        <div className="text-center mt-8">
          <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight mb-4">Welcome to <span className="text-poppy">Poppy</span></h1>
          <p className="text-lg text-primary/80 font-sans mb-8">Your all-in-one product management workspace for chatting, collaborating, and shipping PRDs with AI.</p>
        </div>
        <div className="bg-white/90 rounded-2xl shadow-sm p-8">
          <DraftForm />
        </div>
        <div>
          <PastWork
            storageKey="savedPRD"
            title="Past PRDs"
            onExpand={() => setShowPastWorkFull(true)}
            largeFormat={showPastWorkFull}
            onClose={() => setShowPastWorkFull(false)}
          />
        </div>
      </div>
    </AppShell>
  );
}
