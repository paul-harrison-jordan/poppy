'use client';

import React from 'react';
import AppShell from '@/components/AppShell';
import Scheduler from '@/components/Scheduler';
import SyncForm from '@/components/SyncForm';

export default function SchedulePage() {
  return (
    <AppShell>
      <div className="flex-1 min-h-0 flex flex-col w-full max-w-5xl mx-auto">
        <SyncForm />
        <Scheduler />
      </div>
    </AppShell>
  );
} 