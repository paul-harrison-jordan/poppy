import type OpenAI from "openai";
import { openai } from "@/lib/openai"; 

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

