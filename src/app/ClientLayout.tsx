'use client';

import { SessionProvider } from 'next-auth/react';
import { Providers } from "./providers";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SessionProvider>
      <Providers>{children}</Providers>
    </SessionProvider>
  );
} 