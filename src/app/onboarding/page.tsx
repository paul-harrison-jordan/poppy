'use client';
import { useSession, signIn } from 'next-auth/react';
import Onboarding from '@/components/Onboarding';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => signIn()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500"
        >
          Please sign in to continue
        </button>
      </div>
    );
  }
  return <Onboarding />;
} 