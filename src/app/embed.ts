import OpenAI from 'openai';
import { enhanceChunks } from './chunk';
import { nanoid } from 'nanoid';
import { Vector } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_data';
/**
 * Embed a piece of text using an embedding model or service.
* This is a placeholder and needs to be implemented based on your embedding solution.
*
* @param chunks Array of text chunks to embed.
* @returns The embedded representation of the text.
*/
export async function embedChunks(chunks: string[]): Promise<any> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: 'org-4sVYvNZQTa4dYOT8bAgyz8gu',
    });
    const formattedChunks: string[] = [];
    for (const chunk of chunks) {
        formattedChunks.push(chunk);
    }
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunks,
        });
        return response.data;
    } catch (error) {
        console.error("Error embedding text with OpenAI:", error);
        throw error;
    }
}
export async function formatEmbeddings(embeddings: []): Promise<any> {
    const formattedEmbeddings = embeddings.map((embedding: any) => ({
        id: nanoid(),
        values: embedding.embedding,
    }));
    return formattedEmbeddings;
}

export async function buildPineconeRecords(rawChunks: string[]) {
    const enhanced = await enhanceChunks(rawChunks);
    const vectors  = await embedChunks(enhanced);       // same length
    return enhanced.map((chunk, i) => ({
      id: nanoid(),
      values: vectors[i].embedding,       // 3 072-dim float[]
      metadata: { text: chunk },     // GPT-4o output wrapped in an object
    }));
  }