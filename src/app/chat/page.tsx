"use client";
import AppShell from '@/components/AppShell';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  return (
    <AppShell>
      <div className="flex-1 min-h-0 flex flex-col w-full max-w-5xl mx-auto mt-8">
        <ChatInterface />
      </div>
    </AppShell>
  );
} 