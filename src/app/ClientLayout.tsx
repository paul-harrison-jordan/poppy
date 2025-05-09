'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Providers } from "./providers";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if onboarding is complete
    const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
    setIsOnboardingComplete(onboardingComplete);

    // Redirect to onboarding if not complete and not already on onboarding page
    if (!onboardingComplete && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [pathname, router]);

  // Show loading state while checking onboarding status
  if (isOnboardingComplete === null) {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <Providers>{children}</Providers>
    </SessionProvider>
  );
} 