/* eslint-disable @typescript-eslint/no-unused-vars */
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key', // Provide a dummy key to prevent initialization errors
});

interface UserVectorStore {
  vectorStoreId: string;
  assistantId: string;
}

// In-memory cache for vector stores (will reset on server restart)
// TODO: Consider persisting these IDs in database for true persistence
const userStores = new Map<string, UserVectorStore>();

export async function createUserVectorStore(username: string): Promise<UserVectorStore> {
  // Vector store operations temporarily disabled - SDK version incompatible
  console.warn('Vector store creation disabled - returning placeholder');
  
  const placeholderStore = {
    vectorStoreId: `placeholder-store-${username}`,
    assistantId: `placeholder-assistant-${username}`
  };
  
  userStores.set(username, placeholderStore);
  return placeholderStore;
}

export async function getUserVectorStore(username: string): Promise<UserVectorStore> {
  console.log('Getting vector store for username:', username);
  const existing = userStores.get(username);
  if (existing) {
    console.log('Found existing vector store:', existing.vectorStoreId);
    return existing;
  }
  console.log('Creating new vector store for username:', username);
  const newStore = await createUserVectorStore(username);
  console.log('Created vector store:', newStore.vectorStoreId);
  return newStore;
}

export async function uploadDocumentToVectorStore(
  _vectorStoreId: string,
  _content: string,
  _fileName: string
): Promise<string> {
  // Vector store operations temporarily disabled - SDK version incompatible
  console.warn('Document upload to vector store disabled - returning placeholder');
  return `placeholder-file-${Date.now()}`;
}

export async function searchVectorStore(
  _assistantId: string,
  _vectorStoreId: string,
  _query: string,
  _maxResults: number = 10
): Promise<Array<{ content: string; annotations: unknown[] }>> {
  // Vector store operations temporarily disabled - SDK version incompatible
  console.warn('Vector store search disabled - returning empty results');
  return [];
}

export async function deleteDocumentFromVectorStore(
  _vectorStoreId: string,
  _fileId: string
): Promise<void> {
  // Vector store operations temporarily disabled - SDK version incompatible
  console.warn('Vector store delete operation skipped - feature disabled');
  return;
}

export async function createFeedbackVectorStore(): Promise<string> {
  // Vector store operations temporarily disabled - SDK version incompatible
  console.warn('Vector store creation skipped - feature disabled');
  return 'disabled-vector-store';
}

export { openai };