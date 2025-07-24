// Utility functions for v0 API calls with timeout and retry logic

// Timeout wrapper for v0 API calls
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Retry wrapper for v0 API calls with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 2, 
  timeoutMs: number = 120000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`V0 API attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff: 1s, 2s, 4s, capped at 10s)
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

// Enhanced error response creator for consistent API responses
export function createV0ErrorResponse(error: unknown, context: 'create' | 'update' = 'create') {
  if (error instanceof Error) {
    if (error.message.includes('timed out')) {
      return {
        success: false,
        error: `Design ${context === 'create' ? 'creation' : 'update'} timed out. This can happen with complex designs. Please try again with a simpler prompt.`,
        timeout: true
      };
    }
    
    if (error.message.includes('API key')) {
      return {
        success: false,
        error: 'Invalid V0 API key. Please check your API key in Settings.',
        invalidApiKey: true
      };
    }
    
    if (error.message.includes('chat') || error.message.includes('not found')) {
      return {
        success: false,
        error: 'Design session not found. Please create a new design.',
        chatNotFound: true
      };
    }
  }
  
  return {
    success: false,
    error: `Failed to ${context} design. Please try again.`,
    details: error instanceof Error ? error.message : 'Unknown error'
  };
} 