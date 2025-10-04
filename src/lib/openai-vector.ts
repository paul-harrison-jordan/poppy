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

// Simple file-based cache to persist vector store IDs across server restarts
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.vector-store-cache.json');

function loadVectorStoreCache(): Map<string, UserVectorStore> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cached = JSON.parse(data);
      return new Map(Object.entries(cached));
    }
  } catch (error) {
    console.warn('Failed to load vector store cache:', error);
  }
  return new Map();
}

function saveVectorStoreCache(cache: Map<string, UserVectorStore>) {
  try {
    const data = Object.fromEntries(cache);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Failed to save vector store cache:', error);
  }
}

// Load cache on startup
const persistentCache = loadVectorStoreCache();
persistentCache.forEach((value, key) => userStores.set(key, value));

export async function findExistingVectorStore(username: string): Promise<UserVectorStore | null> {
  try {
    if (!apiKey || apiKey === 'dummy-key') {
      return null;
    }

    const expectedStoreName = `${username}-documents`;
    const expectedAssistantName = `${username} Document Assistant`;

    // Search for existing vector store with matching name
    const vectorStores = await openai.vectorStores.list({
      limit: 100, // Increase limit to find user's store
      order: 'desc' // Get most recent first
    });

    const existingStore = vectorStores.data.find(store => 
      store.name === expectedStoreName && store.status === 'completed'
    );
    
    if (existingStore) {
      console.log(`Found existing vector store ${existingStore.id} for user ${username}`);
      
      // Search for existing assistant with matching name and vector store
      const assistants = await openai.beta.assistants.list({
        limit: 100,
        order: 'desc' // Get most recent first
      });

      const existingAssistant = assistants.data.find(assistant => 
        assistant.name === expectedAssistantName &&
        assistant.tool_resources?.file_search?.vector_store_ids?.includes(existingStore.id)
      );

      if (existingAssistant) {
        const userStore = {
          vectorStoreId: existingStore.id,
          assistantId: existingAssistant.id
        };
        userStores.set(username, userStore);
        saveVectorStoreCache(userStores);
        console.log(`Found existing assistant ${existingAssistant.id} for user ${username}`);
        return userStore;
      } else {
        // Vector store exists but no assistant, create assistant
        const assistant = await openai.beta.assistants.create({
          name: expectedAssistantName,
          instructions: 'You are a helpful assistant that searches through the user\'s uploaded documents to provide relevant context.',
          model: 'gpt-4o',
          tools: [{ type: 'file_search' }],
          tool_resources: {
            file_search: {
              vector_store_ids: [existingStore.id]
            }
          }
        });

        const userStore = {
          vectorStoreId: existingStore.id,
          assistantId: assistant.id
        };
        userStores.set(username, userStore);
        saveVectorStoreCache(userStores);
        console.log(`Created new assistant ${assistant.id} for existing vector store ${existingStore.id}`);
        return userStore;
      }
    }

    return null; // No existing vector store found
  } catch (error) {
    console.error('Error searching for existing vector store:', error);
    return null;
  }
}

async function createNewUserVectorStore(username: string): Promise<UserVectorStore> {
  try {
    // Check if API key is available
    if (!apiKey || apiKey === 'dummy-key') {
      console.warn('OpenAI API key not available - returning placeholder vector store');
      const placeholderStore = {
        vectorStoreId: `placeholder-store-${username}`,
        assistantId: `placeholder-assistant-${username}`
      };
      userStores.set(username, placeholderStore);
      return placeholderStore;
    }

    // Create a new vector store for this user (without expiration)
    const vectorStore = await openai.vectorStores.create({
      name: `${username}-documents`
      // Removed expires_after to prevent vector store expiration
    });

    // Create an assistant with file search capability
    const assistant = await openai.beta.assistants.create({
      name: `${username} Document Assistant`,
      instructions: 'You are a helpful assistant that searches through the user\'s uploaded documents to provide relevant context.',
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id]
        }
      }
    });

    const userStore = {
      vectorStoreId: vectorStore.id,
      assistantId: assistant.id
    };

    userStores.set(username, userStore);
    saveVectorStoreCache(userStores);
    console.log(`Created NEW vector store ${vectorStore.id} and assistant ${assistant.id} for user ${username}`);
    return userStore;
  } catch (error) {
    console.error('Failed to create vector store:', error);
    // Fall back to placeholder on error
    const placeholderStore = {
      vectorStoreId: `placeholder-store-${username}`,
      assistantId: `placeholder-assistant-${username}`
    };
    userStores.set(username, placeholderStore);
    return placeholderStore;
  }
}

