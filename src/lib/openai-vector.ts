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
  try {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!openai.vectorStores) {
      throw new Error('OpenAI vectorStores API is not available. Please check your OpenAI SDK version.');
    }

    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
    const storeName = `prd-${normalizedUsername}`;
    
    console.log('Creating vector store with name:', storeName, 'for username:', username);
    
    // Check in-memory cache first
    const existingStore = userStores.get(username);
    if (existingStore) {
      try {
        await openai.vectorStores.retrieve(existingStore.vectorStoreId);
        console.log('Verified existing store from cache:', existingStore.vectorStoreId);
        return existingStore;
      } catch {
        console.log('Cached store no longer exists, will find/create new one');
        // Store doesn't exist anymore, continue to find/create
      }
    }

    // Search for existing vector store by name
    try {
      const vectorStoresList = await openai.vectorStores.list({ limit: 100 });
      const existingVectorStore = vectorStoresList.data.find(store => store.name === storeName);
      
      if (existingVectorStore) {
        // Find or create assistant for this vector store
        const assistantsList = await openai.beta.assistants.list({ limit: 100 });
        let assistant = assistantsList.data.find(a => 
          a.tool_resources?.file_search?.vector_store_ids?.includes(existingVectorStore.id)
        );
        
        if (!assistant) {
          assistant = await openai.beta.assistants.create({
            name: `${username} PRD Assistant`,
            instructions: 'You are a helpful product assistant that answers questions based on the PRD documents provided.',
            model: 'gpt-4o',
            tools: [{ type: 'file_search' }],
            tool_resources: {
              file_search: {
                vector_store_ids: [existingVectorStore.id]
              }
            }
          });
        }
        
        const userStore = {
          vectorStoreId: existingVectorStore.id,
          assistantId: assistant.id
        };
        
        userStores.set(username, userStore);
        return userStore;
      }
    } catch (error) {
      console.warn('Error searching for existing vector store:', error);
    }

    // Create new vector store if none found
    const vectorStore = await openai.vectorStores.create({
      name: storeName,
      expires_after: {
        anchor: 'last_active_at',
        days: 30
      }
    });

    const assistant = await openai.beta.assistants.create({
      name: `${username} PRD Assistant`,
      instructions: 'You are a helpful product assistant that answers questions based on the PRD documents provided.',
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
    return userStore;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
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
  vectorStoreId: string,
  content: string,
  fileName: string
): Promise<string> {
  try {
    // Use fileName to create a properly named file
    const blob = new Blob([content], { type: 'text/plain' });
    const file = await openai.files.create({
      file: new File([blob], fileName, { type: 'text/plain' }) as unknown as Blob,
      purpose: 'assistants'
    });

    const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
      vectorStoreId,
      { 
        file_id: file.id,
      }
    );

    return vectorStoreFile.id;
  } catch (error) {
    console.error('Error uploading document to vector store:', error);
    throw error;
  }
}

export async function searchVectorStore(
  assistantId: string,
  vectorStoreId: string,
  query: string,
  maxResults: number = 10
): Promise<Array<{ content: string; annotations: unknown[] }>> {
  try {
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: query
        }
      ]
    });

    const run = await openai.beta.threads.runs.createAndPoll(
      thread.id,
      {
        assistant_id: assistantId,
        max_completion_tokens: 1000,
        tools: [
          {
            type: 'file_search',
            file_search: {
              max_num_results: maxResults
            }
          }
        ]
      }
    );

    const messages = await openai.beta.threads.messages.list(thread.id, {
      run_id: run.id
    });

    const assistantMessage = messages.data.find(m => m.role === 'assistant');
    
    if (assistantMessage?.content[0]?.type === 'text') {
      const text = assistantMessage.content[0].text;
      return [{
        content: text.value,
        annotations: text.annotations
      }];
    }

    return [];
  } catch (error) {
    console.error('Error searching vector store:', error);
    throw error;
  }
}

export async function deleteDocumentFromVectorStore(
  vectorStoreId: string,
  fileId: string
): Promise<void> {
  try {
    await openai.vectorStores.files.delete(vectorStoreId, fileId);
  } catch (error) {
    console.error('Error deleting document from vector store:', error);
    throw error;
  }
}

export async function createFeedbackVectorStore(): Promise<string> {
  try {
    const vectorStore = await openai.vectorStores.create({
      name: 'feedback-store',
      expires_after: {
        anchor: 'last_active_at',
        days: 90
      }
    });
    return vectorStore.id;
  } catch (error) {
    console.error('Error creating feedback vector store:', error);
    throw error;
  }
}

export { openai };