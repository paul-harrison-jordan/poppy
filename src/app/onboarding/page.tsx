'use client';
import Onboarding from '@/components/Onboarding';
import SignIn from '@/app/auth/signin/page';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';



export default function OnboardingPage() {
  const { data: session } = useSession();
if (!session) {
  return (
   <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
      <SignIn />
    </div>
  );
}
  return (
    <div>
      <Sidebar />
      <Onboarding />
    </div>
  );
} 