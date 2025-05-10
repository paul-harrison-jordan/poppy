"use client"

import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 ml-64">
        {children}
      </main>
    </div>
  )
} 