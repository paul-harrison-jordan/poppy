import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, z } from 'zod';
import { Session } from 'next-auth';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidatedRequest<T> extends NextRequest {
  validatedBody: T;
  validatedQuery: Record<string, string>;
}

export class RequestValidationError extends Error {
  constructor(
    public errors: ValidationError[],
    message = 'Request validation failed'
  ) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

// Helper to format Zod errors into our ValidationError format
function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

// Core validation function
export async function validateRequest<T>(
  request: NextRequest,
  bodySchema?: ZodSchema<T>,
  querySchema?: ZodSchema
): Promise<{ body?: T; query?: Record<string, string> }> {
  const results: { body?: T; query?: Record<string, string> } = {};
  const errors: ValidationError[] = [];

  // Validate body if schema provided
  if (bodySchema) {
    try {
      const rawBody = await request.json();
      const validatedBody = bodySchema.parse(rawBody);
      results.body = validatedBody;
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...formatZodErrors(error));
      } else {
        errors.push({
          field: 'body',
          message: 'Invalid JSON body',
          code: 'invalid_json'
        });
      }
    }
  }

  // Validate query parameters if schema provided
  if (querySchema) {
    try {
      const { searchParams } = new URL(request.url);
      const queryObject = Object.fromEntries(searchParams.entries());
      const validatedQuery = querySchema.parse(queryObject);
      results.query = validatedQuery;
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...formatZodErrors(error));
      } else {
        errors.push({
          field: 'query',
          message: 'Invalid query parameters',
          code: 'invalid_query'
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new RequestValidationError(errors);
  }

  return results;
}

// Higher-order function for API route validation
export function withValidation<T>(
  bodySchema?: ZodSchema<T>,
  querySchema?: ZodSchema
) {
  return function <TSession = Session>(
    handler: (
      validatedRequest: {
        body?: T;
        query?: Record<string, string>;
        request: NextRequest;
        session?: TSession;
      }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      context?: { params?: Record<string, unknown>; session?: TSession }
    ): Promise<NextResponse> => {
      try {
        const validated = await validateRequest(request, bodySchema, querySchema);
        
        return await handler({
          ...validated,
          request,
          session: context?.session
        });
      } catch (error) {
        if (error instanceof RequestValidationError) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              details: error.errors
            },
            { status: 400 }
          );
        }
        
        console.error('Unexpected validation error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

// Middleware with authentication
export function withAuthAndValidation<T>(
  authCheck: (request: NextRequest) => Promise<Session | null>,
  bodySchema?: ZodSchema<T>,
  querySchema?: ZodSchema
) {
  return function (
    handler: (
      validatedRequest: {
        body?: T;
        query?: Record<string, string>;
        request: NextRequest;
        session: Session;
      }
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        // Check authentication first
        const session = await authCheck(request);
        if (!session) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // Then validate request
        const validated = await validateRequest(request, bodySchema, querySchema);
        
        return await handler({
          ...validated,
          request,
          session
        });
      } catch (error) {
        if (error instanceof RequestValidationError) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              details: error.errors
            },
            { status: 400 }
          );
        }
        
        console.error('Unexpected validation error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

// Lightweight validation helper for non-API contexts
export function validateData<T>(data: unknown, schema: ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new RequestValidationError(formatZodErrors(error));
      throw validationError;
    }
    throw error;
  }
}

// Query parameter schemas
export const paginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
});

export const idParamsSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val), {
    message: 'ID must be a valid number'
  })
});

export const stringIdParamsSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

// Export types
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type IdParams = z.infer<typeof idParamsSchema>;
export type StringIdParams = z.infer<typeof stringIdParamsSchema>;