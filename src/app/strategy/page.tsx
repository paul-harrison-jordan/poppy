"use client"

import { useSession } from "next-auth/react"
import AppShell from "@/components/AppShell"
import StrategyForm from "@/components/StrategyForm"

export default function StrategyPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <div className="w-full max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Strategic Document</h1>
            <p className="text-lg text-gray-600">
              Define your product strategy, vision, and long-term goals
            </p>
          </div>
          <StrategyForm />
        </div>
      </div>
    </AppShell>
  )
} 