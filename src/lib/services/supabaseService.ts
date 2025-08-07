import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthServerSession } from '@/lib/auth';

export interface ServiceResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
}

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

export class SupabaseService {
  private client: SupabaseClient;
  private session: { user?: { email?: string } } | null;

  constructor(client: SupabaseClient, session?: { user?: { email?: string } } | null) {
    this.client = client;
    this.session = session;
  }

  static async createAuthenticated(): Promise<SupabaseService | null> {
    try {
      const session = await getAuthServerSession();
      if (!session?.user?.email) {
        return null;
      }
      const client = createServiceClient();
      return new SupabaseService(client, session);
    } catch (error) {
      console.error('Failed to create authenticated service:', error);
      return null;
    }
  }

  static createUnauthenticated(): SupabaseService {
    const client = createServiceClient();
    return new SupabaseService(client);
  }

  getUserEmail(): string | null {
    return this.session?.user?.email || null;
  }

  async findMany<T>(
    table: string, 
    filters: FilterCondition[] = [], 
    options: QueryOptions = {}
  ): Promise<ServiceResponse<T[]>> {
    try {
      let query = this.client.from(table);

      // Apply select
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }

      // Apply filters
      filters.forEach(filter => {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value);
            break;
          case 'neq':
            query = query.neq(filter.column, filter.value);
            break;
          case 'gt':
            query = query.gt(filter.column, filter.value);
            break;
          case 'gte':
            query = query.gte(filter.column, filter.value);
            break;
          case 'lt':
            query = query.lt(filter.column, filter.value);
            break;
          case 'lte':
            query = query.lte(filter.column, filter.value);
            break;
          case 'like':
            query = query.like(filter.column, filter.value);
            break;
          case 'ilike':
            query = query.ilike(filter.column, filter.value);
            break;
          case 'in':
            query = query.in(filter.column, filter.value);
            break;
          case 'is':
            query = query.is(filter.column, filter.value);
            break;
        }
      });

      // Apply ordering
      if (options.orderBy) {
        options.orderBy.forEach(order => {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 1000)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error in findMany for ${table}:`, error);
        return { error: error.message, status: 500 };
      }

      return { data: data as T[], status: 200 };
    } catch (error) {
      console.error(`Unexpected error in findMany for ${table}:`, error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 500 
      };
    }
  }

  async findById<T>(table: string, id: string | number, select?: string): Promise<ServiceResponse<T>> {
    try {
      let query = this.client.from(table);

      if (select) {
        query = query.select(select);
      } else {
        query = query.select('*');
      }

      const { data, error } = await query.eq('id', id).single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error: 'Record not found', status: 404 };
        }
        console.error(`Error in findById for ${table}:`, error);
        return { error: error.message, status: 500 };
      }

      return { data: data as T, status: 200 };
    } catch (error) {
      console.error(`Unexpected error in findById for ${table}:`, error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 500 
      };
    }
  }

  async create<T>(table: string, data: Partial<T>, select?: string): Promise<ServiceResponse<T>> {
    try {
      let query = this.client.from(table).insert(data);

      if (select) {
        query = query.select(select);
      } else {
        query = query.select('*');
      }

      const { data: result, error } = await query.single();

      if (error) {
        console.error(`Error in create for ${table}:`, error);
        if (error.code === '23505') {
          return { error: 'Record already exists', status: 409 };
        }
        return { error: error.message, status: 500 };
      }

      return { data: result as T, status: 201 };
    } catch (error) {
      console.error(`Unexpected error in create for ${table}:`, error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 500 
      };
    }
  }

  async update<T>(
    table: string, 
    id: string | number, 
    data: Partial<T>, 
    select?: string
  ): Promise<ServiceResponse<T>> {
    try {
      let query = this.client.from(table).update(data).eq('id', id);

      if (select) {
        query = query.select(select);
      } else {
        query = query.select('*');
      }

      const { data: result, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error: 'Record not found', status: 404 };
        }
        console.error(`Error in update for ${table}:`, error);
        return { error: error.message, status: 500 };
      }

      return { data: result as T, status: 200 };
    } catch (error) {
      console.error(`Unexpected error in update for ${table}:`, error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 500 
      };
    }
  }

  async delete(table: string, id: string | number): Promise<ServiceResponse<void>> {
    try {
      const { error } = await this.client.from(table).delete().eq('id', id);

      if (error) {
        console.error(`Error in delete for ${table}:`, error);
        return { error: error.message, status: 500 };
      }

      return { status: 204 };
    } catch (error) {
      console.error(`Unexpected error in delete for ${table}:`, error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 500 
      };
    }
  }

  async executeRaw<T>(query: { data?: T; error?: { message: string } }): Promise<ServiceResponse<T>> {
    try {
      const { data, error } = await query;

      if (error) {
        console.error('Error in executeRaw:', error);
        return { error: error.message, status: 500 };
      }

      return { data: data as T, status: 200 };
    } catch (error) {
      console.error('Unexpected error in executeRaw:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        status: 500 
      };
    }
  }

  // Convenience method for user-scoped queries
  async findManyForUser<T>(
    table: string, 
    userColumn: string = 'user', 
    additionalFilters: FilterCondition[] = [],
    options: QueryOptions = {}
  ): Promise<ServiceResponse<T[]>> {
    const userEmail = this.getUserEmail();
    if (!userEmail) {
      return { error: 'User not authenticated', status: 401 };
    }

    const filters: FilterCondition[] = [
      { column: userColumn, operator: 'eq', value: userEmail },
      ...additionalFilters
    ];

    return this.findMany<T>(table, filters, options);
  }

  // Utility method to convert service response to NextResponse
  static toNextResponse<T>(response: ServiceResponse<T>): NextResponse {
    if (response.error) {
      return NextResponse.json(
        { error: response.error }, 
        { status: response.status }
      );
    }
    return NextResponse.json(response.data, { status: response.status });
  }
}

// Convenience functions for common authentication patterns
export async function withAuthentication<T>(
  handler: (service: SupabaseService) => Promise<ServiceResponse<T>>
): Promise<NextResponse> {
  const service = await SupabaseService.createAuthenticated();
  
  if (!service) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await handler(service);
  return SupabaseService.toNextResponse(response);
}

export function withoutAuthentication<T>(
  handler: (service: SupabaseService) => Promise<ServiceResponse<T>>
): Promise<NextResponse> {
  const service = SupabaseService.createUnauthenticated();
  return handler(service).then(SupabaseService.toNextResponse);
}