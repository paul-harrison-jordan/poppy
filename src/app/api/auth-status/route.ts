import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { Session } from 'next-auth';

export const GET = withAuth<NextResponse, Session, []>(async (session) => {
  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.user?.name,
      email: session.user?.email,
    },
    tokenInfo: {
      hasAccessToken: !!session.accessToken,
      hasRefreshToken: !!session.refreshToken,
      expiresAt: session.expiresAt,
      expiresAtFormatted: session.expiresAt ? new Date(session.expiresAt * 1000).toISOString() : null,
      isExpired: session.expiresAt ? Date.now() >= session.expiresAt * 1000 : null,
    }
  });
});