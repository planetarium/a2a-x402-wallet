import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

/** Serialize Agent Card data into a single text for embedding */
export function buildEmbeddingText(agent: {
  name: string;
  description: string;
  tags: string[];
  skills: Array<{ id?: string; name?: string; description?: string }>;
}): string {
  const skillText = agent.skills
    .map((s) => [s.name, s.description].filter(Boolean).join(": "))
    .join(". ");

  return [agent.name, agent.description, agent.tags.join(" "), skillText]
    .filter(Boolean)
    .join(". ");
}

/** Single text → 1536-dim vector */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });
  return embedding;
}
