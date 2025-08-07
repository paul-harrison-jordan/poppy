"use client";
import { useSession } from 'next-auth/react';
import SignIn from '@/app/auth/signin/page';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import { useRouter } from 'next/navigation';
import { Settings, Grid3X3 } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = () => {
      const personalContext = localStorage.getItem('personalContext');
      const syncedDocs = localStorage.getItem('syncedDocs');
      const onboardingMarker = localStorage.getItem('onboardingComplete');
      
      // Check if user has completed onboarding
      if (onboardingMarker !== 'true') {
        let needsOnboarding = true;
        
        if (personalContext && syncedDocs) {
          const context = JSON.parse(personalContext);
          const docs = JSON.parse(syncedDocs);
          
          // Check if all required fields are filled
          const contextComplete = context.teamStrategy && 
                                context.howYouThinkAboutProduct && 
                                context.pillarGoalsKeyTermsBackground;
          const docsComplete = docs.length > 0;
          
          needsOnboarding = !(contextComplete && docsComplete);
        }
        
        if (needsOnboarding) {
          router.push('/onboarding');
          return;
        }
      }
      
      setIsCheckingOnboarding(false);
    };

    if (session?.user) {
      checkOnboardingStatus();
    } else if (status !== 'loading') {
      // If there's no session and we're not loading, we don't need to check onboarding
      setIsCheckingOnboarding(false);
    }
  }, [session?.user, status, router]);

  useEffect(() => {
    const initializePinecone = async () => {
      if (session?.user) {
        try {
          // Add a timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch('/api/init-pinecone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn('Failed to initialize Pinecone index, but continuing...');
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn('Pinecone initialization timed out, but continuing...');
          } else {
            console.warn('Error initializing Pinecone index, but continuing...', error);
          }
        }
      }
    };
    
    // Don't block the UI, initialize in background
    if (session?.user) {
      initializePinecone();
    }
  }, [session?.user]); // Include the full user object

  // Listen for design mode changes
  useEffect(() => {
    const checkDesignMode = () => {
      const currentMode = localStorage.getItem('currentChatMode');
      setIsDesignMode(currentMode === 'design');
    };

    // Check on mount
    checkDesignMode();

    // Listen for storage changes
    const handleStorageChange = () => {
      checkDesignMode();
    };

    // Listen for custom events from ChatInterface
    const handleModeChange = () => {
      checkDesignMode();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatModeChange', handleModeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatModeChange', handleModeChange);
    };
  }, []);

  if (status === 'loading' || isCheckingOnboarding) {
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
    <div className={`min-h-screen bg-neutral/80 flex flex-col relative ${isDesignMode ? 'design-mode-fullscreen' : ''}`}>
      {/* Hide navigation links in design mode */}
      {!isDesignMode && (
        <div className="absolute top-6 right-8 flex flex-col gap-4 z-10">
          <Link href="/roadmap" className="text-poppy hover:text-poppy/80 transition-colors" aria-label="View roadmap">
            <Grid3X3 className="w-7 h-7" />
          </Link>
          <Link href="/instructions" className="text-poppy hover:text-poppy/80 transition-colors" aria-label="Tune Poppy settings">
            <Settings className="w-7 h-7" />
          </Link>
        </div>
      )}
      
      <div className={`flex flex-1 items-center justify-center design-mode-container ${isDesignMode ? '' : 'p-8'}`}>
        <div className={`w-full design-mode-content ${isDesignMode ? '' : 'max-w-5xl'}`}>
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
