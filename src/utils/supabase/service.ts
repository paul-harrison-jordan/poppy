import { createClient } from '@supabase/supabase-js'

// Service role client that bypasses RLS for server-side operations where we have NextAuth session validation
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use service role key to bypass RLS policies for authenticated server operations
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}