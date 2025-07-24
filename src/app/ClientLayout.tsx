'use client';

import { SessionProvider } from 'next-auth/react';
import { Providers } from "./providers";
import GlobalLayout from '@/components/GlobalLayout';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SessionProvider>
      <Providers>
        <GlobalLayout>
          {children}
        </GlobalLayout>
      </Providers>
    </SessionProvider>
  );
} 