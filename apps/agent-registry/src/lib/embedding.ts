import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

/**
 * Serialize Agent Card data into a single text for embedding.
 *
 * Field ordering reflects semantic importance (earlier = higher weight):
 *   name > description > skills > extensions > input/output modes > provider
 */
export function buildEmbeddingText(agent: {
  name: string;
  description: string;
  skills: Array<{
    name?: string;
    description?: string;
    tags?: string[];
    examples?: string[];
  }>;
  extensions?: Array<{
    uri?: string;
    description?: string;
  }>;
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  provider?: { organization?: string };
}): string {
  const skillParts = agent.skills.map((s) =>
    [
      [s.name, s.description].filter(Boolean).join(": "),
      s.tags?.join(" "),
      s.examples?.join(". "),
    ]
      .filter(Boolean)
      .join(". "),
  );

  const extensionParts = agent.extensions
    ?.map((e) => [e.uri, e.description].filter(Boolean).join(" "))
    .filter(Boolean);

  const modes = [
    ...(agent.defaultInputModes ?? []),
    ...(agent.defaultOutputModes ?? []),
  ];

  return [
    agent.name,
    agent.description,
    skillParts.join(". "),
    extensionParts?.join(". "),
    modes.join(" "),
    agent.provider?.organization,
  ]
    .filter(Boolean)
    .join(". ");
}

/** Single text → 1536-dim vector */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });
  return embedding;
}
