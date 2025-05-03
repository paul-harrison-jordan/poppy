import { NextResponse } from 'next/server';
import { getAuthServerSession } from '@/lib/auth';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export type APIResponse<T = unknown, E = unknown> = {
  data?: T;
  error?: {
    message: string;
    details?: E;
  };
};

export function createAPIResponse<T, E = unknown>(
  data: T | undefined,
  error?: { message: string; details?: E }
): APIResponse<T, E> {
  return {
    data,
    error,
  };
}

/**
 * Standardized API response wrapper for Next.js API routes.
 * Adds default headers (CORS, content-type) and allows custom headers/status.
 */
export function apiJsonResponse<T>(
  body: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  }
) {
  const defaultHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
  return NextResponse.json(body, {
    status: options?.status,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });
}

export function handleAPIError(error: unknown) {
  console.error('API Error:', error);
  if (error instanceof APIError) {
    return apiJsonResponse(
      createAPIResponse(undefined, {
        message: error.message,
        details: error.details,
      }),
      { status: error.statusCode }
    );
  }
  return apiJsonResponse(
    createAPIResponse(undefined, {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    }),
    { status: 500 }
  );
}

export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await handler();
    return apiJsonResponse(createAPIResponse(result));
  } catch (error) {
    return handleAPIError(error);
  }
}

export function withAuth<T, Session = unknown, Args extends unknown[] = []>(
  handler: (session: Session, ...args: Args) => Promise<T>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    return withErrorHandling(async () => {
      const session = await getAuthServerSession();
      if (!session?.user?.name) {
        throw new APIError('Unauthorized', 401);
      }
      return handler(session as Session, ...args);
    });
  };
} 