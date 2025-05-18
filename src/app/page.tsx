"use client";
import { useSession } from 'next-auth/react';
import SignIn from '@/app/auth/signin/page';
import { useEffect } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import { Settings, PenLine } from 'lucide-react';

export default function Home() {
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
      <div className="min-h-screen bg-neutral/80 flex items-center justify-center">
        <div className="text-primary animate-pulse font-sans">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral/80 flex items-center justify-center">
        <SignIn />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral/80 flex flex-col items-center justify-center relative">
      <div className="absolute top-6 right-8 flex flex-col gap-4">
        <Link href="/my-work" className="text-poppy hover:text-poppy/80 transition-colors" aria-label="View my work">
          <PenLine className="w-7 h-7" />
        </Link>
        <Link href="/instructions" className="text-poppy hover:text-poppy/80 transition-colors" aria-label="Tune Poppy settings">
          <Settings className="w-7 h-7" />
        </Link>
      </div>
      <ChatInterface />
    </div>
  );
}
