"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import KeyTermsForm from "@/components/KeyTermsForm";
import AppShell from '@/components/AppShell';

interface TeamTerms {
  [term: string]: string;
}

export default function KeyTermsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [terms, setTerms] = useState<TeamTerms>({});
  const [setEditingTerm] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [setIsEditModalOpen] = useState(false);
  const [setIsAddModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [setAddError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("teamTerms");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTerms(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
        } catch {
          setTerms({});
        }
      } else {
        setTerms({});
      }
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleKeyTermsComplete = () => {
    // Mark the key terms step as complete
    const completedSteps = JSON.parse(localStorage.getItem('completedSteps') || '[]');
    if (!completedSteps.includes('terms')) {
      completedSteps.push('terms');
      localStorage.setItem('completedSteps', JSON.stringify(completedSteps));
    }
    router.push('/onboarding');
  };

  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto space-y-10">
        <div className="text-center mt-8">
          <h1 className="text-4xl font-semibold text-primary font-sans tracking-tight mb-2">Key Terms for <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Define and manage your team&apos;s key terms and definitions. These help Poppy understand your product language and context.</p>
        </div>
        <div className="flex justify-center">
          <KeyTermsForm onComplete={handleKeyTermsComplete} />
        </div>
      </div>
    </AppShell>
  );
} 