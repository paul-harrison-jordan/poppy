import AppShell from '@/components/AppShell';

export default function InstructionsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto space-y-10">
        <div className="text-center mt-8">
          <h1 className="text-4xl font-semibold text-primary font-sans tracking-tight mb-2">How to Use <span className="text-poppy">Poppy</span></h1>
          <p className="text-base text-primary/80 font-sans mb-6">Get the most out of Poppy: your all-in-one product management workspace for chatting, collaborating, and shipping PRDs with AI.</p>
        </div>
        <div className="bg-white/90 rounded-2xl shadow-sm p-8 text-primary font-sans space-y-6">
          <ol className="list-decimal list-inside space-y-4 text-lg">
            <li>
              <span className="font-semibold text-poppy">Set up your context:</span> Go to <span className="font-semibold">Tune Poppy</span> and fill in your team strategy, product thinking, and background. This helps Poppy understand your goals and language.
            </li>
            <li>
              <span className="font-semibold text-poppy">Sync your documents:</span> Connect your Google Drive or upload docs so Poppy can reference your latest specs, PRDs, and resources.
            </li>
            <li>
              <span className="font-semibold text-poppy">Define key terms:</span> Add and manage your team&apos;s vocabulary so Poppy always speaks your language.
            </li>
            <li>
              <span className="font-semibold text-poppy">Brainstorm with Poppy:</span> Use the Brainstorm page to chat, ideate, and clarify requirements in real time.
            </li>
            <li>
              <span className="font-semibold text-poppy">Draft PRDs:</span> Use the Draft PRD tool to turn your ideas and context into actionable product documents.
            </li>
          </ol>
          <div className="mt-8 text-center text-primary/70 text-base">
            Need help? Ask Poppy in the chat or check the documentation for tips and best practices.
          </div>
        </div>
      </div>
    </AppShell>
  );
} 