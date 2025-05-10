"use client";
import AppShell from '@/components/AppShell';
import BrainstormChat from '@/components/BrainstormChat';

export default function BrainstormPage() {
  return (
    <AppShell>
      <div className="flex-1 min-h-0 flex flex-col w-full max-w-5xl mx-auto">
        <BrainstormChat />
      </div>
    </AppShell>
  );
}