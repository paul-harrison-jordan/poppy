import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral font-sans">
      <Sidebar />
      <main className="flex-1 ml-20 p-8">{children}</main>
    </div>
  );
} 