export async function createUserVectorStore(username: string): Promise<UserVectorStore> {
  // First, try to find an existing vector store
  const existingStore = await findExistingVectorStore(username);
  if (existingStore) {
    return existingStore;
  }
  
  // If no existing store found, create a new one
  return await createNewUserVectorStore(username);
}

export async function getUserVectorStore(username: string): Promise<UserVectorStore> {
  console.log('Getting vector store for username:', username);
  
  // First check in-memory cache
  const existing = userStores.get(username);
  if (existing) {
    console.log('Found cached vector store:', existing.vectorStoreId);
    return existing;
  }
  
  // If not in cache, search for existing vector store in OpenAI
  console.log('Searching for existing vector store for username:', username);
  const foundStore = await findExistingVectorStore(username);
  if (foundStore) {
    console.log('Found existing vector store in OpenAI:', foundStore.vectorStoreId);
    return foundStore;
  }
  
  // If no existing store found, create a new one
  console.log('Creating new vector store for username:', username);
  const newStore = await createNewUserVectorStore(username);
  console.log('Created vector store:', newStore.vectorStoreId);
  return newStore;
}

export async function uploadDocumentToVectorStore(
  vectorStoreId: string,
  content: string,
  fileName: string,
  useChunking: boolean = true
): Promise<string> {
  try {
    // Check if API key is available
    if (!apiKey || apiKey === 'dummy-key') {
      console.warn('OpenAI API key not available - returning placeholder file ID');
      return `placeholder-file-${Date.now()}`;
    }

    // Check if vector store ID is valid
    if (!vectorStoreId.startsWith('vs_')) {
      console.warn(`Invalid vector store ID: ${vectorStoreId} - returning placeholder file ID`);
      return `placeholder-file-${Date.now()}`;
    }

    // Import chunking function dynamically to avoid circular dependency
    if (useChunking && content.length > 4000) {
      const { uploadChunkedDocument } = await import('./openai-search-simple');
      const fileIds = await uploadChunkedDocument(vectorStoreId, content, fileName);
      // Return first file ID as primary reference
      return fileIds[0] || `placeholder-file-${Date.now()}`;
    }

    // For smaller documents, upload as single file
    const file = new File([content], fileName, { type: 'text/plain' });
    
    // Upload file to OpenAI
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants'
    });

    // Add file to the vector store
    await openai.vectorStores.files.create(vectorStoreId, {
      file_id: uploadedFile.id
    });

    console.log(`Successfully uploaded file "${fileName}" to vector store ${vectorStoreId}`);
    return uploadedFile.id;

  } catch (error) {
    console.error('Failed to upload document to vector store:', error);
    // Return placeholder on error to prevent breaking the upload flow
    return `placeholder-file-${Date.now()}`;
  }
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
  try {
    // Check if API key is available
    if (!apiKey || apiKey === 'dummy-key') {
      console.warn('OpenAI API key not available - returning placeholder feedback vector store');
      return 'disabled-vector-store';
    }

    // Create a vector store for customer feedback (without expiration)
    const vectorStore = await openai.vectorStores.create({
      name: 'customer-feedback-store'
      // Removed expires_after to prevent vector store expiration
    });

    console.log(`Created feedback vector store: ${vectorStore.id}`);
    return vectorStore.id;
  } catch (error) {
    console.error('Failed to create feedback vector store:', error);
    return 'disabled-vector-store';
  }
}

export { openai };