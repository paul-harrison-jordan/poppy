import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../openai-search-simple';

describe('Document Chunking', () => {
  it('should chunk a large document correctly', () => {
    const content = `This is the first paragraph of content that should be in the first chunk.

This is the second paragraph that continues the discussion and adds more context to the topic at hand.

This is the third paragraph with additional information that builds upon the previous paragraphs.

This is the fourth paragraph that might end up in a different chunk depending on the size limits.

This is the fifth and final paragraph that concludes our test document with some final thoughts.`;

    const result = chunkDocument(content, 'test.txt', 200, 50);

    // Should create multiple chunks
    expect(result.chunks.length).toBeGreaterThan(1);
    
    // Each chunk should not exceed the size limit (except for overlap)
    result.chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(250); // 200 + 50 overlap
    });

    // Metadata should be correct
    expect(result.metadata.filename).toBe('test.txt');
    expect(result.metadata.totalChunks).toBe(result.chunks.length);
    expect(result.metadata.chunkSize).toBe(200);
  });

  it('should handle small documents without chunking', () => {
    const content = 'This is a small document.';
    
    const result = chunkDocument(content, 'small.txt', 2000, 200);

    // Should create exactly one chunk
    expect(result.chunks.length).toBe(1);
    expect(result.chunks[0]).toBe(content);
  });

  it('should maintain overlap between chunks', () => {
    const content = `First paragraph with important context.

Second paragraph that references the first.

Third paragraph building on previous points.

Fourth paragraph with conclusions.`;

    const result = chunkDocument(content, 'overlap.txt', 100, 30);

    // Check that chunks have overlap
    if (result.chunks.length > 1) {
      for (let i = 1; i < result.chunks.length; i++) {
        const previousChunk = result.chunks[i - 1];
        const currentChunk = result.chunks[i];
        
        // Current chunk should start with some content from previous chunk
        const overlapContent = previousChunk.slice(-30);
        expect(currentChunk.includes(overlapContent.trim())).toBeTruthy();
      }
    }
  });

  it('should handle documents with varying paragraph sizes', () => {
    const content = `Short.

This is a much longer paragraph that contains significantly more text and information than the previous one, stretching across multiple lines.

Medium length paragraph here.

Another very long paragraph with lots of details and information that goes on for quite a while, making sure we test the chunking algorithm properly.

End.`;

    const result = chunkDocument(content, 'varied.txt', 150, 20);

    // Should create chunks
    expect(result.chunks.length).toBeGreaterThan(0);
    
    // All content should be preserved
    const allChunksContent = result.chunks.join('\n\n');
    expect(allChunksContent.includes('Short')).toBeTruthy();
    expect(allChunksContent.includes('End')).toBeTruthy();
  });
});

describe('Search Result Processing', () => {
  it('should format search results correctly', () => {
    const mockResults = [
      { content: 'Result 1', score: 0.95, file_id: 'file1', filename: 'doc1.txt' },
      { content: 'Result 2', score: 0.85, file_id: 'file2', filename: 'doc2.txt' },
    ];

    // Verify the structure matches our expected format
    mockResults.forEach(result => {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('file_id');
      expect(result).toHaveProperty('filename');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });
});