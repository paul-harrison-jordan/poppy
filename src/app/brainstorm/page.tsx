import AppShell from '@/components/AppShell';
import BrainstormChat from '@/components/BrainstormChat';

export default function BrainstormPage() {
  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto space-y-10">
        <div className="text-center mt-8">
          <h1 className="text-4xl font-semibold text-primary font-sans tracking-tight mb-2">Brainstorm with <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Chat with Poppy to explore ideas, clarify requirements, and collaborate on product strategy in real time.</p>
        </div>
        <div className="flex justify-center">
          <BrainstormChat />
        </div>
      </div>
    </AppShell>
  );
}