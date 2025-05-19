import type OpenAI from "openai";
import { openai } from "@/lib/openai";
import { enhanceChunks } from "./chunk";
import { nanoid } from "nanoid"; 

/** Alias the SDK’s item type */
type OpenAIEmbedding = OpenAI.Embeddings.Embedding;

export const maxDuration = 60;   
/**
 * Call OpenAI and return the array of embedding objects.
 */
export async function embedChunks(
  chunks: string[]
): Promise<OpenAIEmbedding[]> {

  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    });
    // res.data is OpenAIEmbedding[]
    return res.data;
  } catch (err) {
    console.error("Error embedding text with OpenAI:", err);
    throw err;
  }
}

/** Helper for Pinecone’s expected shape */
export interface PineconeVector {
  id: string;
  values: number[];
  metadata: { text: string };
}
export async function buildPineconeRecords(
  rawChunks: string[],
  documentId: string
): Promise<PineconeVector[]> {
  const enhanced = await enhanceChunks(rawChunks);     // string[]
  const vectors  = await embedChunks(enhanced);        // OpenAIEmbedding[]

  return enhanced.map((chunk, i) => ({
    id: `${documentId}#${nanoid()}`,
    values: vectors[i].embedding,
    metadata: { text: chunk, documentId }
  }));
}