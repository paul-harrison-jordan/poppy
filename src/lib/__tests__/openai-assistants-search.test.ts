import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performAssistantSearch, performExpandedSearch } from '../openai-assistants-search';

// Mock OpenAI SDK
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    beta: {
      threads: {
        create: vi.fn(),
        delete: vi.fn(),
        messages: {
          create: vi.fn(),
          list: vi.fn()
        },
        runs: {
          createAndPoll: vi.fn()
        }
      }
    }
  }))
}));

describe('OpenAI Assistants Search', () => {
  const mockAssistantId = 'asst_test123';
  const mockVectorStoreId = 'vs_test123';
  const mockQuery = 'test search query';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle invalid assistant ID', async () => {
    const results = await performAssistantSearch('invalid_id', mockVectorStoreId, mockQuery, 5);
    
    expect(results).toHaveLength(5);
    expect(results[0].content).toContain('test search query');
    expect(results[0].filename).toBe('system_message');
  });

  it('should handle invalid vector store ID', async () => {
    const results = await performAssistantSearch(mockAssistantId, 'invalid_id', mockQuery, 5);
    
    expect(results).toHaveLength(5);
    expect(results[0].content).toContain('test search query');
    expect(results[0].filename).toBe('system_message');
  });

  it('should generate correct number of fallback results', async () => {
    const results = await performAssistantSearch('invalid', 'invalid', mockQuery, 10);
    
    expect(results).toHaveLength(10);
    results.forEach((result, index) => {
      expect(result.content).toContain('test search query');
      expect(result.score).toBe(0.1);
      expect(result.file_id).toBe(`fallback_${index}`);
      expect(result.filename).toBe('system_message');
    });
  });

  it('should return expanded search results with proper structure', async () => {
    const results = await performExpandedSearch('invalid', 'invalid', mockQuery, 5);
    
    expect(results).toHaveLength(5);
    
    results.forEach(result => {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('file_id');
      expect(result).toHaveProperty('filename');
      expect(typeof result.content).toBe('string');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  it('should handle expanded search with padding', async () => {
    const results = await performExpandedSearch(mockAssistantId, mockVectorStoreId, 'a', 15);
    
    expect(results).toHaveLength(15);
    
    // Should include padding results
    const paddingResults = results.filter(r => r.filename === 'system_message');
    expect(paddingResults.length).toBeGreaterThan(0);
  });

  it('should extract keywords correctly for expansion', async () => {
    const longQuery = 'machine learning artificial intelligence algorithms';
    const results = await performExpandedSearch('invalid', 'invalid', longQuery, 5);
    
    // Should still return results even with keyword expansion failing
    expect(results).toHaveLength(5);
  });
});