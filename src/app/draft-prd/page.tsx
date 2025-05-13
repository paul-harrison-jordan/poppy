"use client";
import { useSession } from 'next-auth/react';
import DraftForm from '@/components/DraftForm';
import SignIn from '@/app/auth/signin/page';
import { useEffect, useState } from 'react';
import PastWork from '@/components/PastWork';
import AppShell from '@/components/AppShell';

export default function DraftPrdPage() {
  const { data: session, status } = useSession();
  const [showPastWorkFull, setShowPastWorkFull] = useState(false);

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
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-5xl font-semibold text-primary font-sans tracking-tight">Write with <span className="text-poppy">Poppy</span></h1>
            <p className="text-lg text-primary/80 font-sans">Turn your ideas and context into actionable product documents with AI-powered drafting.</p>
          </div>
          <div className="w-full max-w-xl mt-2">
            <DraftForm />
          </div>
        </div>
        <div className="w-full mt-12">
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