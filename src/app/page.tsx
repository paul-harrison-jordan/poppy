"use client";
import { useSession } from 'next-auth/react';
import SignIn from '@/app/auth/signin/page';
import { useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();



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
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[80vh] space-y-12">
        <div className="text-center mt-16">
          <h1 className="text-6xl font-bold text-primary font-sans tracking-tight mb-4">
            Welcome to <span className="text-poppy">Poppy</span>
          </h1>
          <p className="text-xl text-primary/80 font-sans mb-8 max-w-2xl mx-auto">
            Poppy helps you brainstorm, organize, and ship ideas faster.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link href="/setup" className="rounded-full bg-poppy text-white font-semibold px-8 py-4 text-lg shadow-sm hover:bg-poppy/90 transition-all font-sans text-center">
            Tune Poppy
          </Link>
          <Link href="/brainstorm" className="rounded-full bg-sprout text-primary font-semibold px-8 py-4 text-lg shadow-sm hover:bg-sprout/90 transition-all font-sans text-center">
            Brainstorm
          </Link>
          <Link href="/draft-prd" className="rounded-full bg-neutral text-primary font-semibold px-8 py-4 text-lg shadow-sm hover:bg-neutral/80 transition-all font-sans text-center">
            Draft a PRD
          </Link>
        </div>
        <div className="mt-12 text-center text-primary/70 text-base max-w-xl mx-auto">
          <span className="font-semibold text-poppy">New!</span> Try real-time AI collaboration, context-aware brainstorming, and seamless PRD drafting—all in one place.
        </div>
      </div>
    </AppShell>
  );
}
