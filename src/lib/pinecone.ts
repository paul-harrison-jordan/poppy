import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function createUserIndex(username: string) {
  try {
    const indexName = `prd-${username.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check if index exists
    const indexList = await pc.listIndexes();
    const indexExists = indexList.indexes?.some((index) => index.name === indexName) || false;
    
    if (!indexExists) {
      await pc.createIndex({
        name: indexName,
        dimension: 1536, // dimension for text-embedding-3-small
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
    }
  } catch (error) {
    console.error('Error creating Pinecone index:', error);
    throw error;
  }
}

export function getUserIndex(username: string) {
  const indexName = `prd-${username.toLowerCase().replace(/\s+/g, '-')}`;
  return pc.index(indexName);
} 